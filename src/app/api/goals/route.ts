import { NextResponse } from "next/server";
import { UomDirection, UomType, Role, GoalSheetStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";
import { parseDecimalWeight, validateGoalWeights } from "@/lib/goal-rules";
import { assertEmployeeCanEditSheet, assertManagerCanEditSheet, assertSheetRole } from "@/lib/sheet-access";
import { z } from "zod";

const createSchema = z.object({
  sheetId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  thrustArea: z.string().min(1),
  uomType: z.nativeEnum(UomType),
  direction: z.nativeEnum(UomDirection),
  target: z.string().min(1),
  deadline: z.string().optional().nullable(),
  weightPct: z.number().or(z.string()),
});

export async function POST(req: Request) {
  const session = await requireUserSession();
  const body = createSchema.parse(await req.json());

  const sheet = await prisma.goalSheet.findUnique({
    where: { id: body.sheetId },
    include: { goals: true },
  });
  if (!sheet) return NextResponse.json({ error: "Sheet not found" }, { status: 404 });

  assertSheetRole({ role: session.user.role, userId: session.user.id, sheet });

  const locked = sheet.status === GoalSheetStatus.APPROVED && sheet.lockedAt;
  if (locked && session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Goal sheet is locked" }, { status: 400 });
  }

  if (session.user.role === Role.EMPLOYEE) {
    assertEmployeeCanEditSheet(sheet.status);
  } else if (session.user.role === Role.MANAGER) {
    assertManagerCanEditSheet(sheet.status);
  }

  const weightPct = parseDecimalWeight(body.weightPct);
  if (weightPct == null) return NextResponse.json({ error: "Invalid weight" }, { status: 400 });

  const nextGoals = [...sheet.goals.map((g) => ({ weightPct: g.weightPct })), { weightPct }];
  const check = validateGoalWeights(nextGoals);
  if (!check.ok) return NextResponse.json({ errors: check.errors }, { status: 400 });

  const maxOrder = sheet.goals.reduce((m, g) => Math.max(m, g.sortOrder), -1);

  const goal = await prisma.goal.create({
    data: {
      sheetId: sheet.id,
      title: body.title,
      description: body.description,
      thrustArea: body.thrustArea,
      uomType: body.uomType,
      direction: body.direction,
      target: body.target,
      deadline: body.deadline ? new Date(body.deadline) : null,
      weightPct,
      sortOrder: maxOrder + 1,
    },
  });

  return NextResponse.json(goal);
}
