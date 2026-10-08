"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Button, PayBadge, fmtDate, rupee } from "@/components/ui";
import { canSeeRole, portfolioName, useScreenshotUrl } from "@/lib/api";
import { useDB } from "@/lib/store";
import type { Registration } from "@/lib/types";

function exportPdf(rows: Record<string, string | number | undefined>[]) {
  const w = window.open("", "_blank", "width=1200,height=800");
  if (!w) return;
  const headers = Object.keys(rows[0] || { ID: "", Battle: "", Team: "", Leader: "", Payment: "" });
  const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c] || c));
  w.document.write(`<!doctype html><html><head><title>VERDICT Registrations</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}table{border-collapse:collapse;width:100%;font-size:10px}th,td{border:1px solid #bbb;padding:6px;vertical-align:top}th{background:#eee}h1{margin-bottom:4px}p{color:#555}</style></head><body><h1>VERDICT Registrations</h1><p>${rows.length} records · ${new Date().toLocaleString()}</p><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${headers.map(h=>`<td>${esc(r[h])}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

export default function RegistrationsAdmin() {
  const db = useDB();
  const [filterB, setFilterB] = useState("all");
  const [filterP, setFilterP] = useState("all");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Registration | null>(null);

  const filtered = useMemo(() => {
    if (!db) return [];
    const q = search.toLowerCase();
    return db.registrations.filter((r) => {
      if (filterB !== "all" && r.battleId !== filterB) return false;
      if (filterP !== "all" && r.payment.status !== filterP) return false;
      if (q) {
        if (r.id.toLowerCase().includes(q)) return true;
        if (r.teamName?.toLowerCase().includes(q)) return true;
        if (r.members.some((m) => m.name.toLowerCase().includes(q) || m.usn.toLowerCase().includes(q))) return true;
        return false;
      }
      return true;
    });
  }, [db, filterB, filterP, search]);

  if (!db) return null;

  const exportRows = () => filtered.map((r) => {
      const b = db.battles.find((x) => x.id === r.battleId);
      const m1 = r.members[0];
      return {
        ID: r.id,
        Battle: b?.name,
        "Team Name": r.teamName || "-",
        Leader: m1.name,
        "Leader USN": m1.usn,
        "Leader Branch": m1.branch,
        "Leader Phone": m1.phone,
        Members: r.members.map((m) => `${m.name} (${m.usn})`).join(", "),
        Fee: r.fee,
        Payment: r.payment.status,
        UTR: r.payment.utr || "",
        AssignedRole: r.assignment ? portfolioName(db, r.assignment.portfolioId) : "None",
        AssignedMethod: r.assignment?.method || "-",
        Revealed: canSeeRole(db, r) ? "Yes" : "No",
        Date: fmtDate(r.createdAt),
      };
    });

  const exportExcel = () => {
    const data = exportRows();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registrations");
    XLSX.writeFile(wb, `VERDICT_Registrations_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const printPdf = () => exportPdf(exportRows());

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-3xl tracking-wide">Registrations ({filtered.length})</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={printPdf}>Export PDF</Button>
            <Button size="sm" onClick={exportExcel}>Export Excel</Button>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <input
            placeholder="Search ID, name, USN, team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-line bg-ink-2 p-2 text-sm text-bone placeholder:text-muted"
          />
          <select value={filterB} onChange={(e) => setFilterB(e.target.value)} className="border border-line bg-ink-2 p-2 text-sm text-bone">
            <option value="all">All Battles</option>
            {db.battles.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={filterP} onChange={(e) => setFilterP(e.target.value)} className="border border-line bg-ink-2 p-2 text-sm text-bone">
            <option value="all">All Payments</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="not_submitted">Not Submitted</option>
          </select>
        </div>

        <div className="flex-1 overflow-auto border border-line bg-ink-2">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-ink-3 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="p-3">ID / Battle</th>
                <th className="p-3">Primary / Team</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Role Assigned</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((r) => {
                const b = db.battles.find((x) => x.id === r.battleId)!;
                return (
                  <tr key={r.id} className="hover:bg-white/5">
                    <td className="p-3">
                      <div className="font-mono text-bone">{r.id}</div>
                      <div className="text-xs text-muted">{b.name}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-bone">{r.members[0].name} {r.teamName ? `(${r.teamName})` : ""}</div>
                      <div className="text-xs text-muted">{r.members[0].usn} · {r.members[0].branch}</div>
                    </td>
                    <td className="p-3"><PayBadge status={r.payment.status} /></td>
                    <td className="p-3 text-muted">
                      {r.assignment ? portfolioName(db, r.assignment.portfolioId) : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => setDetail(r)} className="text-gold hover:underline">View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <div className="w-96 border-l border-line bg-ink-2 flex flex-col overflow-y-auto shrink-0">
          <div className="flex justify-between items-center p-4 border-b border-line bg-ink-3 sticky top-0">
            <div className="font-mono text-lg">{detail.id}</div>
            <button onClick={() => setDetail(null)} className="text-muted hover:text-bone text-2xl leading-none">&times;</button>
          </div>
          <div className="p-4 space-y-6 text-sm">
            <div>
              <div className="text-xs text-muted uppercase tracking-wider mb-2">Members</div>
              {detail.members.map(m => (
                <div key={m.usn} className="mb-2 bg-ink p-3 border border-line">
                  <div className="font-semibold text-bone">{m.name}</div>
                  <div className="text-muted mt-1">{m.usn} · {m.branch} · {m.year}</div>
                  <div className="text-muted mt-0.5">{m.email} · {m.phone}</div>
                </div>
              ))}
            </div>
            
            <div className="bg-ink p-3 border border-line space-y-2">
              <div className="text-xs text-muted uppercase tracking-wider mb-1">Preferences</div>
              {detail.preferences.map((p, i) => (
                <div key={p}>{i + 1}. {portfolioName(db, p)}</div>
              ))}
            </div>

            <div className="bg-ink p-3 border border-line space-y-2">
              <div className="text-xs text-muted uppercase tracking-wider mb-1">Payment Info</div>
              <div>Status: {detail.payment.status}</div>
              <div>Fee: {rupee(detail.fee)}</div>
              {detail.payment.utr && <div>UTR: <span className="font-mono">{detail.payment.utr}</span></div>}
              <ShotLink path={detail.payment.screenshot} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function ShotLink({ path }: { path?: string }) {
  const url = useScreenshotUrl(path);
  if (!path || !url) return null;
  return <a href={url} target="_blank" rel="noreferrer" className="text-gold underline">View Screenshot</a>;
}
