import { NextResponse } from "next/server";
import { CycleKind, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";

export async function GET(req: Request) {
  const session = await requireUserSession();
  if (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "Q1";
   // ... inside your GET function
const sheets = await prisma.goalSheet.findMany({
  where: {
    employee: { role: Role.EMPLOYEE },
    ...(session.user.role === Role.MANAGER ? { managerId: session.user.id } : {}),
    cycle: { year: 2026 }
  },
  include: {
    employee: { select: { id: true, name: true, email: true } },
    checkIns: { where: { period: period as any } },
    goals: {
      include: {
        // Fetch the quarterly updates to get the "actual" values
        updates: {
          where: { period: period as any }
        }
      }
    },
  },
});
 
  const payload = sheets.map((s) => ({
    employeeId: s.employeeId,
    employee: s.employee,
    employeeCheckInDone: s.checkIns.length > 0,
    goals: s.goals, // Passing the goals array to the frontend
  }));

  return NextResponse.json({ period, rows: payload });
}
