"use client";

import { useEffect, useMemo, useState } from "react";

type Sheet = {
  id: string;
  status: string;
  lockedAt: string | null;
  goals: {
    id: string;
    title: string;
    thrustArea: string;
    uomType: string;
    direction: string;
    target: string;
    weightPct: string | number; 
    readOnlyTitleTarget: boolean;
    isPrimaryOwner: boolean;
  }[];
};

const uoms = ["NUMERIC", "PERCENT", "TIMELINE", "ZERO_BASED"] as const;
const directions = ["MIN_HIGHER_BETTER", "MAX_LOWER_BETTER"] as const;


  export default function EmployeeGoalsPage() {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  async function load() {
    setError(null);
    const res = await fetch("/api/sheets/me");
    if (res.status === 404) {
      // Handle the case where no cycle/sheet exists yet
      setSheet({
        id: "adhoc",
        status: "DRAFT",
        lockedAt: null,
        goals: []
      });
    } else if (!res.ok) {
      setError(await res.text());
      return;
    }
    else{setSheet(await res.json());}
    setIsInitializing(false);
  }

  useEffect(() => {
    void load();
  }, []);

  
  const totalWeight = useMemo(() => {
    if (!sheet || !sheet.goals) return 0;
    return sheet.goals.reduce((sum, g) => {
      const val = parseFloat(String(g.weightPct)) || 0;
      return sum + val;
    }, 0);
  }, [sheet]);

  const editable = sheet && (sheet.status === "DRAFT" || sheet.status === "REWORK");
async function addGoal() {
  setError(null);
  setMsg(null);
  
  let idToUse = sheet?.id;

  try {
    // 1. Handle Initialization
    if (idToUse === "PENDING") {
      setMsg("Creating your goal sheet in database...");
      const createRes = await fetch("/api/sheets", { method: "POST" });
      if (!createRes.ok) throw new Error(await createRes.text());
      
      const newSheet = await createRes.json();
      idToUse = newSheet.id;
      setSheet(newSheet); // Update local state
    }

    // 2. Add the Goal
    setMsg("Adding goal...");
    const res = await fetch(`/api/sheets/${idToUse}/goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New Goal",
        thrustArea: "General",
        uomType: "NUMERIC",
        direction: "MIN_HIGHER_BETTER",
        target: "0",
        weightPct: 10,
      }),
    });

    if (!res.ok) {
  const errText = await res.text();
  setMsg(null); // Clear the "Adding..." message
  setError(`Server rejected goal: ${errText}`);
  return;
}

    await load();
    setMsg("Goal added successfully!");
  } catch (err) {
    setError(err instanceof Error ? err.message : "An unknown error occurred");
    console.error("Add Goal Error:", err);
  }
}

async function patchGoal(id: string, patch: Record<string, unknown>) {
  // 1. Don't clear error immediately to avoid UI jumps
  setMsg("Saving..."); 

  const res = await fetch(`/api/goals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.errors?.[0] || data.error || "Save failed";
    setError(errorMsg);
    // ONLY reload on error to revert the UI to the last "truth" in the DB
    await load(); 
    return;
  }

  // 2. On success, we don't necessarily NEED to load() if our local state 
  // is already correct, but for a hackathon, it's safer to just set the msg.
  setMsg("Saved");
}

 async function submit() {
  if (!sheet) return;
  if (totalWeight !== 100) {
    setError("Total must be exactly 100% before submitting.");
    return;
  }

  setMsg("Saving and submitting...");
  
  // We send the current local state of 'sheet.goals' to the server
  const res = await fetch(`/api/sheets/${sheet.id}/submit`, { 
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goals: sheet.goals }) // Send the updated goals here
  });

  if (!res.ok) {
    const data = await res.json();
    setError(data.error || "Submission failed");
    return;
  }

  setMsg("Goals saved and submitted successfully!");
  await load();
}
  if (!sheet) {
    return <p className="p-8 text-sm text-slate-600">{error ?? "Loading…"}</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      
      {sheet.status === "SUBMITTED" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">⏳ Status: Pending Manager Approval</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My goal sheet</h1>
          <p className="text-sm text-slate-600">
            Cycle Status: <span className="font-semibold uppercase text-slate-900">{sheet.status}</span> · Total weightage:{" "}
            <span className={`font-bold ${totalWeight === 100 ? 'text-emerald-600' : 'text-red-500'}`}>
              {totalWeight.toFixed(2)}%
            </span>
          </p>
        </div>
        
        <div className="flex gap-2">
          {editable && (
            <>
              <button
                onClick={addGoal}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                + Add Goal
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={totalWeight !== 100}
                className={`rounded-lg px-4 py-2 text-sm font-medium shadow ${
                  totalWeight === 100 
                    ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                Submit for approval
              </button>
            </>
          )}
        </div>
      </div>

      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}
      {msg ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</p> : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Thrust</th>
              <th className="px-4 py-3">UoM</th>
              <th className="px-4 py-3">Direction</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3 text-center">Weight %</th>
              <th className="px-4 py-3">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sheet.goals.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                  No goals added. Click + Add Goal to start.
                </td>
              </tr>
            ) : (
              sheet.goals.map((g) => (
                <tr key={g.id} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2">
                    <input
                      className="w-full rounded border border-slate-200 px-2 py-1 disabled:bg-slate-50"
                      defaultValue={g.title}
                      disabled={!editable || g.readOnlyTitleTarget}
                      onBlur={(ev) => {
                        if (ev.target.value !== g.title) void patchGoal(g.id, { title: ev.target.value });
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="w-full rounded border border-slate-200 px-2 py-1 disabled:bg-slate-50"
                      defaultValue={g.thrustArea}
                      disabled={!editable || g.readOnlyTitleTarget}
                      onBlur={(ev) => {
                        if (ev.target.value !== g.thrustArea) void patchGoal(g.id, { thrustArea: ev.target.value });
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="w-full rounded border border-slate-200 px-1 py-1 disabled:bg-slate-50"
                      defaultValue={g.uomType}
                      disabled={!editable || g.readOnlyTitleTarget}
                      onChange={(ev) => void patchGoal(g.id, { uomType: ev.target.value })}
                    >
                      {uoms.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="w-full rounded border border-slate-200 px-1 py-1 disabled:bg-slate-50"
                      defaultValue={g.direction}
                      disabled={!editable || g.readOnlyTitleTarget}
                      onChange={(ev) => void patchGoal(g.id, { direction: ev.target.value })}
                    >
                      {directions.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="w-full rounded border border-slate-200 px-2 py-1 disabled:bg-slate-50"
                      defaultValue={g.target}
                      disabled={!editable || g.readOnlyTitleTarget}
                      onBlur={(ev) => {
                        if (ev.target.value !== g.target) void patchGoal(g.id, { target: ev.target.value });
                      }}
                    />
                  </td>
<input
  type="number"
  className="w-20 rounded border border-slate-200 px-2 py-1 text-center"
  value={g.weightPct}
  disabled={!editable}
  onChange={(ev) => {
    const value = parseFloat(ev.target.value) || 0;
    setSheet((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        goals: prev.goals.map((goal) =>
          goal.id === g.id ? { ...goal, weightPct: value } : goal
        ),
      };
    });
  }}
/>
<td className="px-3 py-2 text-xs text-slate-500">
                    {g.readOnlyTitleTarget ? (g.isPrimaryOwner ? "Shared-Owner" : "Shared-Linked") : "Individual"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editable && (
        <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
          <h3 className="text-xs font-semibold uppercase text-slate-500 mb-2">Submission Rules</h3>
          <ul className="list-inside list-disc text-xs text-slate-600 space-y-1">
            <li>Each goal must have a minimum weightage of 10%.</li>
            <li>Total weightage across all goals must equal exactly 100%.</li>
          </ul>
        </div>
      )}
    </div>
  );
}