"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { flushNotifications, signOut } from "@/lib/api";
import { useAdmin, useDB } from "@/lib/store";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = useAdmin();
  const db = useDB();
  const path = usePathname();
  const router = useRouter();

  if (admin === undefined) return null;

  if (!admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-4 text-bone font-sans">
        <div className="w-full max-w-sm rounded-lg border border-line bg-ink-2 p-6 text-center shadow-2xl">
          <h1 className="font-display text-3xl tracking-wide text-gold">ADMIN ONLY</h1>
          <p className="mt-2 text-sm text-muted">Sign in with an account that has admin access to continue.</p>
          <Link href="/login" className="mt-6 block w-full bg-gold py-3 font-display tracking-[0.1em] text-ink hover:bg-gold-2">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const unread = db?.notifications.filter((n) => n.status === "queued").length || 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ink text-bone font-sans">
      <header className="flex items-center justify-between border-b border-line bg-ink-2 px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="font-display text-xl tracking-widest text-gold">
            VERDICT ADMIN
          </Link>
          <nav className="flex items-center gap-1 text-sm text-muted">
            {[
              ["/admin", "Overview"],
              ["/admin/regs", "Registrations"],
              ["/admin/pay", "Payments"],
              ["/admin/battles", "Battles"],
            ].map(([p, l]) => (
              <Link key={p} href={p} className={`rounded px-3 py-1.5 hover:bg-white/5 ${path === p ? "text-bone bg-white/10" : ""}`}>
                {l}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (unread > 0) flushNotifications();
            }}
            className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${unread > 0 ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30" : "text-muted hover:bg-white/5"}`}
          >
            {unread > 0 ? `Flush ${unread} notifications` : "Notifications synced"}
          </button>
          <button onClick={async () => { await signOut(); router.push("/login"); }} className="text-sm text-muted hover:text-bone">
            Sign out
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
