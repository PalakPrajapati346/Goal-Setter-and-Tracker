import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";
import { GoalSheetStatus } from "@prisma/client";

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const session = await requireUserSession();
  const sheetId = ctx.params.id;

  const sheet = await prisma.goalSheet.findUnique({
    where: { id: sheetId },
    include: { goals: true }
  });

  if (!sheet || sheet.employeeId !== session.user.id) {
    return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
  }

  // 1. Validate Hackathon Rules: Max 8 goals, Total weight 100%
  const totalWeight = sheet.goals.reduce((sum, g) => sum + Number(g.weightPct), 0);
  
  if (sheet.goals.length > 8) {
    return NextResponse.json({ error: "Maximum 8 goals allowed" }, { status: 400 });
  }
  
  if (Math.abs(totalWeight - 100) > 0.01) {
    return NextResponse.json({ error: `Total weight must be 100% (Current: ${totalWeight}%)` }, { status: 400 });
  }

  // 2. Check if every goal is at least 10%
  const smallGoal = sheet.goals.find(g => Number(g.weightPct) < 10);
  if (smallGoal) {
    return NextResponse.json({ error: "Minimum weightage per goal is 10%" }, { status: 400 });
  }

  // 3. Update status to SUBMITTED
  const updatedSheet = await prisma.goalSheet.update({
    where: { id: sheetId },
    data: { 
      status: GoalSheetStatus.SUBMITTED,
      submittedAt: new Date()
    }
  });

  return NextResponse.json(updatedSheet);
}