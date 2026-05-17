import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth-options";
import { signOut } from "next-auth/react";
export default async function AdminHome() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== Role.ADMIN) {
    redirect("/login");
  }

  const adminCards = [
    {
      title: "Reports Dashboard",
      description:
        "Track employee submissions, goal completion, and organization-wide progress.",
      href: "/admin/reports",
      emoji: "📊",
    },
    {
      title: "Audit Trail",
      description:
        "View approval logs, activity history, and all important system actions.",
      href: "/admin/audit",
      emoji: "📝",
    },
    {
      title: "Cycle Management",
      description:
        "To create and manage Cycles",
      href: "/admin/cycles",
      emoji: "🔄",
    },
    
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Admin Panel
            </span>

            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
              Administration Dashboard
            </h1>

            <p className="mt-3 max-w-2xl text-base text-slate-600">
              Configure goal cycles, monitor employee progress, manage approvals,
              and maintain audit visibility across the platform.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-sm text-slate-500">Logged in as</p>
            <p className="font-semibold text-slate-900">
              {session.user.name}
            </p>
            <Link className="text-sm text-slate-500 hover:text-slate-800" href="/dashboard">
              Dashboard
            </Link>
             <button type="button"
                          className="text-sm font-medium text-brand"
                          onClick={() => signOut({ callbackUrl: "/login" })}
                        >
                          Sign out
                        </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {adminCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className="text-4xl">{card.emoji}</div>

                <span className="text-slate-400 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </div>

              <div className="mt-6">
                <h2 className="text-xl font-semibold text-slate-900">
                  {card.title}
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {card.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        
      </div>
    </main>
  );
}