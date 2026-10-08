"use client";

import Link from "next/link";
import * as XLSX from "xlsx";
import { Button, PayBadge, rupee } from "@/components/ui";
import { useDB } from "@/lib/store";

function exportPdf(title: string, html: string) {
  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${title}</title><style>
    body{font-family:Arial,sans-serif;color:#111;padding:28px} h1{margin:0 0 8px} p{color:#555}
    table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px} th,td{border:1px solid #ccc;padding:8px;text-align:left} th{background:#f3f3f3}
    .summary{display:flex;gap:24px;margin:18px 0}.summary div{border:1px solid #ddd;padding:12px 16px}
  </style></head><body>${html}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

export default function AdminOverview() {
  const db = useDB();
  if (!db) return null;

  const total = db.registrations.length;
  const verified = db.registrations.filter((r) => r.payment.status === "verified").length;
  const pending = db.registrations.filter((r) => r.payment.status === "pending").length;
  const revenue = db.registrations.filter((r) => r.payment.status === "verified").reduce((s, r) => s + r.fee, 0);

  const rows = db.battles.map((b) => {
    const regs = db.registrations.filter((r) => r.battleId === b.id);
    const teams = regs.filter((r) => r.teamName).length;
    const people = regs.reduce((s, r) => s + r.members.length, 0);
    const paid = regs.filter((r) => r.payment.status === "verified");
    return { b, regs, teams, people, paid, revenue: paid.reduce((s, r) => s + r.fee, 0) };
  });

  const exportExcel = () => {
    const data = rows.map(({ b, regs, teams, people, paid, revenue }) => ({
      Event: b.name,
      Mode: b.mode,
      Registrations: regs.length,
      Teams: teams,
      Participants: people,
      Verified: paid.length,
      Pending: regs.filter((r) => r.payment.status === "pending").length,
      Rejected: regs.filter((r) => r.payment.status === "rejected").length,
      Capacity: b.capacity,
      "Registration Open": b.isOpen ? "Yes" : "No",
      "Verified Revenue": revenue,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Event Summary");
    XLSX.writeFile(wb, `VERDICT_Admin_Summary_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const printPdf = () => exportPdf("VERDICT Admin Summary", `
    <h1>VERDICT — Admin Summary</h1><p>Generated ${new Date().toLocaleString()}</p>
    <div class="summary"><div><b>${total}</b><br/>Registrations</div><div><b>${verified}</b><br/>Verified</div><div><b>${pending}</b><br/>Pending</div><div><b>${rupee(revenue)}</b><br/>Verified Revenue</div></div>
    <table><thead><tr><th>Event</th><th>Mode</th><th>Registrations</th><th>Teams</th><th>Participants</th><th>Verified</th><th>Pending</th><th>Revenue</th></tr></thead><tbody>
    ${rows.map(({b,regs,teams,people,paid,revenue}) => `<tr><td>${b.name}</td><td>${b.mode}</td><td>${regs.length}</td><td>${teams}</td><td>${people}</td><td>${paid.length}</td><td>${regs.filter(r=>r.payment.status==='pending').length}</td><td>₹${revenue}</td></tr>`).join("")}
    </tbody></table>`);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs uppercase tracking-[.25em] text-muted">Control centre</p><h1 className="font-display text-4xl tracking-wide">Admin Overview</h1></div>
        <div className="flex gap-2"><Button size="sm" variant="outline" onClick={printPdf}>Export PDF</Button><Button size="sm" onClick={exportExcel}>Export Excel</Button></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[['Total registrations', total], ['Payment verified', verified], ['Pending review', pending], ['Verified revenue', rupee(revenue)]].map(([label, value]) => (
          <div key={String(label)} className="border border-line bg-ink-2 p-5"><div className="text-xs uppercase tracking-wider text-muted">{label}</div><div className="mt-2 font-display text-4xl text-gold">{value}</div></div>
        ))}
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-2xl">Events</h2><Link href="/admin/battles" className="text-sm text-gold hover:underline">Manage events & roles →</Link></div>
        <div className="overflow-auto border border-line bg-ink-2">
          <table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-ink-3 text-xs uppercase tracking-wider text-muted"><tr><th className="p-3">Event</th><th className="p-3">Registrations</th><th className="p-3">Teams / people</th><th className="p-3">Payments</th><th className="p-3">Capacity</th><th className="p-3">Revenue</th><th className="p-3">Status</th></tr></thead>
          <tbody className="divide-y divide-line">{rows.map(({ b, regs, teams, people, paid, revenue }) => <tr key={b.id} className="hover:bg-white/5"><td className="p-3"><div className="font-semibold text-bone">{b.name}</div><div className="text-xs text-muted">{b.mode}</div></td><td className="p-3 text-bone">{regs.length}</td><td className="p-3 text-muted">{teams} teams · {people} people</td><td className="p-3"><div className="flex flex-wrap gap-1"><span className="text-emerald-300">{paid.length} verified</span><span className="text-muted">· {regs.filter(r=>r.payment.status==='pending').length} pending</span></div></td><td className="p-3 text-muted">{regs.length}/{b.capacity}</td><td className="p-3 text-gold">{rupee(revenue)}</td><td className="p-3"><span className={b.isOpen ? 'text-emerald-300' : 'text-amber-300'}>{b.isOpen ? 'Open' : 'Closed'}</span></td></tr>)}</tbody></table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Link href="/admin/pay" className="border border-line bg-ink-2 p-5 transition hover:border-gold/40"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wider text-muted">Payments</p><h3 className="mt-1 font-display text-2xl">Review verification queue</h3></div><PayBadge status={pending ? 'pending' : 'verified'} /></div><p className="mt-3 text-sm text-muted">{pending} payment{pending === 1 ? '' : 's'} waiting for admin confirmation.</p></Link>
        <Link href="/admin/regs" className="border border-line bg-ink-2 p-5 transition hover:border-gold/40"><p className="text-xs uppercase tracking-wider text-muted">Registrations</p><h3 className="mt-1 font-display text-2xl">View every team and participant</h3><p className="mt-3 text-sm text-muted">Search by registration ID, team, name or USN and inspect complete registration details.</p></Link>
      </section>
    </div>
  );
}
