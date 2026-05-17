import { NextResponse } from "next/server";
import { GoalSheetStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";
import { validateGoalWeights } from "@/lib/goal-rules";
import { assertCycleWindow, demoRelaxWindows } from "@/lib/cycles";

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const session = await requireUserSession();
  const body = await req.json(); // Contains the goals from the frontend
  const { goals } = body;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Bulk update each goal's weight
    for (const g of goals) {
      await tx.goal.update({
        where: { id: g.id },
        data: { weightPct: g.weightPct }
      });
    }

    // 2. Change status to SUBMITTED
    const updatedSheet = await tx.goalSheet.update({
      where: { id: ctx.params.id },
      data: { status: "SUBMITTED", submittedAt: new Date() }
    });

    // 3. Create Audit Log
    await tx.auditLog.create({
      data: {
        entity: "GOAL_SHEET",
        entityId: ctx.params.id,
        action: "SUBMIT",
        actorId: session.user.id,
        detail: `Employee submitted sheet with ${goals.length} goals.`
      }
    });

    return updatedSheet;
  });

  return NextResponse.json(result);
}