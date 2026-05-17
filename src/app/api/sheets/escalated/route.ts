import { NextResponse } from "next/server";
import { GoalSheetStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";

export async function GET() {
  const session = await requireUserSession();
  
  // Only Managers and Admins should see escalated alerts
  if (session.user.role !== Role.MANAGER && session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  // LOGIC: Status is SUBMITTED but timestamp is OLDER than 3 days
  const where: any = {
    status: GoalSheetStatus.SUBMITTED,
    submittedAt: {
      lt: threeDaysAgo, // "Less than" means older in date terms
    },
  };

  // If Manager, only show their team's escalated items
  if (session.user.role === Role.MANAGER) {
    where.managerId = session.user.id;
  }

  const escalatedRows = await prisma.goalSheet.findMany({
    where,
    include: {
      employee: { select: { name: true, email: true } },
      cycle: true,
    },
    orderBy: { submittedAt: "desc" }, // Show most overdue first
  });

  return NextResponse.json(escalatedRows);
}