import { NextResponse } from "next/server";
import { GoalSheetStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";
import { validateGoalWeights } from "@/lib/goal-rules";

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const session = await requireUserSession();
  
  
  if (session.user.role !== Role.MANAGER && session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Only managers can approve." }, { status: 403 });
  }

  
  const sheet = await prisma.goalSheet.findUnique({
    where: { id: ctx.params.id },
    include: { goals: true, employee: true, cycle: true },
  });

  if (!sheet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  
  if (session.user.role === Role.MANAGER && sheet.managerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden: You are not the assigned manager." }, { status: 403 });
  }

  // 4. Status Check
  if (sheet.status !== GoalSheetStatus.SUBMITTED) {
    return NextResponse.json({ error: "Only submitted sheets can be approved." }, { status: 400 });
  }

  // 5. Rule Validation
  const check = validateGoalWeights(sheet.goals.map((g) => ({ weightPct: g.weightPct })));
  if (!check.ok) return NextResponse.json({ errors: check.errors }, { status: 400 });

  try {
    // 6. TRANSACTION: Update Status & Write Audit Log
    const result = await prisma.$transaction(async (tx) => {
      // Perform the Update
      const updatedSheet = await tx.goalSheet.update({
        where: { id: sheet.id },
        data: {
          status: GoalSheetStatus.APPROVED,
          approvedAt: new Date(),
          lockedAt: new Date(),
        },
      });

      // Create the Audit Log Entry
      await tx.auditLog.create({
        data: {
          entity: "GOAL_SHEET",
          entityId: sheet.id,
          action: "APPROVE",
          actorId: session.user.id,
          detail: `Approved by ${session.user.name || session.user.email} for ${sheet.employee.name}. Cycle: ${sheet.cycle.name}`,
          createdAt: new Date(),
        },
      });

      return updatedSheet;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Approval Transaction Error:", error);
    return NextResponse.json({ error: "Failed to approve and audit." }, { status: 500 });
  }
}