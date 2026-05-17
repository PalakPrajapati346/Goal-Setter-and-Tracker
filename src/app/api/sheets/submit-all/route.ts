// src/app/api/sheets/submit-all/route.ts
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const session = await requireUserSession();
    const { goals } = await req.json();

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      
      // 1. Get the cycle by name
      const cycle = await tx.cycle.findFirst({
        where: { name: "Cycle1" },
        select: { id: true },
      });
      if (!cycle) throw new Error("Cycle 'Cycle1' not found.");

      // 2. Fetch the current user to get their managerId
      const currentUser = await tx.user.findUnique({
        where: { id: session.user.id },
        select: { managerId: true },
      });
      if (!currentUser) throw new Error("User not found.");

      // 3. Upsert the sheet with managerId
      const sheet = await tx.goalSheet.upsert({
        where: {
          employeeId_cycleId: {
            employeeId: session.user.id,
            cycleId: cycle.id,
          },
        },
        update: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          managerId: currentUser.managerId,  // update in case manager changed
        },
        create: {
          employeeId: session.user.id,
          cycleId: cycle.id,
          managerId: currentUser.managerId,  // nullable, fine if null
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
      });

      // 4. Delete old goals and recreate
      await tx.goal.deleteMany({ where: { sheetId: sheet.id } });

      await tx.goal.createMany({
        data: goals.map((g: any) => ({
          sheetId: sheet.id,
          title: g.title,
          thrustArea: g.thrustArea,
          uomType: g.uomType,
          direction: g.direction,
          target: g.target,
          weightPct: g.weightPct,
        })),
      });

      return sheet;
    });

    return NextResponse.json({ success: true, sheetId: result.id });
  } catch (error: any) {
    console.error("SUBMIT_ALL_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}