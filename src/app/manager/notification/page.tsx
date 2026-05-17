"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type EscalatedSheet = {
  id: string;
  submittedAt: string;
  employee: { name: string; email: string };
  cycle: { name: string };
};

export default function ManagerNotificationsPage() {
  const [items, setItems] = useState<EscalatedSheet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sheets/escalated")
      .then((res) => res.json())
      .then((data) => {
        setItems(data);
        setLoading(false);
      });
  }, []);

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Escalation Center</h1>
          <p className="text-sm text-slate-500">Goal sheets that exceeded the 72-hour approval window.</p>
        </div>
        <Link href="/manager/review" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
          ← Back to Active Queue
        </Link>
      </header>

      {loading ? (
        <div className="p-10 text-center text-slate-400">Loading alerts...</div>
      ) : items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border-l-4 border-l-rose-500 border border-slate-200 bg-white p-5 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{item.employee.name}</span>
                  <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-black uppercase">
                    Overdue
                  </span>
                </div>
                <p className="text-xs text-slate-500">{item.employee.email} · {item.cycle.name}</p>
              </div>

              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Submitted On</p>
                <p className="text-xs font-mono font-bold text-slate-700">
                  {new Date(item.submittedAt).toLocaleDateString()}
                </p>
                <Link 
                  href={`/manager/approvals?sheetId=${item.id}`}
                  className="mt-2 inline-block text-[11px] font-bold text-rose-600 underline hover:text-rose-800"
                >
                  Force Review Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
          <p className="text-slate-400 font-medium">No escalated goal sheets. Your queue is healthy! ✅</p>
        </div>
      )}
    </main>
  );
}