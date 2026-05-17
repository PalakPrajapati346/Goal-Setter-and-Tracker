import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth-options";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role === Role.ADMIN) redirect("/admin");
  if (session.user.role === Role.MANAGER) redirect("/manager/review");
  redirect("/employee/goals");
}
