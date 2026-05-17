import { NextResponse } from "next/server";
import { CycleKind, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";

/** Resolve the employee's sheet for a cycle kind (defaults to GOAL_SETTING). */
export async function GET(req: Request) {
  const session = await requireUserSession();
  if (session.user.role !== Role.EMPLOYEE && session.user.role !== Role.ADMIN) {
    return NextResponse.json(
      { error: "This endpoint is only for employees (admins may pass userId)." },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(req.url);
  const kind = (searchParams.get("kind") as CycleKind | null) ?? CycleKind.GOAL_SETTING;
  const targetUserId =
    session.user.role === Role.ADMIN && searchParams.get("userId")
      ? searchParams.get("userId")!
      : session.user.id;

  const cycle = await prisma.cycle.findFirst({
    where: { kind, year: new Date().getFullYear() },
  });
  if (!cycle) {
    return NextResponse.json({ error: "No cycle configured for this window." }, { status: 404 });
  }

  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const sheet = await prisma.goalSheet.upsert({
    where: { employeeId_cycleId: { employeeId: user.id, cycleId: cycle.id } },
    update: {},
    create: {
      employeeId: user.id,
      managerId: user.managerId,
      cycleId: cycle.id,
    },
    include: {
      goals: { orderBy: { sortOrder: "asc" }, include: { updates: true } },
      cycle: true,
      employee: { select: { id: true, name: true, email: true } },
      manager: { select: { id: true, name: true, email: true } },
      
    },
    
  });

  return NextResponse.json(sheet);
}

