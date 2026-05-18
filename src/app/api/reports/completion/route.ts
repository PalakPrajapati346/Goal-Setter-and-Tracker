import { NextResponse } from "next/server";
import { CycleKind, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const session = await requireUserSession();
    
    if (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "Q1";

    const sheets = await prisma.goalSheet.findMany({
      where: {
        ...(session.user.role === Role.MANAGER ? { managerId: session.user.id } : {}),
      },
      select: {
        employeeId: true,
        employee: { select: { id: true, name: true, email: true } },
        checkIns: { 
          where: { period: period as CycleKind },
          select: { id: true } // We only need to know if it exists
        },
        goals: {
          select: {
            target: true,
            weightPct: true,
            updates: { 
              where: { period: period as CycleKind },
              take: 1,
              select: { actual: true, progressScore: true }
            }
          }
        },
      },
    });
    
    const payload = sheets.map((s) => ({
      employeeId: s.employeeId,
      employee: s.employee,
      employeeCheckInDone: s.checkIns.length > 0,
      goals: s.goals, 
    }));

    return NextResponse.json({ period, rows: payload });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}