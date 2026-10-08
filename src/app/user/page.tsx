"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { supabase } from "@/lib/supabase";

const EVENT_START = new Date("2026-10-16T09:00:00+05:30").getTime();

function useCountdown() {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, EVENT_START - Date.now()));
    tick();

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (left === null) return null;

  const s = Math.floor(left / 1000);

  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

type EventType = {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  description: string;
  mode: string;
  team_min: number;
  team_max: number;
  capacity: number;
  fee_ise: number;
  fee_other: number;
  is_open: boolean;
  image_url: string | null;
  revealed: boolean;
};

export default function UserPage() {
  const t = useCountdown();

  const [email, setEmail] = useState("Checking login...");
  const [events, setEvents] = useState<EventType[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
  async function loadPage() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log("USER:", user);

      if (!user) {
        window.location.href = "/login";
        return;
      }

      // NMAMIT restriction
      if (!user.email?.endsWith("@nmamit.in")) {
        alert("Only NMAMIT email IDs are allowed.");

        await supabase.auth.signOut();

        window.location.href = "/login";
        return;
      }

      setEmail(user.email);

      // Create profile if missing
      const { error: profileError } = await supabase
.from("profiles").upsert({
  id: user.id,
  email: user.email,
});
      if (profileError) {
        console.error("PROFILE ERROR:", profileError);
      }

      // Load events
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .order("name");

      if (eventsError) {
        console.error("EVENT ERROR:", eventsError);
      } else {
        console.log("EVENTS:", eventsData);
        setEvents(eventsData || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEvents(false);
    }
  }

  loadPage();
}, []);

  const units = [
    { v: t?.d, l: "DAYS" },
    { v: t?.h, l: "HRS" },
    { v: t?.m, l: "MIN" },
    { v: t?.s, l: "SEC" },
  ];

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 35%, rgba(217,180,90,0.10), transparent 70%), radial-gradient(ellipse 60% 40% at 85% 90%, rgba(193,18,31,0.14), transparent 70%)",
        }}
      />

      <div
        className="vignette pointer-events-none absolute inset-0"
        aria-hidden
      />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <Logo />

        <div className="text-right text-xs text-green-400">
          {email}
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-serif text-xs font-bold tracking-[0.5em] text-gold md:text-sm"
        >
          VISTA PRESENTS
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="letter-wave text-gold-grad mt-3 font-display text-[4.5rem] leading-[0.9] tracking-wide sm:text-[7rem] md:text-[10rem]"
        >
          THE VERDICT
        </motion.h1>

        <div className="mt-6 h-px w-40 bg-gradient-to-r from-transparent via-crimson to-transparent md:w-64" />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-5 space-y-2"
        >
          <p className="font-display text-xl tracking-[0.25em] text-bone md:text-2xl">
            THREE BATTLES. ONE VERDICT.
          </p>

          <p className="font-display text-sm tracking-[0.25em] text-bone/80 md:text-base">
            16 – 17 OCTOBER
            <span className="mx-2 text-crimson">◆</span>
            APJ BLOCK, NMAMIT
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-10"
        >
          <Link
            href="/user/enter/battle"
            className="cta-pulse inline-block bg-bone px-10 py-4 font-display text-xl tracking-[0.3em] text-ink transition-transform hover:scale-[1.03] md:px-14 md:text-2xl"
          >
            ENTER THE VERDICT →
          </Link>
        </motion.div>

        <div
          className="mt-10 flex items-start gap-4 md:gap-6"
          aria-label="Countdown to The Verdict"
        >
          {units.map((u) => (
            <div
              key={u.l}
              className="flex w-12 flex-col items-center md:w-16"
            >
              <span className="font-display text-4xl leading-none text-bone tabular-nums md:text-5xl">
                {u.v === undefined ? "--" : pad(u.v)}
              </span>

              <span className="mt-1 font-display text-[10px] tracking-[0.2em] text-muted md:text-xs">
                {u.l}
              </span>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative z-10 grid grid-cols-1 divide-y divide-line border-t border-line bg-ink/60 backdrop-blur-sm md:grid-cols-3 md:divide-x md:divide-y-0">
        {loadingEvents ? (
          <div className="py-6 text-center text-muted col-span-3">
            Loading events...
          </div>
        ) : (
          events.map((event) => (
            <Link
              key={event.id}
              href={`/user/event/${event.id}`}
              className="py-4 text-center transition-colors hover:bg-white/5"
            >
              <p className="font-display text-lg tracking-[0.15em] md:text-xl text-gold">
                {event.name}
              </p>

              <p className="mt-0.5 font-display text-xs tracking-[0.2em] text-bone/70">
                {event.subtitle}
              </p>
            </Link>
          ))
        )}
      </footer>
    </div>
  );
}