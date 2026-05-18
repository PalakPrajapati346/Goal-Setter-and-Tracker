import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import ReportsClient from "./ReportsClient";

// This fixes the "Prerender Error" because it forces the page to be dynamic
export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== Role.ADMIN) {
    redirect("/login");
  }

  return <ReportsClient userName={session.user.name || "Admin"} />;
}