import { NextResponse } from "next/server";
import { Role, GoalSheetStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";
import { parseDecimalWeight, validateGoalWeights } from "@/lib/goal-rules";
import {
  assertEmployeeCanEditSheet,
  assertManagerCanEditSheet,
  assertSheetRole,
} from "@/lib/sheet-access";
import { writeAudit } from "@/lib/audit";
import { z } from "zod";

const patchSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    thrustArea: z.string().min(1).optional(),
    target: z.string().min(1).optional(),
    deadline: z.string().optional().nullable(),
    weightPct: z.union([z.number(), z.string()]).optional(),
  })
  .strict();

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const session = await requireUserSession();
  const body = patchSchema.parse(await req.json());
  const id = ctx.params.id;

  const goal = await prisma.goal.findUnique({
    where: { id },
    include: { sheet: { include: { goals: true } } },
  });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  assertSheetRole({ role: session.user.role, userId: session.user.id, sheet: goal.sheet });

  const locked = goal.sheet.status === GoalSheetStatus.APPROVED && goal.sheet.lockedAt;
  if (locked && session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Goal sheet is locked" }, { status: 400 });
  }

  if (session.user.role === Role.EMPLOYEE) {
    assertEmployeeCanEditSheet(goal.sheet.status);
  } else if (session.user.role === Role.MANAGER) {
    assertManagerCanEditSheet(goal.sheet.status);
  }

  if (goal.readOnlyTitleTarget) {
    if (body.title != null || body.target != null || body.thrustArea != null) {
      return NextResponse.json(
        { error: "Title and target are read-only for shared KPIs." },
        { status: 400 }
      );
    }
  }
  const data: Record<string, any> = {};
  if (body.weightPct !== undefined) {
    const w = parseDecimalWeight(body.weightPct);
    if (w === null) return NextResponse.json({ error: "Invalid weight format" }, { status: 400 });

    // Validate using the NEW weight for this goal + OLD weights for others
    const check = validateGoalWeights(
      goal.sheet.goals.map((g) => ({
        // CRITICAL: Ensure we use Number() to avoid Decimal object issues
        weightPct: g.id === id ? w : Number(g.weightPct),
      }))
    );

    if (!check.ok) {
      return NextResponse.json({ errors: check.errors }, { status: 400 });
    }
    
    // Add to the update payload
    data.weightPct = w;
  }
  if (!goal.readOnlyTitleTarget) {
    if (body.title !== undefined) data.title = body.title;
    if (body.thrustArea !== undefined) data.thrustArea = body.thrustArea;
    if (body.target !== undefined) data.target = body.target;
    if (body.description !== undefined) data.description = body.description;
    if (body.deadline !== undefined) {
        data.deadline = body.deadline ? new Date(body.deadline) : null;
    }
  }
  if (body.weightPct != null) {
    const w = parseDecimalWeight(body.weightPct);
    if (w == null) return NextResponse.json({ error: "Invalid weight" }, { status: 400 });
    data.weightPct = w;
  }

  const updated = await prisma.goal.update({ where: { id }, data });

  if (goal.sheet.lockedAt && session.user.role === Role.ADMIN) {
    await writeAudit({
      entity: "Goal",
      entityId: id,
      action: "UPDATE",
      actorId: session.user.id,
      detail: JSON.stringify({ before: goal, patch: body }),
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  const session = await requireUserSession();
  const id = ctx.params.id;

  const goal = await prisma.goal.findUnique({
    where: { id },
    include: { sheet: { include: { goals: true } } },
  });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  assertSheetRole({ role: session.user.role, userId: session.user.id, sheet: goal.sheet });

  if (goal.sharedDefId && session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Shared KPI rows can only be removed by an administrator." }, { status: 400 });
  }

  const locked = goal.sheet.status === GoalSheetStatus.APPROVED && goal.sheet.lockedAt;
  if (locked && session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Goal sheet is locked" }, { status: 400 });
  }

  if (session.user.role === Role.EMPLOYEE) {
    assertEmployeeCanEditSheet(goal.sheet.status);
  } else if (session.user.role === Role.MANAGER) {
    assertManagerCanEditSheet(goal.sheet.status);
  }

  const remaining = goal.sheet.goals.filter((g) => g.id !== id);
  const check = validateGoalWeights(remaining.map((g) => ({ weightPct: g.weightPct })));
  if (remaining.length > 0 && !check.ok) {
    return NextResponse.json({ errors: check.errors }, { status: 400 });
  }

  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
