import { NextResponse } from "next/server";
import { GoalSheetStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  sheetId: z.string(),
  period: z.enum(["Q1", "Q2", "Q3", "Q4"]),
  comment: z.string().min(3).max(1000),
});

export async function POST(req: Request) {
  try {
    const session = await requireUserSession();

    if (session.user.role === Role.EMPLOYEE) {
      return NextResponse.json({ error: "Forbidden: Employees cannot log check-ins." }, { status: 403 });
    }

    const body = schema.parse(await req.json());

    const sheet = await prisma.goalSheet.findUnique({
      where: { id: body.sheetId },
      // Added employee include to use their name in the audit log
      include: { employee: true },
    });

    if (!sheet) {
      return NextResponse.json({ error: "Goal sheet not found." }, { status: 404 });
    }

    if (session.user.role === Role.MANAGER && sheet.managerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized: This employee is not in your team." }, { status: 403 });
    }

    // --- TRANSACTION START ---
    const result = await prisma.$transaction(async (tx) => {
      // 1. Perform the Upsert for the Check-in
      const row = await tx.checkIn.upsert({
        where: {
          sheetId_period: {
            sheetId: sheet.id,
            period: body.period as any,
          },
        },
        create: {
          sheetId: sheet.id,
          period: body.period as any,
          managerId: session.user.id,
          comment: body.comment,
          completedAt: new Date(),
        },
        update: {
          comment: body.comment,
          completedAt: new Date(),
          managerId: session.user.id,
        },
      });

      // 2. Create the Audit Log Entry
      await tx.auditLog.create({
        data: {
          entity: "CHECK_IN",
          entityId: row.id,
          action: "UPDATE", // Using UPDATE because upsert covers both create/edit
          actorId: session.user.id,
          detail: `Manager ${session.user.name || session.user.email} submitted ${body.period} check-in for ${sheet.employee.name}.`,
          createdAt: new Date(),
        },
      });

      return row;
    });
    // --- TRANSACTION END ---

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Check-in Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  const session = await requireUserSession();

  if (session.user.role !== Role.MANAGER && session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.checkIn.findMany({
    where: session.user.role === Role.MANAGER ? { managerId: session.user.id } : undefined,
    include: {
      sheet: {
        include: {
          employee: { select: { id: true, name: true, email: true } },
          cycle: true,
        },
      },
    },
    orderBy: { completedAt: "desc" },
    take: 200,
  });

  return NextResponse.json(rows);
}