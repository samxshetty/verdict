"use client";
import { draftStore } from "@/lib/store";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/auth";
import {
  Button,
  ErrorNote,
  FullLoader,
  Input,
  LockIcon,
  PayBadge,
  cx,
  fmtDate,
  rupee,
} from "@/components/ui";
import {
  canSeeRole,
  joinTeam,
  loadDB,
  portfolioName,
  regsFor,
} from "@/lib/dossier";
import type { Battle, DB, Registration } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import React, { useCallback, useEffect, useState } from "react";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [db, setDb] = useState<DB | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (u: User | null) => {
    if (!u?.email) {
      setDb(null);
      setLoading(false);
      return;
    }
    try {
      setDb(await loadDB(u.email));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      refresh(data.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      refresh(session?.user ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [refresh]);

  if (loading) {
    return (
      <Shell>
        <FullLoader />
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 py-24 text-center">
          <h1 className="font-display text-5xl tracking-wide">Your Dossier</h1>
          <p className="text-muted">Sign in to see your registrations.</p>
          <Link
            href="/login"
            className="rounded-full bg-white px-6 py-3 font-medium text-black"
          >
            Sign In
          </Link>
        </div>
      </Shell>
    );
  }

  if (error || !db) {
    return (
      <Shell>
        <div className="mx-auto max-w-xl py-24">
          <ErrorNote>Could not load your dossier: {error ?? "unknown error"}</ErrorNote>
        </div>
      </Shell>
    );
  }

  const regs = regsFor(db, user.email ?? "");
  const firstName = user.user_metadata?.full_name?.split(" ")[0] || "Agent";

  
  return (
    <Shell>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-8 md:py-12">
        <p className="font-serif text-xs tracking-[0.5em] text-gold">DOSSIER</p>
        <h1 className="mt-1 font-display text-5xl tracking-wide md:text-6xl">
          Welcome, {firstName}
        </h1>

        {regs.length === 0 ? (
          <div className="glass mt-8 p-10 text-center">
            <p className="text-muted">You haven&apos;t entered any battle yet.</p>
            <Link
              href="/user/enter/battle"
              className="mt-6 inline-block font-display text-2xl tracking-[0.2em] text-gold"
            >
              ENTER THE VERDICT →
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {regs.map((r: Registration, i: number) => {
              const battle = db.battles.find((b) => b.id === r.battleId);
              if (!battle) return null;
              return (
                <RegCard
                  key={r.id}
                  db={db}
                  reg={r}
                  battle={battle}
                  viewer={r.ownerEmail !== user.email}
                  index={i}
                />
              );
            })}
          </div>
        )}

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <JoinBox onJoined={() => refresh(user)} />
          <Link
            href="/user/enter/battle"
            onClick={() => draftStore.set({})}
            className="glass flex flex-col justify-center p-6 transition hover:border-gold/40"
          >
            <span className="text-[11px] uppercase tracking-[0.25em] text-muted">
              Another arena?
            </span>
            <span className="font-display text-2xl tracking-wide text-gold">
              Register for another battle →
            </span>
          </Link>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}

function RegCard({
  db,
  reg,
  battle,
  viewer,
  index,
}: {
  db: DB;
  reg: Registration;
  battle: Battle;
  viewer: boolean;
  index: number;
}) {
  const router = useRouter();
const st = reg.payment?.status ?? "not_submitted";
  const visible = canSeeRole(db, reg);

  const steps = [
    { label: "Registered", done: true, at: reg.createdAt },
    { label: "Payment submitted", done: st !== "not_submitted", at: reg.payment.submittedAt },
    {
      label: "Verified",
      done: st === "verified",
      at: st === "verified" ? reg.payment.reviewedAt : undefined,
    },
    { label: "Verdict", done: visible, at: undefined },
  ];

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="relative overflow-hidden border border-line bg-ink-2"
      style={{ "--accent": battle.accent } as React.CSSProperties}
    >
      <div className="relative h-28 overflow-hidden md:h-32">
        {battle.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={battle.image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-ink-2 via-ink-2/70 to-transparent" />
        <div className="relative flex h-full flex-col justify-end p-5">
          <div
            className="text-[11px] uppercase tracking-[0.25em]"
            style={{ color: battle.accent2 }}
          >
            {battle.subtitle}
            {viewer && " · Team member view"}
          </div>
          <h2 className="font-display text-4xl leading-none tracking-wide">{battle.name}</h2>
        </div>
      </div>

      <div className="grid gap-6 p-5 md:grid-cols-[1.3fr_1fr] md:p-6">
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.25em] text-muted">
                Registration ID
              </dt>
              <dd className="font-mono text-bone">{reg.id}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.25em] text-muted">Fee</dt>
              <dd>{rupee(reg.fee)}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.25em] text-muted">Payment</dt>
              <dd className="mt-0.5">
                <PayBadge status={st} />
              </dd>
            </div>
            {reg.teamCode && (
              <div>
                <dt className="text-[10px] uppercase tracking-[0.25em] text-muted">
                  Team · code
                </dt>
                <dd>
                  {reg.teamName} ·{" "}
                  <span className="font-mono" style={{ color: battle.accent2 }}>
                    {reg.teamCode}
                  </span>
                </dd>
              </div>
            )}
          </dl>

          {reg.members?.length > 1 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted">Members</div>
              <ul className="mt-1 space-y-0.5 text-sm">
                {reg.members.map((m, i) => (
                  <li key={m.usn}>
                    {m.name}{" "}
                    <span className="text-muted">
                      · {m.usn} · {m.branch}
                    </span>{" "}
                    {i === 0 && <span className="text-xs text-gold">(leader)</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-muted">
              <LockIcon className="h-3 w-3" /> Locked ranking
            </div>
            <ol className="mt-1 flex flex-wrap gap-2">
              {reg.preferences.map((p, i) => (
                <li key={p} className="border border-line px-2 py-1 text-sm">
                  <span className="mr-1 font-display" style={{ color: battle.accent }}>
                    {i + 1}
                  </span>
                  {portfolioName(db, p)}
                </li>
              ))}
            </ol>
          </div>

          {/* timeline */}
          <ol className="flex items-start">
            {steps.map((s, i) => (
              <li
                key={s.label}
                className="relative flex flex-1 flex-col items-center text-center"
              >
                {i > 0 && (
                  <span
                    className={cx(
                      "absolute top-[7px] right-1/2 h-px w-full",
                      s.done ? "bg-[var(--accent)]" : "bg-white/10"
                    )}
                  />
                )}
                <span
                  className={cx(
                    "relative z-[1] h-[15px] w-[15px] rounded-full border-2",
                    s.done
                      ? "border-[var(--accent)] bg-[var(--accent)]"
                      : "border-white/20 bg-ink-2"
                  )}
                />
                <span
                  className={cx(
                    "mt-2 text-[10px] uppercase leading-tight tracking-wider md:text-[11px]",
                    s.done ? "text-bone" : "text-muted"
                  )}
                >
                  {s.label}
                </span>
                {s.at && <span className="text-[10px] text-muted">{fmtDate(s.at)}</span>}
              </li>
            ))}
          </ol>

          {st === "rejected" && (
            <ErrorNote>Payment rejected: {reg.payment.rejectReason}</ErrorNote>
          )}
          {!viewer && (st === "not_submitted" || st === "rejected") && (
            <Button onClick={() => router.push(`/user/enter/pay?id=${reg.id}`)}>
              {st === "rejected" ? "Re-submit payment" : "Complete payment"} →
            </Button>
          )}
        </div>

        {/* verdict panel */}
        <div className="relative flex min-h-[220px] flex-col items-center justify-center overflow-hidden border border-line bg-black/40 p-6 text-center">
          {visible ? (
            <>
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle at 50% 30%, ${battle.accent}33, transparent 70%)`,
                }}
              />
              <p className="relative font-serif text-[11px] tracking-[0.4em] text-muted">
                THE VERDICT IS IN
              </p>
              <Link
                href={`/user/reveal/${reg.id}`}
                className="shine relative mt-4 border px-6 py-3 font-display text-2xl tracking-[0.2em]"
                style={{ borderColor: battle.accent, color: battle.accent2 }}
              >
                REVEAL MY ROLE
              </Link>
              <p className="relative mt-3 text-xs text-muted">
                Already seen it? Tap again to replay.
              </p>
            </>
          ) : (
            <>
              <LockIcon className="h-8 w-8 text-white/20" />
              <p className="mt-4 font-display text-2xl tracking-[0.15em] text-white/40">
                {st === "verified" ? "THE VERDICT IS BEING DELIBERATED" : "ROLE SEALED"}
              </p>
              <p className="mt-2 max-w-[16rem] text-xs text-muted">
                {st === "verified"
                  ? "Roles will be revealed by the event team. We'll notify you."
                  : "Your role is assigned only after payment is verified."}
              </p>
            </>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function JoinBox({ onJoined }: { onJoined: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <form
      className="glass space-y-3 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        try {
          const r = await joinTeam(code);
          setMsg({ ok: true, text: `Joined ${r.teamName} (${r.id}).` });
          setCode("");
          onJoined();
        } catch (err) {
          setMsg({ ok: false, text: (err as Error).message });
        } finally {
          setBusy(false);
        }
      }}
    >
      <span className="text-[11px] uppercase tracking-[0.25em] text-muted">
        Got a team code?
      </span>
      <div className="flex gap-2">
        <Input
          className="flex-1"
          placeholder="VRD-XXXX"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <Button type="submit" size="sm" loading={busy} disabled={code.length < 6}>
          Join
        </Button>
      </div>
      {msg && (
        <p className={cx("text-sm", msg.ok ? "text-emerald-300" : "text-red-400")}>
          {msg.text}
        </p>
      )}
    </form>
  );
}