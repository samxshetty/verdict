"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { TopBar } from "@/components/auth";
import { FullLoader } from "@/components/ui";
import { canSeeRole, portfolioName } from "@/lib/api";
import { useDB } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export default function RevealPage() {
  return (
    <Suspense fallback={<FullLoader />}>
      <Reveal />
    </Suspense>
  );
}

function Reveal() {
  const { id } = useParams() as { id: string };
  const db = useDB();
const [user, setUser] = useState<any>(null);
const [loadingAuth, setLoadingAuth] = useState(true);
  const [stage, setStage] = useState(0);

  useEffect(() => {
  if (stage === 1) {
    const t = setTimeout(() => setStage(2), 3500);
    return () => clearTimeout(t);
  }

  if (stage === 2) {
    const t = setTimeout(() => setStage(3), 2500);
    return () => clearTimeout(t);
  }
}, [stage]);

if (!db || loadingAuth) return <FullLoader />;

const reg = db.registrations.find((r) => r.id === id);
const battle = db.battles.find((b) => b.id === reg?.battleId);

if (
  !reg ||
  !battle ||
  !user ||
  (!reg.viewers.includes(user.email ?? "") &&
    reg.ownerEmail !== user.email)
) {
  return (
    <div className="flex min-h-screen flex-col bg-ink text-bone">
      <TopBar />
      <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
        <p className="font-display text-xl text-muted">
          Access denied or registration not found.
        </p>
      </div>
    </div>
  );
}

  if (!canSeeRole(db, reg) || !reg.assignment) {
    return (
      <div className="flex min-h-screen flex-col bg-ink text-bone">
        <TopBar />
        <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
          <p className="font-display text-2xl text-muted">The verdict is not yet ready for you.</p>
          <Link href="/user/dashboard" className="mt-4 text-sm text-gold hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

const assignment = reg.assignment!;
const roleName = portfolioName(db, assignment.portfolioId);
const simple = battle.revealMode === "simple";

  if (simple || stage === 3) {
    return (
      <div className="flex min-h-screen flex-col bg-ink text-bone">
        {!simple && <TopBar />}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="relative flex flex-1 flex-col items-center justify-center overflow-hidden p-6 text-center"
        >
          <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 60% at 50% 50%, ${battle.accent}25, transparent 70%)` }} />
          <p className="relative font-serif text-sm tracking-[0.4em]" style={{ color: battle.accent2 }}>
            {battle.name.toUpperCase()}
          </p>
          <h1 className="relative mt-2 font-display text-4xl tracking-wide text-muted">YOUR ROLE IS</h1>
          <motion.div
            initial={{ scale: 0.9, y: 20, filter: "blur(10px)" }}
            animate={{ scale: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.2, delay: 0.5, type: "spring", bounce: 0.4 }}
            className="relative mt-8 border border-line bg-ink-2/80 p-8 shadow-2xl backdrop-blur-md md:p-16"
            style={{ borderColor: battle.accent, boxShadow: `0 0 100px -20px ${battle.accent}` }}
          >
            <div className="font-display text-6xl leading-none md:text-8xl md:leading-none">{roleName}</div>
            <div className="mt-4 text-sm tracking-widest text-muted uppercase">Method: {assignment.method} choice</div>
          </motion.div>
          {simple && (
            <Link href="/user/dashboard" className="relative mt-12 text-sm tracking-widest text-muted hover:text-bone">
              ← DASHBOARD
            </Link>
          )}
        </motion.main>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-bone">
      {stage === 0 && (
        <button onClick={() => setStage(1)} className="shine border border-gold/40 px-8 py-4 font-display text-2xl tracking-[0.2em] text-gold hover:bg-gold/10">
          HEAR THE VERDICT
        </button>
      )}

      {stage === 1 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.95, 1, 1, 1.05] }}
          transition={{ duration: 3.5, times: [0, 0.2, 0.8, 1] }}
          className="font-serif text-2xl tracking-[0.4em] md:text-4xl"
        >
          THE JURY HAS DELIBERATED.
        </motion.div>
      )}

      {stage === 2 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.95, 1, 1, 1.05] }}
          transition={{ duration: 2.5, times: [0, 0.2, 0.8, 1] }}
          className="font-serif text-3xl tracking-[0.3em] text-gold md:text-5xl"
        >
          YOUR ROLE HAS BEEN DECIDED.
        </motion.div>
      )}
    </div>
  );
}
