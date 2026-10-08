"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import type { PaymentStatus } from "@/lib/types";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "gold" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

export function Button({ variant = "gold", size = "md", loading, className, children, disabled, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        "relative inline-flex items-center justify-center gap-2 font-display tracking-[0.18em] uppercase transition-all duration-200 select-none",
        "disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer",
        size === "sm" && "text-sm px-3 py-1.5",
        size === "md" && "text-lg px-5 py-2.5",
        size === "lg" && "text-xl md:text-2xl px-8 py-4",
        variant === "gold" &&
          "bg-gradient-to-b from-gold-2 to-gold text-ink hover:brightness-110 shadow-[0_0_30px_-8px_var(--gold)] active:scale-[0.98]",
        variant === "ghost" && "text-bone/80 hover:text-bone hover:bg-white/5",
        variant === "outline" && "border border-gold/50 text-gold hover:bg-gold/10",
        variant === "danger" && "bg-crimson text-white hover:brightness-110",
        className,
      )}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return <span className={cx("inline-block animate-spin rounded-full border-2 border-current border-t-transparent", className)} />;
}

export function FullLoader() {
  return (
    <div className="flex flex-1 items-center justify-center py-32 text-gold">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.2em] text-muted uppercase">{children}</span>;
}

const fieldBase =
  "w-full bg-ink-2 border border-line px-3.5 py-2.5 text-bone placeholder:text-muted/60 outline-none transition focus:border-gold/70 focus:shadow-[0_0_0_3px_rgba(217,180,90,0.12)]";

export function Input({ label, error, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <label className={cx("block", className)}>
      {label && <Label>{label}</Label>}
      <input {...rest} className={cx(fieldBase, error && "border-crimson/80")} />
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}

export function Select({
  label,
  error,
  options,
  placeholder,
  className,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string; options: readonly string[]; placeholder?: string }) {
  return (
    <label className={cx("block", className)}>
      {label && <Label>{label}</Label>}
      <select {...rest} className={cx(fieldBase, "appearance-none", error && "border-crimson/80")}>
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}

export function Modal({ open, onClose, children, wide }: { open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
            className={cx("glass relative max-h-[90vh] w-full overflow-y-auto bg-ink-2/95 p-6", wide ? "max-w-4xl" : "max-w-md")}
          >
            <button onClick={onClose} className="absolute top-3 right-4 text-2xl text-muted hover:text-bone" aria-label="Close">
              ×
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const PAY: Record<PaymentStatus, { label: string; cls: string }> = {
  not_submitted: { label: "Awaiting payment", cls: "text-muted border-muted/40" },
  pending: { label: "Verification pending", cls: "text-amber-300 border-amber-300/40 bg-amber-300/5" },
  verified: { label: "Verified", cls: "text-emerald-300 border-emerald-300/40 bg-emerald-300/5" },
  rejected: { label: "Rejected", cls: "text-red-400 border-red-400/40 bg-red-400/5" },
};

export function PayBadge({ status }: { status: PaymentStatus }) {
  const p = PAY[status];
  return <span className={cx("inline-flex items-center gap-1.5 border px-2 py-0.5 text-[11px] font-semibold tracking-wider uppercase", p.cls)}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {p.label}
  </span>;
}

export function Badge({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center border px-2 py-0.5 text-[11px] font-semibold tracking-wider uppercase"
      style={{ color: color ?? "var(--gold)", borderColor: `${color ?? "#d9b45a"}66` }}
    >
      {children}
    </span>
  );
}

export function Brand({ small }: { small?: boolean }) {
  return (
    <Link href="/user" className="group flex flex-col leading-none">
      <span className="font-serif text-[9px] tracking-[0.45em] text-muted group-hover:text-gold">VISTA PRESENTS</span>
      <span className={cx("font-display tracking-[0.12em] text-gold-grad", small ? "text-xl" : "text-2xl")}>THE VERDICT</span>
    </Link>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="border-l-2 border-crimson bg-crimson/10 px-3 py-2 text-sm text-red-300">
      {children}
    </motion.p>
  );
}

export const rupee = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function LockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="11" width="16" height="10" rx="1" />
      <path d="M8 11V7a4 4 0 118 0v4" />
    </svg>
  );
}
export const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
