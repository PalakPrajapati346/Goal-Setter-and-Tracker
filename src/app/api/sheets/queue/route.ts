import { NextResponse } from "next/server";
import { GoalSheetStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";

export async function GET() {
  const session = await requireUserSession();
  if (session.user.role !== Role.MANAGER && session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 1. Calculate the cutoff (72 hours ago)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  // 2. Build the where clause with the date filter
  // This ensures sheets OLDER than 3 days disappear from this list
  const where: any = {
    status: GoalSheetStatus.SUBMITTED,
    submittedAt: {
      gte: threeDaysAgo, // Greater than or equal to 3 days ago (Recent)
    },
  };

  // 3. Add Role-based filtering
  if (session.user.role === Role.MANAGER) {
    where.managerId = session.user.id;
  }

  const rows = await prisma.goalSheet.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, email: true } },
      cycle: true,
      goals: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { submittedAt: "asc" },
  });

  return NextResponse.json(rows);
}