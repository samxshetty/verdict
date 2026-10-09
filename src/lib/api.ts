"use client";

/**
 * Data API — every UI call goes through here, backed by Supabase.
 * Anything marked [SERVER] is enforced in supabase/schema.sql (RPC functions + RLS);
 * the client checks below are only for fast, friendly feedback.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { currentDB, draftStore, refreshDB } from "./store";
import { mapRegistration } from "./dossier";
import type { AssignmentResult } from "./assignment";
import type { Battle, Branch, Channel, DB, Member, Portfolio, RevealMode, Registration } from "./types";

const now = () => new Date().toISOString();

export class ApiError extends Error {}

export async function signOut() {
  await supabase.auth.signOut();
  draftStore.reset();
}

/** Throw an ApiError for any Supabase error, otherwise return the data. */
function ok<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new ApiError(res.error.message);
  return res.data;
}

async function requireUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) throw new ApiError("Please sign in first.");
  return user;
}

// ---------------- selectors (pure, usable in render) ----------------

/** Seats are held once payment is submitted (pending or verified). */
export function seatsTaken(db: DB, battleId: string) {
  if (db.seats) return db.seats[battleId] ?? 0; // public count from the battle_seats view
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
/** Can the participant see their role right now? Payment must be verified. */
export function canSeeRole(db: DB, r: Registration) {
  const b = db.battles.find((x) => x.id === r.battleId);
  return r.payment.status === "verified" && !!r.assignment && (r.revealed || !!b?.revealed);
}

/** [SERVER] Fee is derived from branch only; the server recomputes it. This is just the quote shown in the UI. */
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

export async function createRegistration(input: {
  battleId: string;
  preferences: string[];
  members: Member[];
  teamName?: string;
}): Promise<Registration> {
  await requireUser();
  const db = await currentDB();

  // Fast client-side feedback; create_registration() re-validates everything on the server.
  const battle = db.battles.find((b) => b.id === input.battleId);
  if (!battle) throw new ApiError("Battle not found.");
  if (!battle.isOpen) throw new ApiError("Registrations for this battle are closed.");
  if (input.members.length < battle.teamMin || input.members.length > battle.teamMax)
    throw new ApiError(`Team size must be ${battle.teamMin}–${battle.teamMax}.`);
  if (battle.mode === "team" && !input.teamName?.trim()) throw new ApiError("Team name is required.");
  for (const m of input.members) {
    const errs = validateMember(m);
    if (Object.keys(errs).length) throw new ApiError(`${m.name || "A member"}: ${Object.values(errs)[0]}`);
  }

  const data = ok(
    await supabase.rpc("create_registration", {
      p_battle_id: input.battleId,
      p_preferences: input.preferences,
      p_members: input.members.map((m) => ({ ...m, usn: m.usn.trim().toUpperCase(), name: m.name.trim(), email: m.email.trim() })),
      p_team_name: battle.mode === "team" ? input.teamName!.trim() : null,
    }),
  );
  const created = mapRegistration(data);
  draftStore.update((dr) => {
    dr.registrationId = created.id;
  });
  await refreshDB();
  return created;
}

/** `screenshot` is the compressed data-URL from the pay page; it's uploaded to private storage and only the path is saved. */
export async function submitPayment(registrationId: string, utr: string, screenshot: string) {
  const user = await requireUser();
  if (!UTR_RE.test(utr.trim())) throw new ApiError("UTR should be 10–22 letters/digits.");

  const blob = await (await fetch(screenshot)).blob();
  const path = `${user.id}/${registrationId}-${Date.now()}.jpg`;
  const up = await supabase.storage.from("payment-screenshots").upload(path, blob, { contentType: blob.type || "image/jpeg" });
  if (up.error) throw new ApiError(`Screenshot upload failed: ${up.error.message}`);

  const { error } = await supabase.rpc("submit_payment", { p_id: registrationId, p_utr: utr.trim(), p_screenshot: path });
  if (error) {
    await supabase.storage.from("payment-screenshots").remove([path]);
    throw new ApiError(error.message);
  }
  await refreshDB();
}

/** Free entry (server-computed fee = 0): skip payment and confirm directly. [SERVER] confirm_free_registration re-checks fee = 0 and ownership. */
export async function confirmFreeRegistration(registrationId: string) {
  await requireUser();
  ok(await supabase.rpc("confirm_free_registration", { p_id: registrationId }));
  await refreshDB();
}

export async function joinTeam(code: string) {
  await requireUser();
  const res = ok(await supabase.rpc("join_team", { p_code: code.trim() })) as { id: string; teamName: string };
  await refreshDB();
  return res;
}

/** Resolve a stored screenshot path to a short-lived signed URL (admin / owner only, enforced by storage RLS). */
export function useScreenshotUrl(path?: string) {
  const [url, setUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    let on = true;
    setUrl(undefined);
    if (!path) return;
    if (/^(data:|https?:)/.test(path)) {
      setUrl(path); // legacy values
      return;
    }
    supabase.storage
      .from("payment-screenshots")
      .createSignedUrl(path, 3600)
      .then(({ data }) => on && setUrl(data?.signedUrl));
    return () => {
      on = false;
    };
  }, [path]);
  return url;
}

// ---------------- admin (authorised by RLS: profiles.role = 'admin') ----------------

async function actor() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? "admin";
}

async function audit(action: string, target: string, detail: string) {
  const { error } = await supabase.from("audit_log").insert({ actor: await actor(), action, target, detail });
  if (error) console.warn("[audit] failed:", error.message);
}

async function notify(r: Registration, subject: string, body: string, channels: Channel[] = ["email", "whatsapp"]) {
  const rows = r.members.flatMap((m) =>
    channels.map((ch) => ({
      channel: ch,
      recipient: ch === "email" ? m.email : `+91${m.phone}`,
      registration_id: r.id,
      subject,
      body: body.replace("{name}", m.name.split(" ")[0]),
      status: "queued",
    })),
  );
  if (!rows.length) return;
  const { error } = await supabase.from("notifications").insert(rows);
  if (error) console.warn("[notify] failed:", error.message);
}

async function fetchReg(id: string): Promise<Registration> {
  const data = ok(await supabase.from("registrations").select("*").eq("id", id).single());
  return mapRegistration(data);
}

async function updateReg(id: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase.from("registrations").update(patch).eq("id", id).select("id");
  if (error) throw new ApiError(error.message);
  if (!data?.length) throw new ApiError("Update was blocked — are you signed in as an admin?");
}

export async function verifyPayment(id: string, sendNotice = true) {
  const r = await fetchReg(id);
  const { rejectReason: _drop, ...rest } = r.payment;
  await updateReg(id, { payment: { ...rest, status: "verified", reviewedAt: now(), reviewedBy: await actor() } });
  await audit("payment.verify", id, `UTR ${r.payment.utr} · ₹${r.fee}`);
  if (sendNotice) await notify(r, "THE VERDICT — Payment verified", `Hi {name}, your payment for ${r.id} is verified. Your entry is secured. Role reveal coming soon.`);
  await refreshDB();
}

export async function rejectPayment(id: string, reason: string) {
  const r = await fetchReg(id);
  await updateReg(id, { payment: { ...r.payment, status: "rejected", reviewedAt: now(), reviewedBy: await actor(), rejectReason: reason } });
  await audit("payment.reject", id, reason);
  await notify(r, "THE VERDICT — Payment issue", `Hi {name}, we couldn't verify payment for ${r.id}: ${reason}. Please re-submit from your dashboard.`);
  await refreshDB();
}

const battleRow = (b: Battle) => ({
  id: b.id,
  code: b.code,
  name: b.name,
  subtitle: b.subtitle,
  description: b.description,
  mode: b.mode,
  team_min: b.teamMin,
  team_max: b.teamMax,
  capacity: b.capacity,
  fee_ise: b.feeISE,
  fee_other: b.feeOther,
  is_open: b.isOpen,
  accent: b.accent,
  accent_2: b.accent2,
  image_url: b.image,
  reveal_mode: b.revealMode,
  revealed: b.revealed,
});

export async function saveBattle(b: Battle) {
  const db = await currentDB();
  const before = db.battles.find((x) => x.id === b.id);
  ok(await supabase.from("events").upsert(battleRow(b)).select("id"));
  if (!before) {
    await audit("battle.create", b.id, `${b.name} (${b.mode})`);
  } else {
    const changes = (Object.keys(b) as (keyof Battle)[])
      .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(b[k]))
      .map((k) => `${k}: ${before[k]} → ${b[k]}`);
    await audit("battle.update", b.id, changes.join("; ") || "no changes");
  }
  await refreshDB();
}

export async function deleteBattle(id: string) {
  const { count, error } = await supabase.from("registrations").select("id", { count: "exact", head: true }).eq("battle_id", id);
  if (error) throw new ApiError(error.message);
  if (count) throw new ApiError("Can't delete this event because registrations already exist. Close registration instead.");
  const name = (await currentDB()).battles.find((b) => b.id === id)?.name || "";
  ok(await supabase.from("portfolios").delete().eq("battle_id", id));
  ok(await supabase.from("events").delete().eq("id", id));
  await audit("battle.delete", id, name);
  await refreshDB();
}

export async function savePortfolio(p: Portfolio) {
  const db = await currentDB();
  const exists = db.portfolios.some((x) => x.id === p.id);
  ok(await supabase.from("portfolios").upsert({ id: p.id, battle_id: p.battleId, name: p.name, description: p.description, slots: p.slots }).select("id"));
  await audit(exists ? "portfolio.update" : "portfolio.create", p.id, `${p.name} (${p.slots} slots)`);
  await refreshDB();
}

export async function deletePortfolio(id: string) {
  const db = await currentDB();
  if (db.registrations.some((r) => r.preferences.includes(id) || r.assignment?.portfolioId === id))
    throw new ApiError("Can't delete — participants have ranked or been assigned this role.");
  ok(await supabase.from("portfolios").delete().eq("id", id));
  await audit("portfolio.delete", id, "");
  await refreshDB();
}

export async function commitAssignment(battleId: string, result: AssignmentResult) {
  const at = now();
  await Promise.all(
    result.proposals.map((p) =>
      updateReg(
        p.registrationId,
        p.portfolioId && p.method ? { assignment: { portfolioId: p.portfolioId, method: p.method, drawn: p.drawn, assignedAt: at, seed: result.seed } } : { assignment: null },
      ),
    ),
  );
  const s = result.stats;
  await audit("assignment.run", battleId, `seed ${result.seed} · 1st ${s.first} · 2nd ${s.second} · 3rd ${s.third} · manual ${s.manual} · unassigned ${s.unassigned} · draws ${s.draws}`);
  await refreshDB();
}

export async function overrideAssignment(id: string, portfolioId: string | null, reason: string) {
  if (!reason.trim()) throw new ApiError("A reason is required for manual overrides.");
  const db = await currentDB();
  const r = db.registrations.find((x) => x.id === id);
  const from = db.portfolios.find((p) => p.id === r?.assignment?.portfolioId)?.name ?? "none";
  const to = db.portfolios.find((p) => p.id === portfolioId)?.name ?? "none";
  await updateReg(id, { assignment: portfolioId ? { portfolioId, method: "manual", drawn: false, assignedAt: now() } : null });
  await audit("assignment.override", id, `${from} → ${to} · ${reason}`);
  await refreshDB();
}

export async function setPersonReveal(id: string, revealed: boolean) {
  const r = await fetchReg(id);
  await updateReg(id, { revealed });
  await audit(revealed ? "reveal.person" : "reveal.person.hide", id, "");
  if (revealed && r.assignment) await notify(r, "THE VERDICT — Your role has been decided", `Hi {name}, your role for THE VERDICT is ready. Open your dashboard to reveal it.`);
  await refreshDB();
}

export async function setBattleReveal(battleId: string, revealed: boolean, mode: RevealMode) {
  const db = await currentDB();
  const b = db.battles.find((x) => x.id === battleId);
  if (!b) throw new ApiError("Battle not found.");
  ok(await supabase.from("events").update({ revealed, reveal_mode: mode }).eq("id", battleId).select("id"));
  await audit(revealed ? "reveal.battle" : "reveal.battle.hide", battleId, `mode: ${mode}`);
  if (revealed)
    for (const r of db.registrations.filter((x) => x.battleId === battleId && x.assignment))
      await notify(r, "THE VERDICT — Your role has been decided", `Hi {name}, roles for ${b.name} are out. Open your dashboard to reveal yours.`);
  await refreshDB();
}

export async function sendCustomNotification(ids: string[], channels: Channel[], subject: string, body: string) {
  for (const id of ids) await notify(await fetchReg(id), subject, body, channels);
  await audit("notify.custom", `${ids.length} registrations`, `${channels.join("+")} · ${subject}`);
  await refreshDB();
}

/** NOTE: this only marks queued rows as "sent". Actual email/WhatsApp delivery still needs a sender (Edge Function / provider). */
export async function flushNotifications() {
  ok(await supabase.from("notifications").update({ status: "sent" }).eq("status", "queued").select("id"));
  await refreshDB();
}

export async function saveSettings(s: DB["settings"]) {
  ok(await supabase.from("settings").upsert({ id: 1, upi_id: s.upiId, payee_name: s.payeeName }).select("id"));
  await audit("settings.update", "settings", `UPI ${s.upiId}`);
  await refreshDB();
}
