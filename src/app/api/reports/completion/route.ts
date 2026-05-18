import { NextResponse } from "next/server";
import { CycleKind, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";

export async function GET(req: Request) {
  const session = await requireUserSession();
  
  // 1. Authorization check
  if (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "Q1";

  const sheets = await prisma.goalSheet.findMany({
    where: {
      // Logic: Only show employees managed by this manager if they aren't an ADMIN
      ...(session.user.role === Role.MANAGER ? { managerId: session.user.id } : {}),
    },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      // Check if a check-in exists for this specific period
      checkIns: { 
        where: { period: period as CycleKind } 
      },
      goals: {
        include: {
          // CRITICAL: We need the actual progress updates to calculate the score
          updates: { 
            where: { period: period as CycleKind },
            //orderBy: { createdAt: 'desc' },
            take: 1 // Only take the most recent update for this period
          }
        }
      },
    },
  });
  
  const payload = sheets.map((s) => ({
    employeeId: s.employeeId,
    employee: s.employee,
    // "Review Done" only if a check-in record exists for this Q1/Q2/etc.
    employeeCheckInDone: s.checkIns.length > 0,
    goals: s.goals, 
  }));

  return NextResponse.json({ period, rows: payload });
}