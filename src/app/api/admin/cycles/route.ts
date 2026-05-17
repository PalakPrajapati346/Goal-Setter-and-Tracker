import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";

export async function POST(req: Request) {
  const session = await requireUserSession();
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { name, kind, year, opensAt, closesAt } = body;

  try {
    const newCycle = await prisma.cycle.create({
      data: {
        name,
        kind,
        year: parseInt(year),
        opensAt: new Date(opensAt),
        closesAt: new Date(closesAt),
      },
    });
    return NextResponse.json(newCycle);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create cycle" }, { status: 500 });
  }
}

export async function GET() {
  const cycles = await prisma.cycle.findMany({
    orderBy: { opensAt: 'desc' }
  });
  return NextResponse.json(cycles);
}