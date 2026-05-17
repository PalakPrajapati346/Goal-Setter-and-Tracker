import { NextResponse } from "next/server";
import { GoalSheetStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";

export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    const session = await requireUserSession();
    const { id: sheetId } = ctx.params;
    const { goals } = await req.json();

    const result = await prisma.$transaction(async (tx) => {
      // 1. FAST BULK UPDATE
      // Instead of a loop that waits for each update, we trigger all updates 
      // simultaneously using Promise.all. This is much faster in TiDB.
      await Promise.all(
        goals.map((g: any) =>
          tx.goal.update({
            where: { id: g.id },
            data: { 
              weightPct: g.weightPct,
              title: g.title,
              thrustArea: g.thrustArea,
              uomType: g.uomType,
              direction: g.direction,
              target: g.target
            },
          })
        )
      );

      // 2. STATUS UPDATE
      const updatedSheet = await tx.goalSheet.update({
        where: { id: sheetId },
        data: { 
          status: "SUBMITTED", 
          submittedAt: new Date() 
        }
      });

      // 3. AUDIT LOG (As requested)
      await tx.auditLog.create({
        data: {
          entity: "GOAL_SHEET",
          entityId: sheetId,
          action: "SUBMIT",
          actorId: session.user.id,
          // We can add more helpful JSON details here
          detail: JSON.stringify({
            message: `Employee submitted sheet with ${goals.length} goals.`,
            totalWeight: goals.reduce((sum: number, g: any) => sum + (g.weightPct || 0), 0),
            timestamp: new Date().toISOString()
          })
        }
      });

      return updatedSheet;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("SUBMIT_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit goals" }, 
      { status: 500 }
    );
  }
}