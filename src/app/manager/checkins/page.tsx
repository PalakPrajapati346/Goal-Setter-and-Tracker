"use client";
import { useEffect, useState } from "react";

type TeamSheet = { 
  id: string; 
  employee: { name: string }; 
  cycle: { name: string };
  goals: { 
    id: string; 
    title: string; 
    target: string; 
    uomType: string;      // Added for Logic display
    direction: string;    // Added for Logic display
    updates: { period: string; actual: string; progressScore: any }[] 
  }[] 
};

export default function ManagerCheckinsPage() {
  const [sheets, setSheets] = useState<TeamSheet[]>([]);
  const [sheetId, setSheetId] = useState("");
  const [period, setPeriod] = useState("Q1");
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    loadSheets();
  }, []);

  async function loadSheets() {
    const res = await fetch("/api/sheets/team");
    if (!res.ok) return;
    const rows: TeamSheet[] = await res.json();
    setSheets(rows);
    if (rows.length > 0 && !sheetId) setSheetId(rows[0].id);
  }

  const selectedSheet = sheets.find(s => s.id === sheetId);

return (
  <div className="mx-auto max-w-6xl p-6">
    <header className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900">Quarterly Check-ins</h1>
      <p className="text-sm text-slate-500">Review performance and provide feedback for FY 2026</p>
    </header>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* LEFT COLUMN: The Evidence (Scrollable Scorecard) */}
      <div className="lg:col-span-7 space-y-4">
        {selectedSheet ? (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                Goal Progress: {selectedSheet.employee.name}
              </h3>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                {period} Metrics
              </span>
            </div>

            {/* Internal Scroll Area for Goals */}
            <div className="max-h-[70vh] overflow-y-auto p-5 space-y-6 custom-scrollbar">
              {selectedSheet.goals?.map(goal => {
                const update = goal.updates?.find(u => u.period === period);
                const target = parseFloat(goal.target) || 0;
                const actual = update ? parseFloat(update.actual) : 0;
                const sysScore = update ? Number(update.progressScore) : 0;
                const higherIsBetter = target > 0 ? (actual / target * 100).toFixed(1) : "0.0";
                const lowerIsBetter = actual > 0 ? (target / actual * 100).toFixed(1) : "0.0";

                return (
                  <div key={goal.id} className="group border-b border-slate-100 pb-5 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{goal.title}</p>
                        <p className="text-[10px] text-slate-400 font-medium">TARGET: {goal.target}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">{update ? actual : "---"}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Actual</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-1000"
                        style={{ width: `${Math.min(sysScore, 100)}%` }}
                      />
                    </div>

                    {/* Logic Cards - Compact Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-slate-50 border border-slate-100 p-2">
                        <p className="text-[8px] text-slate-400 font-black uppercase">Achievement ÷ Target</p>
                        <p className="text-xs font-bold text-blue-600">{higherIsBetter}%</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 border border-slate-100 p-2">
                        <p className="text-[8px] text-slate-400 font-black uppercase">Target ÷ Achievement</p>
                        <p className="text-xs font-bold text-orange-600">{lowerIsBetter}%</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl">
            <p className="text-slate-400">Select a team member to view progress</p>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: The Action (Sticky Form) */}
      <div className="lg:col-span-5 sticky top-6 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-semibold text-slate-700">
              Team Member
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
              >
                {sheets.map((s) => (
                  <option key={s.id} value={s.id}>{s.employee.name}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Period
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                {["Q1", "Q2", "Q3", "Q4"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          </div>

          <label className="block text-sm font-semibold text-slate-700">
            Manager Feedback
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none min-h-[200px]"
              placeholder="Start typing your review while looking at the data on the left..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </label>

          <button
            onClick={async () => {
              const res = await fetch("/api/checkins", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sheetId, period, comment }),
              });
              setMsg(res.ok ? "✅ Check-in saved" : "❌ Error saving");
              setTimeout(() => setMsg(null), 3000);
            }}
            className="w-full rounded-lg bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98]"
          >
            Submit Quarterly Review
          </button>
          
          {msg && (
            <div className={`text-center p-2 rounded-lg text-xs font-bold ${msg.includes('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {msg}
            </div>
          )}
        </div>
      </div>

    </div>
  </div>
);
}