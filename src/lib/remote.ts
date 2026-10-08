import { supabase } from "@/lib/supabase";
import { mapBattle, mapPortfolio, mapRegistration } from "./dossier";
import type { AuditEntry, DB, NotificationLog } from "./types";

const mapAudit = (a: any): AuditEntry => ({
  id: a.id,
  at: a.created_at,
  actor: a.actor ?? "",
  action: a.action ?? "",
  target: a.target ?? "",
  detail: a.detail ?? "",
});

const mapNotification = (n: any): NotificationLog => ({
  id: n.id,
  at: n.created_at,
  channel: n.channel,
  to: n.recipient,
  registrationId: n.registration_id ?? "",
  subject: n.subject ?? "",
  body: n.body ?? "",
  status: n.status,
});

export const emptyDB = (): DB => ({
  version: 1,
  battles: [],
  portfolios: [],
  registrations: [],
  audit: [],
  notifications: [],
  settings: { upiId: "", payeeName: "" },
  seq: {},
});

/**
 * One loader for the whole app.
 *  - everyone: battles, roles, payee settings, public seat counts
 *  - signed-in user: their own registrations (owner or teammate)
 *  - admin (profiles.role = 'admin'): every registration + audit log + notifications
 * RLS is the real gate; the client-side filter is only defence in depth.
 */
export async function loadAppDB(): Promise<DB> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase() ?? null;

  let admin = false;
  if (user) {
    const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    admin = data?.role === "admin";
  }

  const regs = admin
    ? supabase.from("registrations").select("*").order("created_at", { ascending: false })
    : email
      ? supabase.from("registrations").select("*").or(`owner_email.eq.${email},viewers.cs.{"${email}"}`)
      : null;

  const [events, portfolios, settings, seats, registrations, audit, notifications] = await Promise.all([
    supabase.from("events").select("*").order("created_at"),
    supabase.from("portfolios").select("*"),
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("battle_seats").select("*"),
    regs ?? Promise.resolve({ data: [], error: null }),
    admin ? supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(300) : Promise.resolve({ data: [], error: null }),
    admin ? supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(300) : Promise.resolve({ data: [], error: null }),
  ]);

  const fatal = events.error || portfolios.error || registrations.error;
  if (fatal) throw new Error(fatal.message);
  for (const [name, r] of [["settings", settings], ["battle_seats", seats], ["audit_log", audit], ["notifications", notifications]] as const) {
    if (r.error) console.warn(`[db] could not load ${name}:`, r.error.message);
  }

  return {
    version: 1,
    battles: (events.data ?? []).map(mapBattle),
    portfolios: (portfolios.data ?? []).map(mapPortfolio),
    registrations: (registrations.data ?? []).map(mapRegistration),
    audit: (audit.data ?? []).map(mapAudit),
    notifications: (notifications.data ?? []).map(mapNotification),
    settings: {
      upiId: settings.data?.upi_id ?? "",
      payeeName: settings.data?.payee_name ?? "",
    },
    seq: {},
    seats: seats.error
      ? undefined
      : Object.fromEntries((seats.data ?? []).map((s: any) => [s.battle_id, s.taken as number])),
  };
}
