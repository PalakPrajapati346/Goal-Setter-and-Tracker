"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState ,useMemo} from "react";

type Sheet = {
  id: string;
  status: string;
  goals: { id: string; title: string; target: string; isPrimaryOwner: boolean; readOnlyTitleTarget: boolean }[];
};

const periods = ["Q1", "Q2", "Q3", "Q4"] as const;
const statuses = ["NOT_STARTED", "ON_TRACK", "COMPLETED"] as const;

export default function EmployeeQuarterlyPage() {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [period, setPeriod] = useState<(typeof periods)[number]>("Q1");
  const [values, setValues] = useState<Record<string, { actual: string; status: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [savedValues, setSavedValues] = useState<Record<string, { actual: string; target: string }>>({});
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/sheets/me?period=${period}`);
      if (!res.ok) return;
      const data = await res.json();
      setSheet(data);

      const initInputs: Record<string, { actual: string; status: string }> = {};
      const initSaved: Record<string, { actual: string; target: string }> = {};

      data.goals.forEach((g: any) => {
        // Find the update for the current period from the database
        const existingUpdate = g.updates?.find((u: any) => u.period === period);
        
        const actualVal = existingUpdate?.actual || "";
        
        initInputs[g.id] = { 
          actual: actualVal, 
          status: existingUpdate?.status || "NOT_STARTED" 
        };

        // Track what is actually saved in the DB for the metrics
        initSaved[g.id] = { 
          actual: actualVal, 
          target: g.target 
        };
      });

      setValues(initInputs);
      setSavedValues(initSaved);
    })();
  }, [period]); // Refetch whenever the period changes
  const savedMetrics = useMemo(() => {
    let totalTarget = 0;
    let totalActual = 0;

    Object.values(savedValues).forEach((item) => {
      totalTarget += parseFloat(item.target) || 0;
      totalActual += parseFloat(item.actual) || 0;
    });

    return {
      achOverTar: totalTarget > 0 ? ((totalActual / totalTarget) * 100).toFixed(1) : "0",
      tarOverAch: totalActual > 0 ? ((totalTarget / totalActual) * 100).toFixed(1) : "0",
    };
  }, [savedValues]);
  async function save() {
    if (!sheet) return;
    setError(null);
    setMsg(null);
    const updates = sheet.goals
      .filter((g) => !g.readOnlyTitleTarget || g.isPrimaryOwner)
      .map((g) => ({
        goalId: g.id,
        actual: values[g.id]?.actual ?? "",
        status: values[g.id]?.status ?? "NOT_STARTED",
      }))
      .filter((u) => u.actual.length > 0);

    const res = await fetch("/api/quarterly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period, updates }),
    });
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    setMsg("Quarterly progress saved");
  }

  if (!sheet) return <p className="text-sm text-slate-600">Loading…</p>;
  if (sheet.status !== "APPROVED") {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
      <p className="text-amber-800 font-medium">⏳ Progress Tracking Locked</p>
      <p className="text-sm text-amber-600">You can only log achievements once your manager has officially APPROVED your goal sheet.</p>
    </div>
  );
}
  return (
    
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Quarterly progress</h1>
          <p className="text-sm text-slate-600">
            Log actual achievement for each goal (windows enforced server-side).
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600">Period</label>
          <select
            className="rounded border border-slate-200 px-2 py-1 text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value as (typeof periods)[number])}
          >
            {periods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Last Saved: Achievement ÷ Target</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-indigo-700">{savedMetrics.achOverTar}%</span>
            <span className="text-xs text-indigo-400 font-medium italic">Database Snapshot</span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Last Saved: Target ÷ Achievement</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-700">{savedMetrics.tarOverAch}%</span>
          </div>
        </div>
        <p className="text-sm text-slate-600">save quartely updates to see the metrics</p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {msg ? <p className="text-sm text-emerald-700">{msg}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Goal</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Actual</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sheet.goals.map((g) => {
  // Logic from first snippet: Check if input should be disabled (Synced Shared KPIs)
  const disabled = g.readOnlyTitleTarget && !g.isPrimaryOwner;
  const row = values[g.id] ?? { actual: "", status: "NOT_STARTED" };

  // Logic from second snippet: Calculate live preview score
  const targetNum = parseFloat(g.target);
  const actualNum = parseFloat(row.actual) || 0;
  
  let displayScore = 0;
  if (targetNum > 0) {
    // Basic preview math: you can refine this later with your computeProgressScore logic
    displayScore = (actualNum / targetNum) * 100;
  }

  return (
    
    <tr key={g.id} className="hover:bg-slate-50/50">
      {/* 1. Goal Title & Sync Status */}
      <td className="px-3 py-4">
        <div className="font-medium text-slate-900">{g.title}</div>
        {disabled && (
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
            Synced from Primary Owner
          </span>
        )}
      </td>

      {/* 2. Target Value (Static) */}
      <td className="px-3 py-4 text-slate-600 font-mono">
        {g.target}
      </td>

      {/* 3. Progress Visual (The Progress Bar) */}
      <td className="px-3 py-4">
        <div className="flex items-center gap-3">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
            <div 
              className={`h-full transition-all duration-500 ${
                displayScore >= 100 ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(displayScore, 100)}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-700">
            {displayScore.toFixed(0)}%
          </span>
        </div>
      </td>

      {/* 4. Actual Achievement Input */}
      <td className="px-3 py-4">
        <input
          type="text"
          className="w-32 rounded border border-slate-200 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
          placeholder="Enter actual..."
          value={row.actual}
          disabled={disabled}
          onChange={(e) =>
            setValues((prev) => ({
              ...prev,
              [g.id]: { ...row, actual: e.target.value },
            }))
          }
        />
      </td>

      {/* 5. Status Dropdown */}
      <td className="px-3 py-4">
        <select
          className="rounded border border-slate-200 px-2 py-1 text-sm focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
          value={row.status}
          disabled={disabled}
          onChange={(e) =>
            setValues((prev) => ({
              ...prev,
              [g.id]: { ...row, status: e.target.value },
            }))
          }
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </td>
    </tr>
  );
})}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => void save()}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-fg shadow"
      >
        Save quarterly updates
      </button>
      <div></div>
      
    </div>
    
  );
}
