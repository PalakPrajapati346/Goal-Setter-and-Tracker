"use client";
import Link from "next/link";
import { useEffect, useState,useMemo } from "react";

export default function AdminCyclePage() {
  const [cycles, setCycles] = useState([]);
  const [form, setForm] = useState({
    name: "",
    kind: "Q1",
    year: "2026",
    opensAt: "",
    closesAt: "",
  });
  const [loading, setLoading] = useState(false);

  const loadCycles = async () => {
    const res = await fetch("/api/admin/cycles");
    if (res.ok) setCycles(await res.json());
  };

  useEffect(() => { loadCycles(); }, []);
 // Inside AdminCyclePage component
const activeCycle = useMemo(() => {
  if (!cycles.length) return null;
  const now = new Date();
  
  return cycles.find(c => {
    const start = new Date(c.opensAt);
    const end = new Date(c.closesAt);
    return now >= start && now <= end;
  }) || cycles[0]; // Fallback to most recent if none are "open" today
}, [cycles]);

// Calculate days remaining for the active cycle
const daysLeft = useMemo(() => {
  if (!activeCycle) return 0;
  const diff = new Date(activeCycle.closesAt).getTime() - new Date().getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}, [activeCycle]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/admin/cycles", {
      method: "POST",
      body: JSON.stringify(form),
    });
    if (res.ok) {
      alert("Cycle Created!");
      setForm({ name: "", kind: "Q1", year: "2026", opensAt: "", closesAt: "" });
      loadCycles();
    }
    setLoading(false);
  };

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-8">
      <div className="flex items-center justify-between gap-3"><h1 className="text-2xl font-bold text-slate-900">Manage Review Cycles</h1>
      <h3><Link href="/admin" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700">
  <span>🏠</span>
  <span>Admin Home</span>
</Link></h3></div>
<div className={`relative overflow-hidden rounded-2xl p-8 text-white shadow-xl mb-8 transition-all duration-500 ${
  activeCycle ? 'bg-indigo-600' : 'bg-slate-800'
}`}>
  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${activeCycle ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`}></span>
        <span className="text-xs font-bold uppercase tracking-widest text-white/60">
          {activeCycle ? 'Current Active Cycle' : 'System on Standby'}
        </span>
      </div>
      
      <h1 className="text-3xl font-black tracking-tight">
        {activeCycle ? activeCycle.name : "No Active Cycle"}
      </h1>
      
      {activeCycle && (
        <div className="flex items-center gap-4 text-sm font-medium text-white/80">
          <div className="flex items-center gap-1.5">
            <span>📅</span>
            <span>Ends: {new Date(activeCycle.closesAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🕒</span>
            <span>{new Date(activeCycle.closesAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      )}
    </div>

    {activeCycle && (
      <div className="flex flex-col items-end gap-2">
        <div className="rounded-lg bg-white/10 px-6 py-3 backdrop-blur-md border border-white/10">
          <p className="text-[10px] font-bold uppercase text-white/60 text-right">Window Closing In</p>
          <p className="text-2xl font-black">{daysLeft} Days</p>
        </div>
      </div>
    )}
  </div>

  {/* Background glow effects */}
  <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
</div>
     
      <h1 className="text-2xl font-semibold">Create Cycle</h1>
      {/* CREATE FORM */}
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 rounded-xl border bg-white p-6 shadow-sm">
        <div className="col-span-2">
          <label className="text-xs font-bold uppercase text-slate-500">Cycle Name</label>
          <input 
            className="w-full mt-1 border rounded-lg p-2 text-sm" 
            placeholder="e.g. FY2026 Q4 Check-in" 
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
            required 
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-slate-500">Kind</label>
          <select className="w-full mt-1 border rounded-lg p-2 text-sm" value={form.kind} onChange={e => setForm({...form, kind: e.target.value})}>
            {["Q1", "Q2", "Q3", "Q4"].map(q => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-slate-500">Year</label>
          <input type="number" className="w-full mt-1 border rounded-lg p-2 text-sm" value={form.year} onChange={e => setForm({...form, year: e.target.value})} />
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-slate-500">Opens At</label>
          <input type="datetime-local" className="w-full mt-1 border rounded-lg p-2 text-sm" value={form.opensAt} onChange={e => setForm({...form, opensAt: e.target.value})} required />
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-slate-500">Closes At</label>
          <input type="datetime-local" className="w-full mt-1 border rounded-lg p-2 text-sm" value={form.closesAt} onChange={e => setForm({...form, closesAt: e.target.value})} required />
        </div>
        <button disabled={loading} className="col-span-2 mt-2 rounded-lg bg-slate-900 py-2 text-white font-bold hover:bg-slate-800">
          {loading ? "Saving..." : "Create Cycle"}
        </button>
      </form>

      {/* DISPLAY TABLE */}
      <h1 className="text-2xl font-semibold">Existing Cycles</h1>
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-[10px]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Kind/Year</th>
              <th className="px-4 py-3">Window</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cycles.map((c: any) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-slate-500">{c.kind} - {c.year}</td>
                <td className="px-4 py-3 text-[11px] text-slate-400">
                  {new Date(c.opensAt).toLocaleDateString()} to {new Date(c.closesAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
    </main>
  );
}