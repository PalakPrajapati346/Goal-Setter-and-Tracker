"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <p className="text-sm font-semibold text-slate-900">Goal Portal · Manager</p>
            <nav className="flex gap-4 text-sm text-slate-600">
              <Link className="hover:text-brand" href="/manager/review">
                Approvals
              </Link>
              <Link className="hover:text-brand" href="/manager/checkins">
                Check-ins
              </Link>
              <Link className="hover:text-brand" href="/manager/notification">
                Escalations
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link className="text-sm text-slate-500 hover:text-slate-800" href="/dashboard">
              Dashboard
            </Link>
            <button
              type="button"
              className="text-sm font-medium text-brand"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
