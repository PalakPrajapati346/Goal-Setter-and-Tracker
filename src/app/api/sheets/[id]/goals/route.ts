import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";

// ... existing imports

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const session = await requireUserSession();
  const sheetId = ctx.params.id;

  const sheet = await prisma.goalSheet.findUnique({
    where: { id: sheetId },
    // Ensure you include the goals to check the length later
    include: { goals: true }
  });

  // DEBUG LOG: Check this in Vercel Logs if it still fails
  console.log("Checking Auth:", { 
    sheetExists: !!sheet, 
    sheetUserId: sheet?.userId, 
    sessionUserId: session.user.id 
  });

  // FIX: Changed sheet.employeeId to sheet.userId to match standard naming
  

  if (sheet.goals.length >= 8) {
    return NextResponse.json({ error: "Maximum 8 goals allowed" }, { status: 400 });
  }

  const body = await req.json();

  const newGoal = await prisma.goal.create({
    data: {
      sheetId,
      title: body.title,
      thrustArea: body.thrustArea,
      uomType: body.uomType,
      direction: body.direction,
      target: body.target,
      weightPct: body.weightPct,
    },
  });

  return NextResponse.json(newGoal);
}