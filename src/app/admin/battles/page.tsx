"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { runAssignment } from "@/lib/assignment";
import { commitAssignment, deleteBattle, deletePortfolio, saveBattle, savePortfolio, setBattleReveal } from "@/lib/api";
import { useDB } from "@/lib/store";
import type { Battle, Portfolio } from "@/lib/types";

export default function BattlesAdmin() {
  const db = useDB();
  const [active, setActive] = useState<string | null>(null);

  if (!db) return null;
  const current = db.battles.find(b => b.id === active) || db.battles[0];
  if (!current && !active && db.battles.length > 0) setActive(db.battles[0].id);

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-line bg-ink-2 p-4 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-muted tracking-wider uppercase">Events</div>
          <button
            className="text-gold text-xs hover:underline"
            onClick={async () => {
              const n = db.battles.length + 1;
              const id = `event-${Date.now()}`;
              await saveBattle({ id, code: `EV${n}`, name: `New Event ${n}`, subtitle: "New competition", description: "Add event details here.", mode: "individual", teamMin: 1, teamMax: 1, capacity: 50, feeISE: 0, feeOther: 0, isOpen: false, accent: "#d4af37", accent2: "#f5d76e", image: "/battles/ipl.jpg", revealMode: "cinematic", revealed: false });
              setActive(id);
            }}
          >+ Add</button>
        </div>
        {db.battles.map(b => (
          <button 
            key={b.id} 
            onClick={() => setActive(b.id)}
            className={`text-left px-3 py-2 rounded text-sm ${active === b.id ? "bg-white/10 text-bone" : "text-muted hover:bg-white/5"}`}
          >
            {b.name}
          </button>
        ))}
      </div>
      
      <div className="flex-1 overflow-auto">
        {current && <BattleManager key={current.id} battle={current} />}
      </div>
    </div>
  );
}

function BattleManager({ battle }: { battle: Battle }) {
  const db = useDB()!;
  const [b, setB] = useState(battle);
  const pfs = db.portfolios.filter(p => p.battleId === battle.id);
  const regs = db.registrations.filter(r => r.battleId === battle.id);
  const verified = regs.filter(r => r.payment.status === "verified");
  const assigned = verified.filter(r => r.assignment);
  
  const [sim, setSim] = useState<ReturnType<typeof runAssignment> | null>(null);

  const saveB = () => saveBattle(b);
  const runSim = () => setSim(runAssignment(regs, pfs, Date.now(), { keepManual: true }));

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-12">
      <section>
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h2 className="font-display text-3xl">{b.name} Settings</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="danger" onClick={async () => {
              if (!window.confirm(`Delete ${b.name}? This is only allowed when no registrations exist.`)) return;
              try { await deleteBattle(b.id); } catch (e) { window.alert((e as Error).message); }
            }}>Delete Event</Button>
            <Button size="sm" onClick={saveB}>Save Settings</Button>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 bg-ink-2 p-6 border border-line">
          <Input label="Name" value={b.name} onChange={e => setB({...b, name: e.target.value})} />
          <Input label="Code" value={b.code} onChange={e => setB({...b, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5)})} />
          <Input label="Subtitle" value={b.subtitle} onChange={e => setB({...b, subtitle: e.target.value})} />
          <div>
            <label className="block mb-1.5 text-[11px] font-semibold tracking-[0.2em] text-muted uppercase">Mode</label>
            <select value={b.mode} onChange={e => setB({...b, mode: e.target.value as Battle["mode"]})} className="w-full bg-ink border border-line p-3 text-sm text-bone">
              <option value="individual">Individual</option><option value="team">Team</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block mb-1.5 text-[11px] font-semibold tracking-[0.2em] text-muted uppercase">Description</label>
            <textarea className="w-full bg-ink border border-line p-3 text-sm text-bone" rows={3} value={b.description} onChange={e => setB({...b, description: e.target.value})} />
          </div>
          <Input label="Capacity (Teams/Individuals)" type="number" value={b.capacity} onChange={e => setB({...b, capacity: parseInt(e.target.value) || 0})} />
          {b.mode === "team" && <>
            <Input label="Minimum Team Size" type="number" value={b.teamMin} onChange={e => setB({...b, teamMin: parseInt(e.target.value) || 1})} />
            <Input label="Maximum Team Size" type="number" value={b.teamMax} onChange={e => setB({...b, teamMax: parseInt(e.target.value) || 1})} />
          </>}
          <div className="flex items-center gap-4 pt-6">
            <label className="flex items-center gap-2 text-sm text-bone cursor-pointer">
              <input type="checkbox" checked={b.isOpen} onChange={e => setB({...b, isOpen: e.target.checked})} className="accent-gold" />
              Registration Open
            </label>
          </div>
          <Input label="Fee (ISE)" type="number" value={b.feeISE} onChange={e => setB({...b, feeISE: parseInt(e.target.value) || 0})} />
          <Input label="Fee (Other)" type="number" value={b.feeOther} onChange={e => setB({...b, feeOther: parseInt(e.target.value) || 0})} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl mb-4">Portfolios ({pfs.length})</h2>
        <div className="border border-line bg-ink-2">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-3 text-muted text-xs uppercase tracking-wider">
              <tr>
                <th className="p-3">Role</th>
                <th className="p-3 w-24">Slots</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pfs.map(p => <PfRow key={p.id} p={p} />)}
              <tr>
                <td colSpan={3} className="p-3 text-center">
                  <button className="text-gold text-sm hover:underline" onClick={() => savePortfolio({ id: `${battle.id}-new-${Date.now()}`, battleId: battle.id, name: "New Role", description: "", slots: 1 })}>+ Add Portfolio</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="border border-gold/30 bg-gold/5 p-6 space-y-6">
        <div>
          <h2 className="font-display text-2xl text-gold">Assignment Engine</h2>
          <p className="text-sm text-muted mt-1">Assigns verified registrations to roles based on preferences. {verified.length} verified players, {assigned.length} currently assigned.</p>
        </div>
        
        <div className="flex gap-4">
          <Button onClick={runSim}>Run Simulation (Dry Run)</Button>
          {sim && <Button variant="outline" onClick={async () => { await commitAssignment(battle.id, sim); setSim(null); }}>Commit Assignment</Button>}
        </div>

        {sim && (
          <div className="bg-ink p-4 border border-gold/20 text-sm">
            <div className="flex gap-6 mb-4 text-gold pb-4 border-b border-gold/10">
              <div>Total: {sim.stats.total}</div>
              <div>1st Choice: {sim.stats.first}</div>
              <div>2nd Choice: {sim.stats.second}</div>
              <div>3rd Choice: {sim.stats.third}</div>
              <div className={sim.stats.unassigned > 0 ? "text-red-400" : ""}>Unassigned: {sim.stats.unassigned}</div>
            </div>
            <div className="h-64 overflow-auto font-mono text-xs text-muted space-y-1">
              {sim.log.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          </div>
        )}
      </section>

      <section className="border border-blue-500/30 bg-blue-500/5 p-6">
        <h2 className="font-display text-2xl text-blue-400">Reveal Controls</h2>
        <p className="text-sm text-muted mt-1 mb-6">Control when participants can see their assigned roles on their dashboards.</p>
        
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="text-sm font-semibold text-bone mb-1">Status: {b.revealed ? <span className="text-emerald-400">Revealed</span> : <span className="text-amber-400">Sealed</span>}</div>
            <div className="text-xs text-muted">When revealed, assigned participants get an email/WhatsApp.</div>
          </div>
          {b.revealed ? (
            <Button variant="outline" onClick={() => setBattleReveal(b.id, false, "cinematic")}>Seal Roles</Button>
          ) : (
            <Button onClick={() => setBattleReveal(b.id, true, "cinematic")}>Reveal Now</Button>
          )}
        </div>
      </section>
    </div>
  );
}

function PfRow({ p }: { p: Portfolio }) {
  const [val, setVal] = useState(p);
  const [editing, setEditing] = useState(false);
  
  if (editing) {
    return (
      <tr className="bg-ink">
        <td className="p-2 space-y-2">
          <input value={val.name} onChange={e => setVal({...val, name: e.target.value})} className="w-full bg-ink-2 border border-line px-2 py-1" placeholder="Name" />
          <input value={val.description} onChange={e => setVal({...val, description: e.target.value})} className="w-full bg-ink-2 border border-line px-2 py-1 text-xs" placeholder="Description" />
        </td>
        <td className="p-2 align-top">
          <input type="number" value={val.slots} onChange={e => setVal({...val, slots: parseInt(e.target.value)||0})} className="w-full bg-ink-2 border border-line px-2 py-1" />
        </td>
        <td className="p-2 align-top text-right space-x-2">
          <button onClick={() => { savePortfolio(val); setEditing(false); }} className="text-emerald-400 hover:underline">Save</button>
          <button onClick={() => setEditing(false)} className="text-muted hover:underline">Cancel</button>
        </td>
      </tr>
    );
  }
  
  return (
    <tr className="hover:bg-white/5">
      <td className="p-3">
        <div className="text-bone">{p.name}</div>
        <div className="text-xs text-muted truncate max-w-sm">{p.description}</div>
      </td>
      <td className="p-3 text-muted">{p.slots}</td>
      <td className="p-3 text-right space-x-3">
        <button onClick={() => setEditing(true)} className="text-gold hover:underline">Edit</button>
        <button onClick={() => deletePortfolio(p.id)} className="text-red-400 hover:underline">Del</button>
      </td>
    </tr>
  );
}
