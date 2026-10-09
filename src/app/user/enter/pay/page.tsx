"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { Suspense, useEffect, useRef, useState } from "react";
import { Button, ErrorNote, FullLoader, Input, PayBadge, rupee } from "@/components/ui";
import { UTR_RE, confirmFreeRegistration, quoteFee, submitPayment } from "@/lib/api";
import { draftStore, useDB, useDraft } from "@/lib/store";

export default function PayPage() {
  return (
    <Suspense fallback={<FullLoader />}>
      <Pay />
    </Suspense>
  );
}

/** Downscale an image file to a JPEG data URL so it fits the mock store. */
async function compress(file: File, max = 1000): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.72);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function Pay() {
  const db = useDB();
  const draft = useDraft();
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id") ?? draft?.registrationId;
  const reg = db?.registrations.find((r) => r.id === id);
  const battle = db?.battles.find((b) => b.id === reg?.battleId);

  const [qr, setQr] = useState("");
  const [utr, setUtr] = useState("");
  const [shot, setShot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [resubmit, setResubmit] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upi = db && reg ? `upi://pay?pa=${encodeURIComponent(db.settings.upiId)}&pn=${encodeURIComponent(db.settings.payeeName)}&am=${reg.fee}&cu=INR&tn=${reg.id}` : "";
  useEffect(() => {
    if (upi && reg && reg.fee > 0) QRCode.toDataURL(upi, { margin: 1, width: 480, color: { dark: "#060509", light: "#ffffff" } }).then(setQr);
  }, [upi]);

  const isFree = !!reg && reg.fee === 0;
  const needsConfirm = isFree && reg.payment.status === "not_submitted";
  const confirming = useRef(false);

  // Free entry: no payment step — confirm the registration straight away.
  useEffect(() => {
    if (!reg || !needsConfirm || confirming.current) return;
    confirming.current = true;
    setBusy(true);
    setError("");
    confirmFreeRegistration(reg.id)
      .catch((err) => setError((err as Error).message))
      .finally(() => {
        setBusy(false);
        confirming.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reg?.id, needsConfirm]);

  if (!db || !draft) return <FullLoader />;
  if (!reg || !battle)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-muted">No registration found to pay for.</p>
        <Link href="/user/enter/battle" className="font-display text-xl tracking-widest text-gold">
          ← Start registration
        </Link>
      </div>
    );

  const quote = quoteFee(battle, reg.members.map((m) => m.branch));
  const st = reg.payment.status;
  const showForm = !isFree && (st === "not_submitted" || (st === "rejected" && resubmit));

  const onFile = async (f?: File) => {
    setError("");
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("Upload an image (PNG/JPG).");
    if (f.size > 8 * 1024 * 1024) return setError("Image must be under 8 MB.");
    setShot(await compress(f));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (isFree) return;
    if (!UTR_RE.test(utr.trim())) return setError("Enter a valid UTR / transaction ID (10–22 letters or digits).");
    if (!shot) return setError("Attach your payment screenshot.");
    setBusy(true);
    try {
      await submitPayment(reg.id, utr, shot);
      setResubmit(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(reg.teamCode!);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-8 md:py-12">
      <p className="font-serif text-xs tracking-[0.5em]" style={{ color: battle.accent }}>
        STAGE 04 · {battle.name.toUpperCase()}
      </p>
      <h1 className="mt-1 font-display text-5xl tracking-wide md:text-6xl">Secure Your Entry</h1>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="text-muted">
          Registration <span className="font-mono text-bone">{reg.id}</span>
        </span>
        <PayBadge status={st} />
      </div>

      {reg.teamCode && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass mt-6 flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] tracking-[0.25em] text-muted uppercase">Team code · {reg.teamName}</div>
            <div className="font-display text-4xl tracking-[0.2em]" style={{ color: battle.accent2 }}>
              {reg.teamCode}
            </div>
            <div className="text-xs text-muted">Teammates sign in and enter this code to follow your team&apos;s status and reveal.</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyCode}>
              {copied ? "Copied ✓" : "Copy"}
            </Button>
            <a
              className="inline-flex items-center border border-emerald-500/50 px-3 py-1.5 font-display text-sm tracking-[0.18em] text-emerald-400 hover:bg-emerald-500/10"
              target="_blank"
              rel="noreferrer"
              href={`https://wa.me/?text=${encodeURIComponent(`We're in THE VERDICT — ${battle.name}! Join our team "${reg.teamName}" with code ${reg.teamCode} at ${typeof window !== "undefined" ? window.location.origin : ""}/user/join`)}`}
            >
              Share
            </a>
          </div>
        </motion.div>
      )}

      {!showForm ? (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass mt-8 p-8 text-center md:p-12">
          {st === "pending" && (
            <>
              <motion.div
                className="mx-auto h-16 w-16 rounded-full border-2 border-amber-300/30 border-t-amber-300"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
              />
              <h2 className="mt-6 font-display text-4xl tracking-wide text-amber-200">Payment verification pending</h2>
              <p className="mx-auto mt-2 max-w-md text-muted">
                We&apos;ve received UTR <span className="font-mono text-bone">{reg.payment.utr}</span>. The event team will verify it shortly — you&apos;ll get an email and WhatsApp once it&apos;s confirmed.
              </p>
            </>
          )}
          {needsConfirm && (
            <>
              {busy ? (
                <>
                  <motion.div
                    className="mx-auto h-16 w-16 rounded-full border-2 border-emerald-300/30 border-t-emerald-300"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  />
                  <h2 className="mt-6 font-display text-4xl tracking-wide text-emerald-200">Confirming your entry…</h2>
                  <p className="mt-2 text-muted">This entry is free — no payment needed.</p>
                </>
              ) : (
                <>
                  <ErrorNote>{error}</ErrorNote>
                  <Button
                    className="mt-4"
                    onClick={() => {
                      setBusy(true);
                      setError("");
                      confirmFreeRegistration(reg.id)
                        .catch((err) => setError((err as Error).message))
                        .finally(() => setBusy(false));
                    }}
                  >
                    Confirm entry
                  </Button>
                </>
              )}
            </>
          )}
          {st === "verified" && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-3xl text-emerald-300">✓</div>
              <h2 className="mt-6 font-display text-4xl tracking-wide text-emerald-200">Entry secured</h2>
              <p className="mt-2 text-muted">
                {isFree ? "No payment was required for this entry. You're in — await the verdict." : "Your payment is verified. Await the verdict."}
              </p>
            </>
          )}
          {st === "rejected" && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-crimson/15 text-3xl text-red-400">!</div>
              <h2 className="mt-6 font-display text-4xl tracking-wide text-red-300">Payment rejected</h2>
              <p className="mt-2 text-muted">Reason: {reg.payment.rejectReason}</p>
              <Button className="mt-6" onClick={() => setResubmit(true)}>
                Re-submit payment
              </Button>
            </>
          )}
          <div className={needsConfirm ? "hidden" : "mt-8"}>
            <Button
              variant="outline"
              onClick={() => {
                draftStore.set({});
                router.push("/user/dashboard");
              }}
            >
              Go to dashboard →
            </Button>
          </div>
        </motion.div>
      ) : (
        <form onSubmit={submit} className="mt-8 grid gap-6 md:grid-cols-[1fr_1.1fr]">
          {/* QR side */}
          <div className="glass flex flex-col items-center p-6 text-center">
            <div className="text-[11px] tracking-[0.25em] text-muted uppercase">Amount payable</div>
            <div className="font-display text-6xl" style={{ color: battle.accent2 }}>
              {rupee(reg.fee)}
            </div>
            <div className="mt-1 space-y-0.5 text-xs text-muted">
              {quote.perTeam ? (
                <div>Team fee · {rupee(quote.total)} per team</div>
              ) : (
                quote.lines.map((l, i) => (
                  <div key={i}>
                    {reg.members[i].name.split(" ")[0]} · {l.branch} · {rupee(l.amount)}
                  </div>
                ))
              )}
            </div>
            <div className="relative mt-5 bg-white p-3">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="UPI QR code" className="h-56 w-56" />
              ) : (
                <div className="h-56 w-56 animate-pulse bg-neutral-200" />
              )}
            </div>
            {!db.settings.upiId && <ErrorNote>Payment details aren&apos;t configured yet. Please contact the event team.</ErrorNote>}
            <div className="mt-3 font-mono text-sm text-bone">{db.settings.upiId}</div>
            <div className="text-xs text-muted">{db.settings.payeeName}</div>
            <a href={upi} className="mt-4 inline-flex border border-gold/50 px-4 py-2 font-display tracking-[0.18em] text-gold hover:bg-gold/10 md:hidden">
              Open UPI app
            </a>
            <p className="mt-4 text-xs text-muted">Scan with GPay / PhonePe / Paytm. Pay the exact amount. Add <span className="text-bone">{reg.id}</span> in the note.</p>
          </div>

          {/* proof side */}
          <div className="glass flex flex-col gap-5 p-6">
            <h2 className="font-display text-3xl tracking-wide">Submit proof</h2>
            {st === "rejected" && <ErrorNote>Previous submission rejected: {reg.payment.rejectReason}</ErrorNote>}
            <Input label="UTR / Transaction ID" placeholder="12-digit UPI reference" value={utr} onChange={(e) => setUtr(e.target.value.replace(/\s/g, ""))} maxLength={22} />
            <div>
              <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.2em] text-muted uppercase">Payment screenshot</span>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  onFile(e.dataTransfer.files?.[0]);
                }}
                className="flex min-h-[180px] w-full flex-col items-center justify-center gap-2 border border-dashed border-white/15 bg-ink-2 p-4 text-sm text-muted transition hover:border-gold/50"
              >
                {shot ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shot} alt="Payment screenshot preview" className="max-h-64 object-contain" />
                ) : (
                  <>
                    <span className="text-3xl">⇪</span>
                    <span>Tap to upload or drop screenshot</span>
                  </>
                )}
              </button>
              {shot && (
                <button type="button" className="mt-1 text-xs text-muted hover:text-crimson" onClick={() => setShot("")}>
                  Remove
                </button>
              )}
            </div>
            <ErrorNote>{error}</ErrorNote>
            <Button size="lg" loading={busy} className="mt-auto">
              Submit for verification
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
