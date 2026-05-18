"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

type Completion = {
  period: string;
  rows: { 
    employee: { name: string }; 
    employeeCheckInDone: boolean;
    goals: { target: string; actual: string; weightPct: number }[]; 
  }[];
};
const [loading, setLoading] = useState(true);
export default function AdminReportsPage() {
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [period, setPeriod] = useState("Q1");

 useEffect(() => {
  void (async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/completion?period=${period}`);
      const data = await res.json();
      if (res.ok) setCompletion(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  })();
}, [period]);

  const stats = useMemo(() => {
    if (!completion || completion.rows.length === 0) return null;

    const total = completion.rows.length;
    const done = completion.rows.filter(r => r.employeeCheckInDone).length;
    const percentage = Math.round((done / total) * 100);
    const pending = total - done;

    const validRows = completion.rows.filter(row => row.goals && row.goals.length > 0);
  
  let totalPossibleWeight = 0;
  let totalAchievedWeight = 0;
  let topEmployee = { name: "N/A", score: -1 };

  validRows.forEach((row) => {
    let employeeScore = 0;

    row.goals.forEach((goal: any) => {
      const target = parseFloat(goal.target) || 0;
      const weight = parseFloat(goal.weightPct) || 0;
      
      // Get the actual value from the first update in the array
      const actualValue = goal.updates?.[0]?.actual;
      const actual = parseFloat(actualValue) || 0;

      if (target > 0) {
        // Logic: actual / target
        const ratio = Math.min(actual / target, 1.2); 
        const weighted = ratio * weight;
        
        totalAchievedWeight += weighted;
        totalPossibleWeight += weight;
        employeeScore += weighted;
      }
    });

    if (employeeScore > topEmployee.score) {
      topEmployee = { name: row.employee.name, score: employeeScore };
    }
  });

  const totalAchievementPct = totalPossibleWeight > 0 
    ? Math.round((totalAchievedWeight / totalPossibleWeight) * 100) 
    : 0;
    return { 
      total, 
      done, 
      percentage, 
      pending, 
      totalAchievementPct,
      topName: topEmployee.name 
    };
  }, [completion]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
        >
          <span>🏠</span>
          <span>Admin Home</span>
        </Link>
      </div>

      {stats && (
        <>
          {/* Top Cards: Completion Rate & Export */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Completion Rate ({period})</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-slate-900">{stats.percentage}%</span>
                  <span className="text-sm text-slate-500">of reviews captured</span>
                </div>
                <div className="flex gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                    <span className="text-xs text-slate-600">{stats.done} Done</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-slate-200"></span>
                    <span className="text-xs text-slate-600">{stats.pending} Pending</span>
                  </div>
                </div>
              </div>
              <div className="relative h-24 w-24">
                <svg className="h-full w-full" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-100" strokeWidth="3"></circle>
                  <circle
                    cx="18" cy="18" r="16" fill="none"
                    className="stroke-emerald-500 transition-all duration-1000 ease-out"
                    strokeWidth="3"
                    strokeDasharray={`${stats.percentage}, 100`}
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                  ></circle>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
                  {stats.percentage}%
                </div>
              </div>
            </div>
            
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-center gap-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">Export Data (target vs actual achieved)</p>
              <a className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 transition" href={`/api/reports/achievement?format=csv&period=${period}`}>📥 CSV</a>
              <a className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition" href={`/api/reports/achievement?format=xlsx&period=${period}`}>📄 Excel</a>
            </div>
            
          </div>

          {/* Org Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Achievement</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.totalAchievementPct}%</p>
              <div className="w-full bg-slate-100 h-1.5 mt-3 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full transition-all duration-1000" style={{ width: `${stats.totalAchievementPct}%` }}></div>
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Highest Performer</p>
              <p className="text-lg font-bold text-slate-900 mt-1 truncate">{stats.topName}</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">🏆 Top Contributor</p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Pending Sheets</p>
              <p className="text-2xl font-bold text-rose-600 mt-1">{stats.pending}</p>
              <p className="text-xs text-slate-400 mt-1">Needs Manager Action</p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Active Cycle</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{period}</p>
              <p className="text-xs text-slate-400 mt-1">FY 2026</p>
            </div>
          </div>

          {/* Gap Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 uppercase mb-8 tracking-tight">Performance Trend: {period}</h3>
            <div className="flex items-end justify-around gap-8 h-48 w-full border-b border-slate-100 relative">
              <div className="absolute top-0 left-0 w-full border-t border-slate-100 border-dashed"></div>
              {["Q1", "Q2", "Q3", "Q4"].map((q) => {
                const isSelected = q === period;
                const h = isSelected ? stats.totalAchievementPct : 0;
                return (
                  <div key={q} className="flex-1 flex flex-col items-center group max-w-[100px] h-full justify-end">
                    <div className="relative w-full flex items-end justify-center h-full bg-slate-50/30">
                      <div className={`w-full rounded-t transition-all duration-700 ${isSelected ? 'bg-indigo-500 shadow-lg' : 'bg-slate-200'}`} style={{ height: `${h}%` }}></div>
                    </div>
                    <span className={`mt-3 text-xs font-bold ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>{q}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Detail Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4 px-2">
          <label className="text-sm font-semibold text-slate-700">Employee Feedback Status</label>
          <select
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {["Q1", "Q2", "Q3", "Q4"].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {!completion ? (
          <div className="animate-pulse space-y-3 p-4">
            <div className="h-4 bg-slate-100 rounded w-3/4"></div>
            <div className="h-4 bg-slate-100 rounded w-1/2"></div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-100">
            {completion.rows.map((r, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition">
                <span className="font-medium text-slate-700">{r.employee.name}</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${r.employeeCheckInDone ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${r.employeeCheckInDone ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                  {r.employeeCheckInDone ? "Review Done" : "Awaiting Manager"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}