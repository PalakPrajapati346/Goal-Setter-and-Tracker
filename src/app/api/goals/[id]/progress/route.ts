import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";
import { CycleKind, GoalProgressStatus } from "@prisma/client";
import { z } from "zod";

const progressSchema = z.object({
  period: z.nativeEnum(CycleKind),
  actual: z.string(),
  status: z.nativeEnum(GoalProgressStatus),
});

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const session = await requireUserSession();
  const body = progressSchema.parse(await req.json());
  const goalId = ctx.params.id;

  // 1. Get the goal and its sheet to check permissions
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: { sheet: true }
  });

  if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  // 2. Ensure only the owner (Employee) can update their progress
  if (goal.sheet.employeeId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. Calculate Progress Score (The Formulas from the BRD)
  // We'll calculate this server-side to ensure the score is accurate
  let score = 0;
  const targetNum = parseFloat(goal.target);
  const actualNum = parseFloat(body.actual);

  if (goal.uomType === "ZERO_BASED") {
    score = actualNum === 0 ? 100 : 0;
  } else if (goal.direction === "MAX_LOWER_BETTER") {
    score = actualNum > 0 ? (targetNum / actualNum) * 100 : 0;
  } else {
    // MIN_HIGHER_BETTER
    score = targetNum > 0 ? (actualNum / targetNum) * 100 : 0;
  }

  // 4. Save the update
  const update = await prisma.quarterlyGoalUpdate.upsert({
    where: {
      goalId_period: { goalId, period: body.period }
    },
    update: {
      actual: body.actual,
      status: body.status,
      progressScore: score,
      updatedAt: new Date(),
    },
    create: {
      goalId,
      period: body.period,
      actual: body.actual,
      status: body.status,
      progressScore: score,
    }
  });

  return NextResponse.json(update);
}