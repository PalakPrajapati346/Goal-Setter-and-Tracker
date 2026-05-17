import { NextResponse } from "next/server";
import { GoalSheetStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";

export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    const session = await requireUserSession();
    const { goals } = await req.json();

    const result = await prisma.$transaction(async (tx) => {
      
      // 1. ENSURE SHEET EXISTS (Parent)
      // This handles the "PENDING" case by creating the sheet if it doesn't exist
      const sheet = await tx.goalSheet.upsert({
        where: { userId: session.user.id },
        update: { 
          status: "SUBMITTED", 
          submittedAt: new Date() 
        },
        create: {
          userId: session.user.id,
          status: "SUBMITTED",
          cycleId: "adhoc-2026", // Default cycle
          submittedAt: new Date()
        }
      });

      const realSheetId = sheet.id;

      // 2. DELETE REMOVED GOALS
      const finalIds = goals
        .filter((g: any) => !String(g.id).startsWith("temp-"))
        .map((g: any) => g.id);

      await tx.goal.deleteMany({
        where: {
          sheetId: realSheetId,
          id: { notIn: finalIds }
        }
      });

      // 3. UPSERT GOALS (Children)
      await Promise.all(
        goals.map((g: any) => {
          const isTempId = String(g.id).startsWith("temp-");
          return tx.goal.upsert({
            where: { 
              id: isTempId ? "new-goal-placeholder" : g.id 
            },
            update: {
              title: g.title,
              thrustArea: g.thrustArea,
              uomType: g.uomType,
              direction: g.direction,
              target: g.target,
              weightPct: g.weightPct,
            },
            create: {
              sheetId: realSheetId, // Use the real ID from the upserted sheet
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
            totalWeight: goals.reduce((sum: number, g: any) => sum + (g.weightPct || 0), 0),
            timestamp: new Date().toISOString()
          })
        }
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