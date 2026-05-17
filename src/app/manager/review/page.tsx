"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
type QueueSheet = {
  id: string;
  status: string;
  employee: { name: string; email: string };
  goals: { id: string; title: string; target: string; weightPct: string }[];
};

export default function ManagerReviewPage() {
  const [queue, setQueue] = useState<QueueSheet[]>([]);
  const [active, setActive] = useState<QueueSheet | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadQueue() {
    const res = await fetch("/api/sheets/queue");
    if (!res.ok) return;
    setQueue(await res.json());
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  async function reloadSheet(id: string) {
    const res = await fetch(`/api/sheets/${id}`);
    if (!res.ok) return;
    setActive(await res.json());
  }

  async function patchGoal(goalId: string, patch: Record<string, unknown>) {
    if (!active) return;
    await fetch(`/api/goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await reloadSheet(active.id);
    await loadQueue();
  }

  async function approve() {
    if (!active) return;
    const res = await fetch(`/api/sheets/${active.id}/approve`, { method: "POST" });
    setMessage(res.ok ? "Approved & locked" : await res.text());
    await loadQueue();
    setActive(null);
  }

  async function rework() {
    if (!active) return;
    const res = await fetch(`/api/sheets/${active.id}/rework`, { method: "POST" });
    setMessage(res.ok ? "Sent back for rework" : await res.text());
    await loadQueue();
    setActive(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Approvals</h1>
        <p className="text-sm text-slate-600">Review submitted goal sheets and edit.</p>
        {message ? <p className="mt-2 text-sm text-emerald-700">{message}</p> : null}
      </div>
      {/* Escalation Warning Div */}
{queue.length > 0 && (
  <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 shadow-sm">
    <span className="text-lg">⏳</span>
    <div className="space-y-1">
      <p className="text-xs font-bold text-amber-900 uppercase tracking-tight">
        Approval Window Active
      </p>
      <p className="text-[11px] leading-relaxed text-amber-800">
        Goal sheets must be processed within <strong>72 hours</strong>. 
        Items older than 3 days will be automatically escalated and removed from this queue.
      </p>
      <Link 
        href="/manager/notification" 
        className="block text-[10px] font-black text-amber-700 underline hover:text-amber-900"
      >
        VIEW ESCALATED ITEMS →
      </Link>
    </div>
  </div>
)}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Submitted queue</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {queue.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-left hover:border-brand"
                  onClick={() => void reloadSheet(s.id)}
                >
                  <div className="font-medium text-slate-900">{s.employee.name}</div>
                  <div className="text-xs text-slate-500">{s.employee.email}</div>
                </button>
              </li>
            ))}
            {queue.length === 0 ? <p className="text-slate-500">No pending submissions.</p> : null}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {!active ? (
            <p className="text-sm text-slate-500">Select a team member to review.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{active.employee?.name}</p>
                  <p className="text-xs text-slate-500">{active.status}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white"
                    onClick={() => void approve()}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
                    onClick={() => void rework()}
                  >
                    Rework
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-1">Goal</th>
                      <th className="py-1">Target</th>
                      <th className="py-1">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.goals.map((g) => (
                      <tr key={g.id} className="border-t border-slate-100">
                        <td className="py-2 pr-2">{g.title}</td>
                        <td className="py-2 pr-2">
                          <input
                            className="w-28 rounded border px-1"
                            defaultValue={g.target}
                            onBlur={(ev) => {
                              if (ev.target.value !== g.target) {
                                void patchGoal(g.id, { target: ev.target.value });
                              }
                            }}
                          />
                        </td>
                        <td className="py-2">
                          <input
                            type="number"
                            className="w-20 rounded border px-1"
                            defaultValue={Number(g.weightPct)}
                            onBlur={(ev) => void patchGoal(g.id, { weightPct: Number(ev.target.value) })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
