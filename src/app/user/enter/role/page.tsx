"use client";

import { DndContext, DragOverlay, MouseSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, FullLoader, LockIcon, Modal, cx } from "@/components/ui";
import { portfoliosOf } from "@/lib/api";
import { draftStore, useDB, useDraft } from "@/lib/store";
import type { Portfolio } from "@/lib/types";

const RANK = ["1ST CHOICE", "2ND CHOICE", "3RD CHOICE"];

export default function ClaimRole() {
  const db = useDB();
  const draft = useDraft();
  const router = useRouter();
  const [ranks, setRanks] = useState<(string | null)[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    if (draft?.battleId === "storagewars") {
      draftStore.update((d) => {
        d.preferences = [];
        d.locked = true;
      });
      router.replace("/user/enter/arena");
    }
  }, [draft?.battleId, router]);

  if (!db || !draft) return <FullLoader />;
  const battle = db.battles.find((b) => b.id === draft.battleId);
  if (!battle) return <NeedBattle />;
  if (battle.id === "storagewars") return <FullLoader />;

  const pfs = portfoliosOf(db, battle.id);
  const locked = !!draft.locked;
  const slots: (string | null)[] = ranks ?? [0, 1, 2].map((i) => draft.preferences?.[i] ?? null);
  const pf = (id: string | null) => pfs.find((p) => p.id === id);
  const full = slots.every(Boolean);

  const place = (id: string, at?: number) => {
    if (locked) return;
    const next = [...slots];
    const cur = next.indexOf(id);
    const target = at ?? (cur !== -1 ? -1 : next.indexOf(null));
    if (at === undefined && cur !== -1) {
      next[cur] = null; // tap again to remove
    } else if (target !== -1) {
      const occupant = next[target];
      if (cur !== -1) next[cur] = occupant; // swap
      next[target] = id;
    }
    setRanks(next);
  };
  const clearSlot = (i: number) => {
    if (locked) return;
    const n = [...slots];
    n[i] = null;
    setRanks(n);
  };
  const moveUp = (i: number) => {
    if (locked || i === 0) return;
    const n = [...slots];
    [n[i - 1], n[i]] = [n[i], n[i - 1]];
    setRanks(n);
  };

  const onDragStart = (e: DragStartEvent) => setActive(String(e.active.data.current?.pid));
  const onDragEnd = (e: DragEndEvent) => {
    setActive(null);
    const pid = e.active.data.current?.pid as string | undefined;
    const to = e.over?.data.current?.slot as number | undefined;
    if (pid && to !== undefined) place(pid, to);
  };

  const lock = () => {
    draftStore.update((d) => {
      d.preferences = slots as string[];
      d.locked = true;
    });
    setConfirming(false);
    router.push("/user/enter/arena");
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-8 px-4 py-8 md:px-8 md:py-12 lg:grid-cols-[380px_1fr]">
        {/* ranking column */}
        <div className="lg:sticky lg:top-36 lg:self-start">
          <p className="font-serif text-xs tracking-[0.5em]" style={{ color: battle.accent }}>
            STAGE 02 · {battle.name.toUpperCase()}
          </p>
          <h1 className="mt-1 font-display text-5xl tracking-wide md:text-6xl">{battle.id === "football" ? "Choose Your Club" : "Claim Your Role"}</h1>
          <p className="mt-2 text-sm text-muted">
            Rank your top three {battle.id === "football" ? "clubs" : "roles"}. <span className="hidden md:inline">Drag {battle.id === "football" ? "clubs" : "roles"} into the slots, or click to fill in order.</span>
            <span className="md:hidden">Tap {battle.id === "football" ? "clubs" : "roles"} in order of preference.</span> The Verdict assigns one.
          </p>
          {battle.mode === "team" && (
            <p className="mt-3 border-l-2 px-3 py-2 text-xs text-bone/80" style={{ borderColor: battle.accent, background: `${battle.accent}12` }}>
              Your whole team shares one ranking. Only the team leader fills this in.
            </p>
          )}

          <div className="mt-6 space-y-3">
            {slots.map((id, i) => (
              <Slot key={i} index={i} portfolio={pf(id)} accent={battle.accent} locked={locked} onClear={() => clearSlot(i)} onUp={() => moveUp(i)} />
            ))}
          </div>

          <div className="mt-6">
            {locked ? (
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm text-emerald-300">
                  <LockIcon /> Ranking locked
                </p>
                <Button size="lg" className="w-full" onClick={() => router.push("/user/enter/arena")}>
                  Enter the arena →
                </Button>
              </div>
            ) : (
              <Button size="lg" className="w-full" disabled={!full} onClick={() => setConfirming(true)}>
                {full ? "Confirm ranking →" : `Pick ${slots.filter((s) => !s).length} more`}
              </Button>
            )}
          </div>
        </div>

        {/* portfolio grid */}
        <div className="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pfs.map((p, i) => (
            <PortfolioCard key={p.id} p={p} index={i} rank={slots.indexOf(p.id)} accent={battle.accent} locked={locked} onTap={() => place(p.id)} />
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {active && pf(active) ? (
          <div className="glass w-72 rotate-2 p-4 shadow-2xl" style={{ borderColor: battle.accent }}>
            <div className="font-display text-2xl">{pf(active)!.name}</div>
          </div>
        ) : null}
      </DragOverlay>

      <Modal open={confirming} onClose={() => setConfirming(false)}>
        <h3 className="font-display text-3xl tracking-wide">Lock your ranking?</h3>
        <p className="mt-1 text-sm text-muted">Once locked, your preferences cannot be changed.</p>
        <ol className="mt-4 space-y-2">
          {slots.map((id, i) => (
            <li key={i} className="flex items-center gap-3 border border-line px-3 py-2">
              <span className="font-display text-2xl" style={{ color: battle.accent }}>
                {i + 1}
              </span>
              <span>{pf(id)?.name}</span>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            Go back
          </Button>
          <Button onClick={lock}>
            <LockIcon /> Lock it in
          </Button>
        </div>
      </Modal>
    </DndContext>
  );
}

function Slot({
  index,
  portfolio,
  accent,
  locked,
  onClear,
  onUp,
}: {
  index: number;
  portfolio?: Portfolio;
  accent: string;
  locked: boolean;
  onClear: () => void;
  onUp: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${index}`, data: { slot: index }, disabled: locked });
  const drag = useDraggable({ id: `slotitem-${index}`, data: { pid: portfolio?.id }, disabled: locked || !portfolio });
  return (
    <div
      ref={setNodeRef}
      className={cx("relative flex min-h-[76px] items-center gap-4 border px-4 py-3 transition-all", portfolio ? "bg-ink-2" : "border-dashed bg-transparent")}
      style={{
        borderColor: isOver ? accent : portfolio ? `${accent}80` : "rgba(255,255,255,0.12)",
        boxShadow: isOver ? `0 0 30px -10px ${accent}` : undefined,
      }}
    >
      <span className="font-display text-5xl leading-none" style={{ color: portfolio ? accent : "rgba(255,255,255,0.15)" }}>
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold tracking-[0.25em] text-muted">{RANK[index]}</div>
        <AnimatePresence mode="wait">
          {portfolio ? (
            <motion.div
              key={portfolio.id}
              ref={drag.setNodeRef}
              {...drag.listeners}
              {...drag.attributes}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: drag.isDragging ? 0.3 : 1, x: 0 }}
              exit={{ opacity: 0 }}
              className={cx("truncate font-display text-2xl tracking-wide", !locked && "md:cursor-grab")}
            >
              {portfolio.name}
            </motion.div>
          ) : (
            <div className="text-sm text-white/25">Empty — drop or tap a role</div>
          )}
        </AnimatePresence>
      </div>
      {portfolio && !locked && (
        <div className="flex flex-col gap-1">
          {index > 0 && (
            <button onClick={onUp} className="px-1 text-muted hover:text-bone" aria-label="Move up">
              ▲
            </button>
          )}
          <button onClick={onClear} className="px-1 text-muted hover:text-crimson" aria-label="Remove">
            ✕
          </button>
        </div>
      )}
      {locked && portfolio && <LockIcon className="h-4 w-4 text-muted" />}
    </div>
  );
}

function PortfolioCard({ p, index, rank, accent, locked, onTap }: { p: Portfolio; index: number; rank: number; accent: string; locked: boolean; onTap: () => void }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `pf-${p.id}`, data: { pid: p.id }, disabled: locked });
  const ranked = rank !== -1;
  return (
    <motion.button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onTap}
      disabled={locked}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: isDragging ? 0.4 : locked && !ranked ? 0.35 : 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      whileTap={{ scale: 0.97 }}
      className={cx(
        "group relative flex min-h-[120px] flex-col justify-between overflow-hidden border p-4 text-left transition-colors",
        ranked ? "bg-ink-3" : "bg-ink-2/70 hover:bg-ink-3",
        !locked && "cursor-pointer md:cursor-grab",
      )}
      style={{ borderColor: ranked ? accent : "rgba(255,255,255,0.08)" }}
    >
      <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-40" style={{ background: accent }} />
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-2xl leading-tight tracking-wide">{p.name}</h3>
        {ranked && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex h-8 w-8 shrink-0 items-center justify-center font-display text-xl text-ink"
            style={{ background: accent }}
          >
            {rank + 1}
          </motion.span>
        )}
      </div>
      <p className="mt-2 text-sm text-muted">{p.description}</p>
      <p className="mt-3 text-[10px] tracking-[0.25em] text-white/30 uppercase">
        {p.slots} {p.slots === 1 ? "slot" : "slots"}
      </p>
    </motion.button>
  );
}

function NeedBattle() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-muted">Choose a battle first.</p>
      <Link href="/user/enter/battle" className="font-display text-xl tracking-widest text-gold">
        ← Stage 01
      </Link>
    </div>
  );
}
