import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";
import { Prisma } from "@prisma/client";
export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    const session = await requireUserSession();
    const { goals } = await req.json();

    // Replace hardcoded CYCLE_ID with this


    const result = await prisma.$transaction(async (tx :Prisma.TransactionClient) => {
      const cycle = await tx.cycle.findFirst({
  where: { name: "Cycle1" },
  select: { id: true },
});

if (!cycle) throw new Error("Cycle 'Cycle1' not found.");
const CYCLE_ID = cycle.id;
      // 1. ENSURE SHEET EXISTS
      // @@unique([employeeId, cycleId]) is the correct upsert key
      const sheet = await tx.goalSheet.upsert({
        where: {
          employeeId_cycleId: {
            employeeId: session.user.id,
            cycleId: CYCLE_ID,
          },
        },
        update: {
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
        create: {
          employeeId: session.user.id,
          cycleId: CYCLE_ID,
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
      });

      const realSheetId = sheet.id;

      // 2. DELETE REMOVED GOALS
      const finalIds = goals
        .filter((g: any) => !String(g.id).startsWith("temp-"))
        .map((g: any) => g.id);

      await tx.goal.deleteMany({
        where: {
          sheetId: realSheetId,
          id: { notIn: finalIds },
        },
      });

      // 3. UPSERT GOALS
      await Promise.all(
        goals.map((g: any) => {
          const isTempId = String(g.id).startsWith("temp-");

          if (isTempId) {
            // temp IDs → always create
            return tx.goal.create({
              data: {
                sheetId: realSheetId,
                title: g.title,
                thrustArea: g.thrustArea,
                uomType: g.uomType,
                direction: g.direction,
                target: g.target,
                weightPct: g.weightPct,
              },
            });
          }

          // real IDs → update
          return tx.goal.update({
            where: { id: g.id },
            data: {
              title: g.title,
              thrustArea: g.thrustArea,
              uomType: g.uomType,
              direction: g.direction,
              target: g.target,
              weightPct: g.weightPct,
            },
          });
        })
      );

      // 4. AUDIT LOG
      await tx.auditLog.create({
        data: {
          entity: "GOAL_SHEET",
          entityId: realSheetId,
          action: "SUBMIT",
          actorId: session.user.id,
          detail: JSON.stringify({
            message: `Employee submitted sheet with ${goals.length} goals.`,
            totalWeight: goals.reduce(
              (sum: number, g: any) => sum + (g.weightPct || 0),
              0
            ),
            timestamp: new Date().toISOString(),
          }),
        },
      });

      return sheet;
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