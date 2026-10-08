"use client";

import { useState } from "react";
import { Button, Input, rupee } from "@/components/ui";
import { rejectPayment, verifyPayment } from "@/lib/api";
import { useDB } from "@/lib/store";

export default function PaymentsAdmin() {
  const db = useDB();
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState<string | null>(null);

  if (!db) return null;
  const pending = db.registrations.filter((r) => r.payment.status === "pending").sort((a, b) => (a.payment.submittedAt! > b.payment.submittedAt! ? 1 : -1));

  return (
    <div className="p-6 h-full flex flex-col">
      <h2 className="font-display text-3xl tracking-wide mb-6">Payment Verification Queue</h2>
      
      {pending.length === 0 ? (
        <div className="flex-1 flex items-center justify-center border border-line bg-ink-2 text-muted">
          No pending payments to review.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pending.map((r) => (
            <div key={r.id} className="border border-line bg-ink-2 flex flex-col">
              <div className="p-4 border-b border-line">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-mono text-lg text-bone">{r.id}</div>
                    <div className="text-sm text-muted">{db.battles.find(b => b.id === r.battleId)?.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl text-gold">{rupee(r.fee)}</div>
                    <div className="text-xs text-muted">UTR: <span className="font-mono text-bone">{r.payment.utr}</span></div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-muted">By {r.members[0].name} ({r.members[0].phone})</div>
              </div>
              
              <div className="bg-ink p-4 flex justify-center items-center h-64 border-b border-line">
                {r.payment.screenshot ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.payment.screenshot} alt="Screenshot" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-muted">No screenshot</span>
                )}
              </div>

              <div className="p-4 mt-auto">
                {rejecting === r.id ? (
                  <div className="space-y-3">
                    <Input 
                      placeholder="Reason for rejection" 
                      value={rejectReason} 
                      onChange={e => setRejectReason(e.target.value)} 
                      autoFocus 
                    />
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setRejecting(null); setRejectReason(""); }}>Cancel</Button>
                      <Button variant="danger" size="sm" disabled={!rejectReason.trim()} onClick={async () => {
                        await rejectPayment(r.id, rejectReason);
                        setRejecting(null);
                        setRejectReason("");
                      }}>Confirm Reject</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button className="flex-1" size="sm" variant="outline" onClick={() => verifyPayment(r.id)}>Verify</Button>
                    <Button className="flex-1" size="sm" variant="ghost" onClick={() => setRejecting(r.id)}>Reject...</Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
