import type { AssignMethod, Portfolio, Registration } from "./types";

/**
 * Assignment engine (pure — safe to move to the server unchanged).
 *
 * 1. Manual overrides are kept and consume their slots.
 * 2. Round 1: everyone's 1st choice. If a role has more applicants than free
 *    slots, a seeded random draw decides who gets it.
 * 3. Rounds 2 & 3: anyone still unassigned falls back to their 2nd, then 3rd
 *    choice on the slots that remain (same draw rule).
 * 4. Anyone left over is reported as unassigned for manual handling.
 */

export interface ProposedAssignment {
  registrationId: string;
  portfolioId: string | null;
  method: AssignMethod | null;
  drawn: boolean;
}

export interface AssignmentResult {
  seed: number;
  proposals: ProposedAssignment[];
  log: string[];
  stats: { total: number; first: number; second: number; third: number; manual: number; unassigned: number; draws: number };
  remaining: Record<string, number>;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const METHODS: AssignMethod[] = ["first", "second", "third"];

export function runAssignment(
  registrations: Registration[],
  portfolios: Portfolio[],
  seed: number,
  opts: { keepManual?: boolean } = { keepManual: true },
): AssignmentResult {
  const rand = mulberry32(seed);
  const log: string[] = [];
  const name = (id: string) => portfolios.find((p) => p.id === id)?.name ?? id;
  const remaining: Record<string, number> = Object.fromEntries(portfolios.map((p) => [p.id, p.slots]));
  const proposals = new Map<string, ProposedAssignment>();
  let draws = 0;

  const eligible = registrations.filter((r) => r.payment.status === "verified");
  log.push(`Seed ${seed}. ${eligible.length} verified registrations, ${portfolios.reduce((s, p) => s + p.slots, 0)} total slots.`);

  // 1. keep manual overrides
  let pool = eligible;
  if (opts.keepManual) {
    for (const r of eligible) {
      if (r.assignment?.method === "manual" && remaining[r.assignment.portfolioId] !== undefined) {
        remaining[r.assignment.portfolioId]--;
        proposals.set(r.id, { registrationId: r.id, portfolioId: r.assignment.portfolioId, method: "manual", drawn: false });
      }
    }
    pool = eligible.filter((r) => !proposals.has(r.id));
    if (proposals.size) log.push(`Kept ${proposals.size} manual override(s).`);
  }

  // 2–3. preference rounds
  let unassigned = pool;
  for (let round = 0; round < 3; round++) {
    const byRole = new Map<string, Registration[]>();
    for (const r of unassigned) {
      const pid = r.preferences[round];
      if (!pid || remaining[pid] === undefined) continue;
      if (!byRole.has(pid)) byRole.set(pid, []);
      byRole.get(pid)!.push(r);
    }
    log.push(`— Round ${round + 1} (${METHODS[round]} choice): ${unassigned.length} contender(s)`);
    for (const [pid, applicants] of byRole) {
      const free = remaining[pid];
      if (free <= 0) {
        log.push(`  ${name(pid)}: full, ${applicants.length} fall through`);
        continue;
      }
      const oversubscribed = applicants.length > free;
      const winners = oversubscribed ? shuffle(applicants, rand).slice(0, free) : applicants;
      if (oversubscribed) draws++;
      for (const w of winners) {
        proposals.set(w.id, { registrationId: w.id, portfolioId: pid, method: METHODS[round], drawn: oversubscribed });
      }
      remaining[pid] -= winners.length;
      log.push(
        oversubscribed
          ? `  ${name(pid)}: ${applicants.length} for ${free} slot(s) → random draw, ${winners.map((w) => w.id).join(", ")} win`
          : `  ${name(pid)}: ${applicants.length} assigned (${remaining[pid]} left)`,
      );
    }
    unassigned = unassigned.filter((r) => !proposals.has(r.id));
  }

  for (const r of unassigned) {
    proposals.set(r.id, { registrationId: r.id, portfolioId: null, method: null, drawn: false });
  }
  if (unassigned.length) log.push(`${unassigned.length} left unassigned — resolve manually.`);

  const list = eligible.map((r) => proposals.get(r.id)!);
  const count = (m: AssignMethod) => list.filter((x) => x.method === m).length;
  return {
    seed,
    proposals: list,
    log,
    remaining,
    stats: {
      total: list.length,
      first: count("first"),
      second: count("second"),
      third: count("third"),
      manual: count("manual"),
      unassigned: unassigned.length,
      draws,
    },
  };
}
