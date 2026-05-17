import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-slate-600">
        Signed in as <span className="font-medium text-slate-900">{session.user?.email}</span> (
        {session.user.role})
      </p>
      <ul className="mt-6 space-y-3 text-brand underline">
        <li>
          <Link href="/employee/goals">Employee · Goal sheet</Link>
        </li>
        <li>
          <Link href="/employee/quarterly">Employee · Quarterly updates</Link>
        </li>
        <li>
          <Link href="/manager/review">Manager · Approvals</Link>
        </li>
        <li>
          <Link href="/manager/checkins">Manager · Check-ins</Link>
        </li>
        <li>
          <Link href="/admin">Admin &amp; reporting</Link>
        </li>
      </ul>
    </main>
  );
}
