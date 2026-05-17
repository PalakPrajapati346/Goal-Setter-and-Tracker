import { NextResponse } from "next/server";
import { Role, UomDirection, UomType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  thrustArea: z.string().min(1),
  uomType: z.nativeEnum(UomType),
  direction: z.nativeEnum(UomDirection),
  target: z.string().min(1),
  deadline: z.string().optional().nullable(),
  primaryOwnerId: z.string(),
  recipientIds: z.array(z.string()).min(1),
  cycleId: z.string(),
});

export async function POST(req: Request) {
  const session = await requireUserSession();
  if (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = schema.parse(await req.json());

  const def = await prisma.sharedGoalDefinition.create({
    data: {
      title: body.title,
      description: body.description,
      thrustArea: body.thrustArea,
      uomType: body.uomType,
      direction: body.direction,
      target: body.target,
      deadline: body.deadline ? new Date(body.deadline) : null,
      createdById: session.user.id,
      primaryOwnerId: body.primaryOwnerId,
    },
  });

  const createdGoals = [];
  for (const empId of body.recipientIds) {
    const sheet = await prisma.goalSheet.findUnique({
      where: { employeeId_cycleId: { employeeId: empId, cycleId: body.cycleId } },
      include: { goals: true },
    });
    if (!sheet) continue;

    const maxOrder = sheet.goals.reduce((m, g) => Math.max(m, g.sortOrder), -1);
    const goal = await prisma.goal.create({
      data: {
        sheetId: sheet.id,
        sharedDefId: def.id,
        title: def.title,
        description: def.description,
        thrustArea: def.thrustArea,
        uomType: def.uomType,
        direction: def.direction,
        target: def.target,
        deadline: def.deadline,
        weightPct: 10,
        readOnlyTitleTarget: true,
        isPrimaryOwner: empId === body.primaryOwnerId,
        sortOrder: maxOrder + 1,
      },
    });
    createdGoals.push(goal);
  }

  return NextResponse.json({ definition: def, goals: createdGoals });
}
