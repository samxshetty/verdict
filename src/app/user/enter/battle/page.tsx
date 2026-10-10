"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, FullLoader, cx, rupee } from "@/components/ui";
import { isSoldOut, seatsTaken } from "@/lib/api";
import { draftStore, useDB, useDraft } from "@/lib/store";
import type { Battle } from "@/lib/types";

export default function ChooseBattle() {
  const db = useDB();
  const draft = useDraft();
  const router = useRouter();
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? draft?.battleId ?? null;
  const selectedBattle = db?.battles.find((b) => b.id === selected);
  // Team-code joining is available for team-based auctions (IPL and Football).
  const showJoin = selectedBattle?.mode === "team";

  if (!db || !draft) return <FullLoader />;

  const confirm = () => {
    if (!selected) return;
    const battle = db?.battles.find((b) => b.id === selected);
    if (draft.battleId !== selected) {
      draftStore.set({ battleId: selected });
    }
    if (battle?.id === "bollywood") {
      // Storage Wars is free to enter with no role/portfolio selection.
      draftStore.update((d) => {
        d.battleId = battle.id;
        d.preferences = [];
        d.locked = true;
      });
      router.push("/user/enter/arena");
      return;
    }
    router.push("/user/enter/role");
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 md:px-8 md:py-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="font-serif text-xs tracking-[0.5em] text-gold">STAGE 01</p>
        <h1 className="mt-1 font-display text-5xl tracking-wide md:text-7xl">Choose Your Battle</h1>
        <p className="mt-2 max-w-xl text-muted">Choose your arena. Storage Wars is free to enter with instant confirmation; no roles to choose.</p>
      </motion.div>

      <div className="mt-8 flex flex-1 flex-col gap-4 md:min-h-[520px] md:flex-row">
        {db.battles.map((b, i) => (
          <BattleCard
            key={b.id}
            battle={b}
            index={i}
            taken={seatsTaken(db, b.id)}
            soldOut={isSoldOut(db, b) || !b.isOpen}
            selected={selected === b.id}
            dimmed={!!selected && selected !== b.id}
            onSelect={() => setPicked(b.id)}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-line py-4 md:flex-row">
        {showJoin ? (
          <Link href="/user/join" className="text-sm text-muted hover:text-gold">
            Teammate already registered your team? <span className="underline">Join with team code</span>
          </Link>
        ) : (
          <span />
        )}
        <Button size="lg" disabled={!selected} onClick={confirm}>
          Lock in battle →
        </Button>
      </div>
    </div>
  );
}

function BattleCard({
  battle: b,
  index,
  taken,
  soldOut,
  selected,
  dimmed,
  onSelect,
}: {
  battle: Battle;
  index: number;
  taken: number;
  soldOut: boolean;
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
}) {
  const pct = Math.min(100, (taken / b.capacity) * 100);
  const left = Math.max(0, b.capacity - taken);
  return (
    <motion.button
      type="button"
      layout
      disabled={soldOut}
      onClick={onSelect}
      initial={{ opacity: 0, y: 30 }}
      animate={{
        opacity: dimmed ? 0.35 : 1,
        y: 0,
        scale: dimmed ? 0.97 : 1,
        filter: dimmed ? "grayscale(0.8) brightness(0.6)" : soldOut ? "grayscale(1) brightness(0.5)" : "grayscale(0) brightness(1)",
      }}
      transition={{ layout: { type: "spring", damping: 26, stiffness: 200 }, delay: index * 0.08, duration: 0.5 }}
      className={cx(
        "group relative flex min-h-[220px] flex-col justify-end overflow-hidden text-left outline-none md:min-h-0",
        selected ? "md:flex-[2.2] min-h-[380px]" : "md:flex-1",
        soldOut ? "cursor-not-allowed" : "cursor-pointer",
      )}
      style={{ boxShadow: selected ? `0 0 0 2px ${b.accent}, 0 0 80px -20px ${b.accent}` : "0 0 0 1px rgba(255,255,255,0.08)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={b.id === "bollywood" ? "/battles/storagewars.jpg" : b.image}
        alt=""
        className={cx("absolute inset-0 h-full w-full object-cover transition-transform duration-[1.5s]", selected ? "scale-105" : "group-hover:scale-105")}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10" />
      <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${b.accent}40, transparent 50%)` }} />

      {soldOut && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <span className="-rotate-12 border-4 border-crimson px-6 py-2 font-display text-5xl tracking-[0.2em] text-crimson md:text-6xl">
            {b.isOpen ? "SOLD OUT" : "CLOSED"}
          </span>
        </div>
      )}

      <div className="relative z-[5] p-5 md:p-7">
        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.25em] uppercase" style={{ color: b.accent2 }}>
          <span>{b.mode === "team" ? `Team of ${b.teamMin}–${b.teamMax}` : "Individual"}</span>
          <span className="text-white/30">•</span>
          <span>Battle 0{index + 1}</span>
        </div>
        <h2 className={cx("mt-1 font-display leading-[0.9] tracking-wide transition-all", selected ? "text-5xl md:text-7xl" : "text-4xl md:text-5xl")}>
          {b.name}
        </h2>
        <p className="font-serif text-sm tracking-[0.25em] text-bone/80 uppercase">{b.subtitle}</p>

        <AnimatePresence>
          {selected && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <p className="mt-4 max-w-md text-sm text-bone/80">{b.description}</p>
              <div className="mt-4 flex gap-6 text-sm">
                <div>
                  <div className="text-[10px] tracking-widest text-muted uppercase">ISE</div>
                  <div className="font-display text-2xl">{rupee(b.feeISE)}</div>
                </div>
                <div>
                  <div className="text-[10px] tracking-widest text-muted uppercase">Other branches</div>
                  <div className="font-display text-2xl">{rupee(b.feeOther)}</div>
                </div>
                {b.mode === "team" && <div className="self-end pb-1 text-xs text-muted">per team</div>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-5">
          <div className="mb-1 flex justify-between text-[11px] tracking-widest text-muted uppercase">
            <span>{b.mode === "team" ? "Franchises" : "Seats"} claimed</span>
            <span className={left <= 5 && !soldOut ? "text-crimson" : ""}>{soldOut ? "0 left" : `${left} left`}</span>
          </div>
          <div className="h-1 w-full bg-white/10">
            <motion.div className="h-full" style={{ background: b.accent }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: 0.3 + index * 0.1 }} />
          </div>
        </div>
      </div>
    </motion.button>
  );
}
