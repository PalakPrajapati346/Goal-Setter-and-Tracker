"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type AuditRow = {
  id: string;
  entity: string;
  action: string;
  detail: string | null;
  createdAt: string;
  actor: { name: string; email: string; role: string };
};

export default function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/audit");
      if (res.ok) setRows(await res.json());
    })();
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Audit trail</h1>
        <h3><Link href="/admin" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700">
  <span>🏠</span>
  <span>Admin Home</span>
</Link></h3>
      </div>
      <p>Refresh if a new action is not visible</p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Who</th>
              <th className="px-3 py-2">Entity</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-xs text-slate-600">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">
                  {r.actor.name} <span className="text-xs text-slate-500">({r.actor.role})</span>
                </td>
                <td className="px-3 py-2">{r.entity}</td>
                <td className="px-3 py-2">{r.action}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{r.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
