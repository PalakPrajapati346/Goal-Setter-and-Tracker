import { NextResponse } from "next/server";
import { GoalSheetStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";
import { writeAudit } from "@/lib/audit";
import { z } from "zod";

const bodySchema = z.object({ sheetId: z.string() });

export async function POST(req: Request) {
  const session = await requireUserSession();
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = bodySchema.parse(await req.json());
  const sheet = await prisma.goalSheet.findUnique({ where: { id: body.sheetId } });
  if (!sheet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.goalSheet.update({
    where: { id: sheet.id },
    data: {
      status: GoalSheetStatus.REWORK,
      lockedAt: null,
    },
  });

  await writeAudit({
    entity: "GoalSheet",
    entityId: sheet.id,
    action: "UNLOCK",
    actorId: session.user.id,
    detail: "Sheet unlocked for edits (status set to REWORK).",
  });

  return NextResponse.json(updated);
}
