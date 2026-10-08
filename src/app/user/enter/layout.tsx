"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { TopBar } from "@/components/auth";
import { cx } from "@/components/ui";
import { useDB, useDraft } from "@/lib/store";

const STAGES = [
  { path: "/user/enter/battle", n: "01", label: "Choose Your Battle" },
  { path: "/user/enter/role", n: "02", label: "Claim Your Role" },
  { path: "/user/enter/arena", n: "03", label: "Enter the Arena" },
  { path: "/user/enter/pay", n: "04", label: "Secure Your Entry" },
];

export default function EnterLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const db = useDB();
  const draft = useDraft();
  const idx = STAGES.findIndex((s) => path.startsWith(s.path));
  const battle = db?.battles.find((b) => b.id === draft?.battleId);
  const accent = idx > 0 && battle ? battle.accent : "#d9b45a";

  return (
    <div className="flex min-h-screen flex-col" style={{ ["--accent" as string]: accent }}>
      <TopBar />
      <div className="border-b border-line bg-ink-2/60">
        <ol className="mx-auto flex max-w-7xl items-stretch px-2 md:px-8">
          {STAGES.map((s, i) => (
            <li key={s.n} className="relative flex-1 px-2 py-3 md:py-4">
              <div className={cx("flex items-baseline gap-2 transition-colors", i === idx ? "text-bone" : i < idx ? "text-muted" : "text-white/20")}>
                <span className="font-display text-xl md:text-2xl" style={i <= idx ? { color: "var(--accent)" } : undefined}>
                  {s.n}
                </span>
                <span className="hidden font-display text-sm tracking-[0.18em] md:inline lg:text-base">{s.label}</span>
              </div>
              <div className="absolute inset-x-2 bottom-0 h-[2px] bg-white/5">
                {i <= idx && (
                  <motion.div
                    layoutId={i === idx ? "stagebar" : undefined}
                    className="h-full"
                    style={{ background: "var(--accent)", opacity: i === idx ? 1 : 0.4 }}
                  />
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
      <main className="relative flex flex-1 flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-[background] duration-700"
          style={{ background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${accent}1f, transparent 70%)` }}
        />
        <div className="relative flex flex-1 flex-col">{children}</div>
      </main>
    </div>
  );
}