import { NextResponse } from "next/server";
import { GoalSheetStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const session = await requireUserSession();
  
  // 1. Authorization Check
  if (session.user.role !== Role.MANAGER && session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Only managers can return work for rework." }, { status: 403 });
  }

  // 2. Fetch Sheet with Employee/Cycle info for the Audit Log
  const sheet = await prisma.goalSheet.findUnique({ 
    where: { id: ctx.params.id },
    include: { employee: true, cycle: true } 
  });

  if (!sheet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 3. Manager Ownership Check
  if (session.user.role === Role.MANAGER && sheet.managerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden: Not your direct report." }, { status: 403 });
  }

  // 4. Status Validation
  if (sheet.status !== GoalSheetStatus.SUBMITTED) {
    return NextResponse.json({ error: "Only submitted sheets can be sent back for rework." }, { status: 400 });
  }

  try {
    // 5. TRANSACTION: Update Status & Log Action
    const result = await prisma.$transaction(async (tx) => {
      // Update the Goal Sheet
      const updatedSheet = await tx.goalSheet.update({
        where: { id: sheet.id },
        data: {
          status: GoalSheetStatus.REWORK,
          lockedAt: null, // Unlock the sheet so the employee can edit it
        },
      });

      // Create the Audit Log Entry
      await tx.auditLog.create({
        data: {
          entity: "GOAL_SHEET",
          entityId: sheet.id,
          action: "REWORK",
          actorId: session.user.id,
          detail: `Rework requested by ${session.user.name || session.user.email} for ${sheet.employee.name}. Cycle: ${sheet.cycle.name}`,
          createdAt: new Date(),
        },
      });

      return updatedSheet;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Rework Transaction Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}