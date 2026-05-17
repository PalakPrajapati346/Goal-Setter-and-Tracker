import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const session = await requireUserSession();
  const sheet = await prisma.goalSheet.findUnique({
    where: { id: ctx.params.id },
    include: {
      goals: { orderBy: { sortOrder: "asc" } },
      cycle: true,
      employee: { select: { id: true, name: true, email: true } },
      manager: { select: { id: true, name: true, email: true } },
    },
  });

  if (!sheet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.user.role === Role.EMPLOYEE && sheet.employeeId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.user.role === Role.MANAGER && sheet.managerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(sheet);
}
