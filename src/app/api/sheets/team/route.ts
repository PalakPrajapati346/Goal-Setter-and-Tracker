import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";

export async function GET() {
  const session = await requireUserSession();
  if (session.user.role !== Role.MANAGER && session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where =
    session.user.role === Role.ADMIN ? {} : { managerId: session.user.id };

  const sheets = await prisma.goalSheet.findMany({
    where,
    include: { employee: { select: { id: true, name: true, email: true } }, cycle: true ,goals: {
      include: {
        updates: true 
      }
    }},
    orderBy: { submittedAt: "desc" },
    take: 100,
  });

  return NextResponse.json(sheets);
}
