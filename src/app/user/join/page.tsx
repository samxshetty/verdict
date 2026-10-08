"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  GoogleIcon,
  TopBar
} from "@/components/auth";import { Button, ErrorNote, FullLoader } from "@/components/ui";
import { joinTeam } from "@/lib/api";
import { useSession } from "@/lib/store";

export default function Join() {
  const session = useSession();
  const router = useRouter();
  const [signin, setSignin] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <main className="relative flex flex-1 items-center justify-center px-4 py-16">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 50% 40% at 50% 30%, rgba(59,130,246,0.15), transparent 70%)" }} />
        {session === undefined ? (
          <FullLoader />
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass relative w-full max-w-lg p-8 text-center md:p-10">
            <p className="font-serif text-xs tracking-[0.5em] text-[#3b82f6]">IPL MEGA AUCTION 2027</p>
            <h1 className="mt-2 font-display text-5xl tracking-wide">Join Your Team</h1>
            <p className="mt-2 text-sm text-muted">Your team leader registered the team and received a code. Enter it to link your account and follow your team&apos;s status and reveal.</p>
            {!session ? (
              <button onClick={() => setSignin(true)} className="mx-auto mt-8 flex items-center gap-3 rounded-full bg-white px-6 py-3 font-medium text-[#1f1f1f]">
                <GoogleIcon /> Sign in with Google
              </button>
            ) : (
              <form
                className="mt-8 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  try {
                    await joinTeam(code);
                    router.push("/user/dashboard");
                  } catch (err) {
                    setError((err as Error).message);
                    setBusy(false);
                  }
                }}
              >
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="VRD-XXXX"
                  maxLength={8}
                  autoFocus
                  className="w-full border-b-2 border-white/15 bg-transparent py-3 text-center font-display text-5xl tracking-[0.3em] text-bone outline-none placeholder:text-white/10 focus:border-[#3b82f6]"
                />
                <ErrorNote>{error}</ErrorNote>
                <Button size="lg" className="w-full" loading={busy} disabled={code.length < 8}>
                  Join team →
                </Button>
                <p className="text-xs text-muted">Signed in</p>
              </form>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
