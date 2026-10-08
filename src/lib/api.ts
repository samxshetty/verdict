"use client";

/**
 * MOCK API — every UI call goes through here.
 * When the backend is ready, re-implement these functions with fetch() calls
 * and keep the same signatures. Anything marked [SERVER] must be enforced by
 * the real backend (fees, capacity, auth, admin checks).
 */
import { adminStore, dbStore, draftStore } from "./store";
import { supabase } from "@/lib/supabase";
import type { AssignmentResult } from "./assignment";
import type { Battle, Branch, Channel, DB, Member, Portfolio, RevealMode, Registration, Session } from "./types";

const wait = (ms = 450) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);
export async function signOut() {
  await supabase.auth.signOut();
}
export class ApiError extends Error {}

// ---------------- selectors (pure, usable in render) ----------------

/** Seats are held once payment is submitted (pending or verified). */
export function seatsTaken(db: DB, battleId: string) {
  return db.registrations.filter((r) => r.battleId === battleId && (r.payment.status === "pending" || r.payment.status === "verified")).length;
}
export function isSoldOut(db: DB, b: Battle) {
  return seatsTaken(db, b.id) >= b.capacity;
}
export function portfoliosOf(db: DB, battleId: string) {
  return db.portfolios.filter((p) => p.battleId === battleId);
}
export function portfolioName(db: DB, id?: string | null) {
  return db.portfolios.find((p) => p.id === id)?.name ?? "—";
}
export function regsFor(db: DB, email: string) {
  const e = email.toLowerCase();
  return db.registrations.filter((r) => r.ownerEmail.toLowerCase() === e || r.viewers.includes(e));
}
/** Can the participant see their role right now? */
export function canSeeRole(db: DB, r: Registration) {
  const b = db.battles.find((x) => x.id === r.battleId);
  return !!r.assignment && (r.revealed || !!b?.revealed);
}

/** [SERVER] Fee is derived from branch only; client never sends a price. */
export function quoteFee(battle: Battle, branches: Branch[]) {
  const lines = branches.map((br) => ({ branch: br, amount: br === "ISE" ? battle.feeISE : battle.feeOther }));
  return { lines, total: lines.reduce((s, l) => s + l.amount, 0) };
}

// ---------------- validation ----------------

export const USN_RE = /^[1-9A-Z]{2,4}\d{2}[A-Z]{2,3}\d{3}$/;
export const PHONE_RE = /^[6-9]\d{9}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const UTR_RE = /^[A-Za-z0-9]{10,22}$/;

export function validateMember(m: Partial<Member>): Partial<Record<keyof Member, string>> {
  const e: Partial<Record<keyof Member, string>> = {};
  if (!m.name || m.name.trim().length < 2) e.name = "Enter full name";
  if (!m.usn || !USN_RE.test(m.usn.trim().toUpperCase())) e.usn = "Invalid USN (e.g. NNM23IS045)";
  if (!m.email || !EMAIL_RE.test(m.email.trim())) e.email = "Invalid email";
  if (!m.phone || !PHONE_RE.test(m.phone.trim())) e.phone = "10-digit mobile number";
  if (!m.branch) e.branch = "Select branch";
  if (!m.year) e.year = "Select year";
  return e;
}

// ---------------- participant ----------------

export function generateTeamCode(db: DB) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = "VRD-" + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (db.registrations.some((r) => r.teamCode === code));
  return code;
}

export async function createRegistration(input: {
  battleId: string;
  preferences: string[];
  members: Member[];
  teamName?: string;
}): Promise<Registration> {
  await wait();
const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  throw new ApiError("Please sign in first.");
}
  const db = dbStore.get();
  const battle = db.battles.find((b) => b.id === input.battleId);
  if (!battle) throw new ApiError("Battle not found.");
  if (!battle.isOpen) throw new ApiError("Registrations for this battle are closed.");
  if (isSoldOut(db, battle)) throw new ApiError("This battle is SOLD OUT.");
  if (input.members.length < battle.teamMin || input.members.length > battle.teamMax)
    throw new ApiError(`Team size must be ${battle.teamMin}–${battle.teamMax}.`);
  if (battle.mode === "team" && !input.teamName?.trim()) throw new ApiError("Team name is required.");
  const pids = portfoliosOf(db, battle.id).map((p) => p.id);
  if (input.preferences.length !== 3 || new Set(input.preferences).size !== 3 || !input.preferences.every((p) => pids.includes(p)))
    throw new ApiError("Invalid role ranking.");
  for (const m of input.members) {
    const errs = validateMember(m);
    if (Object.keys(errs).length) throw new ApiError(`${m.name || "A member"}: ${Object.values(errs)[0]}`);
  }
  const usns = input.members.map((m) => m.usn.trim().toUpperCase());
  if (new Set(usns).size !== usns.length) throw new ApiError("Duplicate USN within the team.");
  const clash = db.registrations.find(
    (r) => r.battleId === battle.id && r.payment.status !== "rejected" && r.members.some((m) => usns.includes(m.usn.toUpperCase())),
  );
  if (clash) throw new ApiError(`USN already registered for ${battle.name} (${clash.id}).`);

  let created!: Registration;
  dbStore.update((d) => {
    d.seq[battle.code] = (d.seq[battle.code] ?? 0) + 1;
    created = {
      id: `VRD-${battle.code}-${String(d.seq[battle.code]).padStart(4, "0")}`,
      battleId: battle.id,
ownerEmail: user.email!,      teamName: battle.mode === "team" ? input.teamName!.trim() : undefined,
      teamCode: battle.mode === "team" ? generateTeamCode(d) : undefined,
      viewers: [],
      members: input.members.map((m) => ({ ...m, usn: m.usn.trim().toUpperCase(), name: m.name.trim(), email: m.email.trim() })),
      preferences: input.preferences as [string, string, string],
      fee: quoteFee(battle, input.members.map((m) => m.branch)).total,
      payment: { status: "not_submitted" },
      revealed: false,
      createdAt: now(),
    };
    d.registrations.push(created);
  });
  draftStore.update((dr) => {
    dr.registrationId = created.id;
  });
  return created;
}

export async function submitPayment(registrationId: string, utr: string, screenshot: string) {
  await wait(900);
  const db = dbStore.get();
  const reg = db.registrations.find((r) => r.id === registrationId);
  if (!reg) throw new ApiError("Registration not found.");
  if (reg.payment.status === "verified") throw new ApiError("Payment already verified.");
  if (!UTR_RE.test(utr.trim())) throw new ApiError("UTR should be 10–22 letters/digits.");
  if (db.registrations.some((r) => r.id !== reg.id && r.payment.utr === utr.trim()))
    throw new ApiError("This UTR has already been used.");
  const battle = db.battles.find((b) => b.id === reg.battleId)!;
  if (reg.payment.status === "not_submitted" && isSoldOut(db, battle)) throw new ApiError("Sorry — this battle just SOLD OUT.");
  dbStore.update((d) => {
    const r = d.registrations.find((x) => x.id === registrationId)!;
    r.payment = { status: "pending", utr: utr.trim(), screenshot, submittedAt: now() };
  });
}

export async function joinTeam(code: string) {
  await wait();
  const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  throw new ApiError("Please sign in first.");
}
  const db = dbStore.get();
  const reg = db.registrations.find((r) => r.teamCode?.toUpperCase() === code.trim().toUpperCase());
  if (!reg) throw new ApiError("No team found with that code.");
  if (reg.ownerEmail === user.email) return reg;
  dbStore.update((d) => {
    const r = d.registrations.find((x) => x.id === reg.id)!;
    if (!r.viewers.includes(user.email!))
  r.viewers.push(user.email!);
  });
  return reg;
}

// ---------------- admin ----------------

function audit(d: DB, action: string, target: string, detail: string) {
  d.audit.unshift({ id: uid(), at: now(), actor: "admin", action, target, detail });
}

function notify(d: DB, r: Registration, subject: string, body: string, channels: Channel[] = ["email", "whatsapp"]) {
  for (const m of r.members) {
    for (const ch of channels) {
      d.notifications.unshift({
        id: uid(),
        at: now(),
        channel: ch,
        to: ch === "email" ? m.email : `+91${m.phone}`,
        registrationId: r.id,
        subject,
        body: body.replace("{name}", m.name.split(" ")[0]),
        status: "queued",
      });
    }
  }
}

export async function adminLogin(passcode: string) {
  await wait(500);
  if (passcode !== dbStore.get().settings.adminPasscode) throw new ApiError("Wrong passcode.");
  adminStore.set(true);
}
export function adminLogout() {
  adminStore.set(false);
}

export async function verifyPayment(id: string, sendNotice = true) {
  await wait(300);
  dbStore.update((d) => {
    const r = d.registrations.find((x) => x.id === id)!;
    r.payment.status = "verified";
    r.payment.reviewedAt = now();
    r.payment.reviewedBy = "admin";
    r.payment.rejectReason = undefined;
    audit(d, "payment.verify", id, `UTR ${r.payment.utr} · ₹${r.fee}`);
    if (sendNotice)
      notify(d, r, "THE VERDICT — Payment verified", `Hi {name}, your payment for ${r.id} is verified. Your entry is secured. Role reveal coming soon.`);
  });
}

export async function rejectPayment(id: string, reason: string) {
  await wait(300);
  dbStore.update((d) => {
    const r = d.registrations.find((x) => x.id === id)!;
    r.payment.status = "rejected";
    r.payment.reviewedAt = now();
    r.payment.reviewedBy = "admin";
    r.payment.rejectReason = reason;
    audit(d, "payment.reject", id, reason);
    notify(d, r, "THE VERDICT — Payment issue", `Hi {name}, we couldn't verify payment for ${r.id}: ${reason}. Please re-submit from your dashboard.`);
  });
}

export async function saveBattle(b: Battle) {
  await wait(300);
  dbStore.update((d) => {
    const i = d.battles.findIndex((x) => x.id === b.id);
    if (i === -1) {
      d.battles.push(b);
      d.seq[b.code] ??= 0;
      audit(d, "battle.create", b.id, `${b.name} (${b.mode})`);
      return;
    }
    const before = d.battles[i];
    d.battles[i] = b;
    const changes = (Object.keys(b) as (keyof Battle)[])
      .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(b[k]))
      .map((k) => `${k}: ${before[k]} → ${b[k]}`);
    audit(d, "battle.update", b.id, changes.join("; ") || "no changes");
  });
}

export async function deleteBattle(id: string) {
  await wait(250);
  const db = dbStore.get();
  if (db.registrations.some((r) => r.battleId === id))
    throw new ApiError("Can't delete this event because registrations already exist. Close registration instead.");
  dbStore.update((d) => {
    const battle = d.battles.find((b) => b.id === id);
    d.battles = d.battles.filter((b) => b.id !== id);
    d.portfolios = d.portfolios.filter((p) => p.battleId !== id);
    if (battle) delete d.seq[battle.code];
    audit(d, "battle.delete", id, battle?.name || "");
  });
}

export async function savePortfolio(p: Portfolio) {
  await wait(200);
  dbStore.update((d) => {
    const i = d.portfolios.findIndex((x) => x.id === p.id);
    if (i === -1) {
      d.portfolios.push(p);
      audit(d, "portfolio.create", p.id, `${p.name} (${p.slots} slots)`);
    } else {
      d.portfolios[i] = p;
      audit(d, "portfolio.update", p.id, `${p.name} (${p.slots} slots)`);
    }
  });
}

export async function deletePortfolio(id: string) {
  await wait(200);
  const db = dbStore.get();
  if (db.registrations.some((r) => r.preferences.includes(id) || r.assignment?.portfolioId === id))
    throw new ApiError("Can't delete — participants have ranked or been assigned this role.");
  dbStore.update((d) => {
    d.portfolios = d.portfolios.filter((p) => p.id !== id);
    audit(d, "portfolio.delete", id, "");
  });
}

export async function commitAssignment(battleId: string, result: AssignmentResult) {
  await wait(500);
  dbStore.update((d) => {
    for (const p of result.proposals) {
      const r = d.registrations.find((x) => x.id === p.registrationId)!;
      if (p.portfolioId && p.method) {
        r.assignment = { portfolioId: p.portfolioId, method: p.method, drawn: p.drawn, assignedAt: now(), seed: result.seed };
      } else {
        r.assignment = undefined;
      }
    }
    const s = result.stats;
    audit(d, "assignment.run", battleId, `seed ${result.seed} · 1st ${s.first} · 2nd ${s.second} · 3rd ${s.third} · manual ${s.manual} · unassigned ${s.unassigned} · draws ${s.draws}`);
  });
}

export async function overrideAssignment(id: string, portfolioId: string | null, reason: string) {
  await wait(300);
  if (!reason.trim()) throw new ApiError("A reason is required for manual overrides.");
  dbStore.update((d) => {
    const r = d.registrations.find((x) => x.id === id)!;
    const from = d.portfolios.find((p) => p.id === r.assignment?.portfolioId)?.name ?? "none";
    const to = d.portfolios.find((p) => p.id === portfolioId)?.name ?? "none";
    r.assignment = portfolioId ? { portfolioId, method: "manual", drawn: false, assignedAt: now() } : undefined;
    audit(d, "assignment.override", id, `${from} → ${to} · ${reason}`);
  });
}

export async function setPersonReveal(id: string, revealed: boolean) {
  await wait(200);
  dbStore.update((d) => {
    const r = d.registrations.find((x) => x.id === id)!;
    r.revealed = revealed;
    audit(d, revealed ? "reveal.person" : "reveal.person.hide", id, "");
    if (revealed && r.assignment) notify(d, r, "THE VERDICT — Your role has been decided", `Hi {name}, your role for THE VERDICT is ready. Open your dashboard to reveal it.`);
  });
}

export async function setBattleReveal(battleId: string, revealed: boolean, mode: RevealMode) {
  await wait(400);
  dbStore.update((d) => {
    const b = d.battles.find((x) => x.id === battleId)!;
    b.revealed = revealed;
    b.revealMode = mode;
    audit(d, revealed ? "reveal.battle" : "reveal.battle.hide", battleId, `mode: ${mode}`);
    if (revealed)
      for (const r of d.registrations.filter((x) => x.battleId === battleId && x.assignment))
        notify(d, r, "THE VERDICT — Your role has been decided", `Hi {name}, roles for ${b.name} are out. Open your dashboard to reveal yours.`);
  });
}

export async function sendCustomNotification(ids: string[], channels: Channel[], subject: string, body: string) {
  await wait(400);
  dbStore.update((d) => {
    for (const id of ids) {
      const r = d.registrations.find((x) => x.id === id);
      if (r) notify(d, r, subject, body, channels);
    }
    audit(d, "notify.custom", `${ids.length} registrations`, `${channels.join("+")} · ${subject}`);
  });
}

export async function flushNotifications() {
  await wait(800);
  dbStore.update((d) => {
    d.notifications.forEach((n) => (n.status = "sent"));
  });
}

export async function saveSettings(s: DB["settings"]) {
  await wait(200);
  dbStore.update((d) => {
    d.settings = s;
    audit(d, "settings.update", "settings", `UPI ${s.upiId}`);
  });
}

export function resetDemo() {
  dbStore.reset();
  draftStore.reset();
}
