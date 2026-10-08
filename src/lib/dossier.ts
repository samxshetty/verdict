import { supabase } from "@/lib/supabase";
import type {
  Battle,
  DB,
  Payment,
  Portfolio,
  Registration,
} from "@/lib/types";

/** Read a field under any of the given names (snake_case or camelCase). */
const pick = (o: any, ...keys: string[]) => {
  for (const k of keys) if (o?.[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
};

export function mapBattle(b: any): Battle {
  return {
    id: b.id,
    code: b.code ?? "",
    name: b.name ?? "",
    subtitle: b.subtitle ?? "",
    description: b.description ?? "",
    mode: b.mode ?? "individual",
    teamMin: pick(b, "teamMin", "team_min") ?? 1,
    teamMax: pick(b, "teamMax", "team_max") ?? 1,
    capacity: b.capacity ?? 0,
    feeISE: pick(b, "feeISE", "fee_ise") ?? 0,
    feeOther: pick(b, "feeOther", "fee_other") ?? 0,
    isOpen: pick(b, "isOpen", "is_open") ?? false,
    accent: b.accent ?? "#c9a24a",
    accent2: pick(b, "accent2", "accent_2") ?? "#e6c97a",
    image: pick(b, "image", "image_url") ?? "",
    revealMode: pick(b, "revealMode", "reveal_mode") ?? "simple",
    revealed: b.revealed ?? false,
  };
}

export function mapPortfolio(p: any): Portfolio {
  return {
    id: p.id,
    battleId: pick(p, "battleId", "battle_id"),
    name: p.name ?? "",
    description: p.description ?? "",
    slots: p.slots ?? 0,
  };
}

function mapPayment(r: any): Payment {
  // Supports either a `payment` jsonb column or flat payment_* columns.
  if (r.payment && typeof r.payment === "object") return r.payment as Payment;
  return {
    status: pick(r, "payment_status", "paymentStatus") ?? "not_submitted",
    utr: pick(r, "payment_utr", "utr"),
    screenshot: pick(r, "payment_screenshot", "screenshot"),
    submittedAt: pick(r, "payment_submitted_at"),
    reviewedAt: pick(r, "payment_reviewed_at"),
    reviewedBy: pick(r, "payment_reviewed_by"),
    rejectReason: pick(r, "payment_reject_reason", "reject_reason"),
  };
}

export function mapRegistration(r: any): Registration {
  return {
    id: r.id,
    battleId: pick(r, "battleId", "battle_id"),
    ownerEmail: pick(r, "ownerEmail", "owner_email"),
    teamName: pick(r, "teamName", "team_name"),
    teamCode: pick(r, "teamCode", "team_code"),
    viewers: r.viewers ?? [],
    members: r.members ?? [],
    preferences: r.preferences ?? [],
    fee: r.fee ?? 0,
    payment: mapPayment(r),
    assignment: r.assignment ?? undefined,
    revealed: r.revealed ?? false,
    createdAt: pick(r, "createdAt", "created_at"),
  } as Registration;
}

/** Loads only what this user needs. RLS should enforce the same rules server-side. */
export async function loadDB(email: string): Promise<DB> {
  const [events, portfolios, registrations] = await Promise.all([
    supabase.from("events").select("*"),
    supabase.from("portfolios").select("*"),
    supabase
      .from("registrations")
      .select("*")
      .or(`owner_email.eq.${email},viewers.cs.{"${email}"}`),
  ]);

  const err = events.error || portfolios.error || registrations.error;
  if (err) throw new Error(err.message);

  return {
    version: 1,
    battles: (events.data ?? []).map(mapBattle),
    portfolios: (portfolios.data ?? []).map(mapPortfolio),
    registrations: (registrations.data ?? []).map(mapRegistration),
    audit: [],
    notifications: [],
    settings: { upiId: "", payeeName: "", adminPasscode: "" },
    seq: {},
  };
}

export function regsFor(db: DB, email: string): Registration[] {
  return db.registrations.filter(
    (r) => r.ownerEmail === email || (r.viewers ?? []).includes(email)
  );
}

export function portfolioName(db: DB, id: string): string {
  return db.portfolios.find((p) => p.id === id)?.name ?? id;
}

/** A role is visible once payment is verified, a role is assigned,
 *  and either this registration or its whole battle has been revealed. */
export function canSeeRole(db: DB, reg: Registration): boolean {
  if (reg.payment.status !== "verified" || !reg.assignment) return false;
  const battle = db.battles.find((b) => b.id === reg.battleId);
  return reg.revealed || !!battle?.revealed;
}

/** Join a team using its code. Adds the current user to `viewers`. */
export async function joinTeam(
  code: string
): Promise<{ id: string; teamName: string }> {
  const { data: auth } = await supabase.auth.getUser();
  const email = auth.user?.email;
  if (!email) throw new Error("Please sign in first.");

  const { data, error } = await supabase
    .from("registrations")
    .select("id, team_name, owner_email, viewers")
    .eq("team_code", code.trim().toUpperCase())
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("No team found with that code.");
  if (data.owner_email === email || (data.viewers ?? []).includes(email)) {
    throw new Error("You are already part of this team.");
  }

  const { error: upErr } = await supabase
    .from("registrations")
    .update({ viewers: [...(data.viewers ?? []), email] })
    .eq("id", data.id);
  if (upErr) throw new Error(upErr.message);

  return { id: data.id, teamName: data.team_name };
}