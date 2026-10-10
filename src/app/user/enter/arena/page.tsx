"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, ErrorNote, FullLoader, Input, Select, rupee } from "@/components/ui";
import { createRegistration, quoteFee, validateMember } from "@/lib/api";
import { useDB, useDraft } from "@/lib/store";
import { BRANCHES, YEARS, type Branch, type Member, type Year } from "@/lib/types";

import { supabase } from "@/lib/supabase";
type FormMember = {
  name: string;
  usn: string;
  email: string;
  phone: string;
  branch: Branch | "";
  year: Year | "";
};

const blank = (): FormMember => ({
  name: "",
  usn: "",
  email: "",
  phone: "",
  branch: "",
  year: "",
});

export default function Arena() {
  const db = useDB();
  const draft = useDraft();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [members, setMembers] = useState<FormMember[] | null>(null);
  const [teamName, setTeamName] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
      setLoadingAuth(false);

      if (!user) {
        router.push("/login");
      }
    }

    loadUser();
  }, [router]);

  const existing = db?.registrations.find(
    (r) => r.id === draft?.registrationId
  );

  useEffect(() => {
    if (existing) router.replace("/user/enter/pay");
  }, [existing, router]);

  if (!db || !draft || loadingAuth) return <FullLoader />;

  const battle = db.battles.find((b) => b.id === draft.battleId);

  if (!battle || !draft.locked)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-muted">
          {!battle
            ? "Choose a battle first."
            : "Lock your role ranking first."}
        </p>
        <Link
          href={!battle ? "/user/enter/battle" : "/user/enter/role"}
          className="font-display text-xl tracking-widest text-gold"
        >
          ← Go back
        </Link>
      </div>
    );

  if (existing) return <FullLoader />;

  const isTeam = battle.mode === "team";
  const isStorageWars = battle.id === "bollywood";

  const list: FormMember[] =
    members ??
    Array.from({ length: battle.teamMin }, (_, i) =>
      i === 0 && user
        ? {
            ...blank(),
            name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              "",
            email: user.email || "",
          }
        : blank()
    );

  const errors = list.map((m) =>
    validateMember(m as Partial<Member>)
  );

  const valid =
    errors.every((e) => !Object.keys(e).length) &&
    (!isTeam || teamName.trim().length >= 2);

  const quote = quoteFee(
    battle,
    list
      .filter((m) => m.branch)
      .map((m) => m.branch as Branch)
  );

  const set = (
    i: number,
    k: keyof FormMember,
    v: string
  ) => {
    const n = list.map((m) => ({ ...m }));
    n[i] = {
      ...n[i],
      [k]: k === "usn" ? v.toUpperCase() : v,
    };
    setMembers(n);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setError("");

    if (!valid) return;

    setBusy(true);

    try {
      await createRegistration({
        battleId: battle.id,
        preferences: isStorageWars ? [] : (draft.preferences ?? []),
        members: list as Member[],
        teamName: isTeam ? teamName : undefined,
      });

      router.push("/user/enter/pay");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 md:px-8 md:py-12">
      <p
        className="font-serif text-xs tracking-[0.5em]"
        style={{ color: battle.accent }}
      >
        STAGE 03 · {battle.name.toUpperCase()}
      </p>

      <h1 className="mt-1 font-display text-5xl tracking-wide md:text-6xl">
        {isStorageWars ? "Register for Storage Wars" : "Enter the Arena"}
      </h1>

      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div
            key="signin"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass mt-8 p-8 text-center md:p-12"
          >
            <p className="text-muted">
              Redirecting to login...
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={submit}
            className="mt-8 space-y-6"
          >
            <div className="flex items-center gap-3 text-sm text-muted">
              Signed in as{" "}
              <span className="text-bone">{user.email}</span>
            </div>

            {isStorageWars && (
              <div className="glass p-5 md:p-6">
                <p className="text-sm text-muted">
                  Storage Wars is free to enter. Register a team of 2–4 members with a team name. No roles or portfolios are required, and your entry will be confirmed automatically.
                </p>
              </div>
            )}

            {isTeam && (
              <div className="glass p-5 md:p-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <Input
                    className="min-w-[240px] flex-1"
                    label="Team name"
                    placeholder="e.g. The Silent Strikers"
                    value={teamName}
                    onChange={(e) =>
                      setTeamName(e.target.value)
                    }
                    error={
                      touched &&
                      teamName.trim().length < 2
                        ? "Team name required"
                        : undefined
                    }
                  />

                  <Link
                    href="/user/join"
                    className="pb-3 text-xs text-muted hover:text-gold"
                  >
                    Not the leader?{" "}
                    <span className="underline">
                      Join with team code →
                    </span>
                  </Link>
                </div>

                <p className="mt-3 text-xs text-muted">
                  {isStorageWars ? "Storage Wars is free to enter. Add your team name and 2–4 team members; there are no roles to choose and your entry will be confirmed automatically." : "You are registering the whole team. A "}{!isStorageWars && " "}
                {!isStorageWars && <>
                  <span
                    style={{ color: battle.accent2 }}
                  >
                    team code
                  </span>{" "}
                  will be generated after this step — share it
                  so teammates can follow the team's status and
                  reveal.
                </>}
                </p>
              </div>
            )}

            {list.map((m, i) => (
              <motion.fieldset
                key={i}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-5 md:p-6"
              >
                <legend className="sr-only">
                  Member {i + 1}
                </legend>

                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-2xl tracking-wide">
                    {isTeam
                      ? i === 0
                        ? "Team Leader"
                        : `Member ${i + 1}`
                      : "Your Details"}
                  </h2>

                  {isTeam && i >= battle.teamMin && (
                    <button
                      type="button"
                      className="text-xs text-muted hover:text-crimson"
                      onClick={() =>
                        setMembers(
                          list.filter((_, j) => j !== i)
                        )
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Full name"
                    value={m.name}
                    onChange={(e) =>
                      set(i, "name", e.target.value)
                    }
                    error={
                      touched
                        ? errors[i].name
                        : undefined
                    }
                  />

                  <Input
                    label="USN"
                    placeholder="NNM23IS045"
                    value={m.usn}
                    onChange={(e) =>
                      set(i, "usn", e.target.value)
                    }
                    error={
                      touched
                        ? errors[i].usn
                        : undefined
                    }
                  />

                  <Input
                    label="Email"
                    type="email"
                    value={m.email}
                    onChange={(e) =>
                      set(i, "email", e.target.value)
                    }
                    error={
                      touched
                        ? errors[i].email
                        : undefined
                    }
                  />

                  <Input
                    label="WhatsApp number"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="9876543210"
                    value={m.phone}
                    onChange={(e) =>
                      set(
                        i,
                        "phone",
                        e.target.value.replace(/\D/g, "")
                      )
                    }
                    error={
                      touched
                        ? errors[i].phone
                        : undefined
                    }
                  />

                  <Select
                    label="Branch"
                    placeholder="Select branch"
                    options={BRANCHES}
                    value={m.branch}
                    onChange={(e) =>
                      set(i, "branch", e.target.value)
                    }
                    error={
                      touched
                        ? errors[i].branch
                        : undefined
                    }
                  />

                  <Select
                    label="Year"
                    placeholder="Select year"
                    options={YEARS}
                    value={m.year}
                    onChange={(e) =>
                      set(i, "year", e.target.value)
                    }
                    error={
                      touched
                        ? errors[i].year
                        : undefined
                    }
                  />
                </div>
              </motion.fieldset>
            ))}

            {isTeam && list.length < battle.teamMax && (
              <button
                type="button"
                onClick={() =>
                  setMembers([...list, blank()])
                }
                className="w-full border border-dashed border-white/15 py-4 font-display text-lg tracking-[0.2em] text-muted transition hover:border-gold/50 hover:text-gold"
              >
                + Add member {list.length + 1} (optional)
              </button>
            )}

            <div className="flex flex-col items-stretch justify-between gap-4 border-t border-line pt-6 md:flex-row md:items-center">
              <div>
                <div className="text-[11px] tracking-[0.25em] text-muted uppercase">
                  Entry fee
                </div>

                <div
                  className="font-display text-4xl"
                  style={{ color: battle.accent2 }}
                >
                  {quote.lines.length
                    ? quote.total === 0
                      ? "FREE"
                      : rupee(quote.total)
                    : "—"}
                </div>

                <div className="text-xs text-muted">
                  {isStorageWars
                    ? "No payment required"
                    : <>ISE {rupee(battle.feeISE)} · Others {rupee(battle.feeOther)}{isTeam && " · per team"} — calculated from branch</>}
                </div>
              </div>

              <Button size="lg" loading={busy}>
                {isStorageWars
                  ? "Register & confirm free entry →"
                  : quote.lines.length > 0 && quote.total === 0
                    ? "Confirm registration →"
                    : "Proceed to payment →"}
              </Button>
            </div>

            <ErrorNote>
              {error ||
                (touched && !valid
                  ? "Please fix the highlighted fields."
                  : "")}
            </ErrorNote>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}