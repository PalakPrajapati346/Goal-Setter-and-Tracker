import { NextResponse } from "next/server";
import { CycleKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";

export async function GET(req: Request) {
  await requireUserSession();
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") as CycleKind | null;
  const rows = await prisma.cycle.findMany({
    where: kind ? { kind } : undefined,
    orderBy: { opensAt: "asc" },
  });
  return NextResponse.json(rows);
}
