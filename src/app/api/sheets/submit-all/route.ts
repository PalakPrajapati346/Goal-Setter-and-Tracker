// src/app/api/sheets/submit-all/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const session = await requireUserSession();
    const { goals } = await req.json();

    // 1. Create or Find the sheet
    const sheet = await prisma.goalSheet.upsert({
      where: { userId: session.user.id },
      update: { status: "SUBMITTED" },
      create: { 
        userId: session.user.id, 
        status: "SUBMITTED",
        cycleId: "2026-main" 
      }
    });

    // 2. Delete old draft goals and save the new list
    await prisma.goal.deleteMany({ where: { sheetId: sheet.id } });
    
    await prisma.goal.createMany({
      data: goals.map((g: any) => ({
        sheetId: sheet.id,
        title: g.title,
        thrustArea: g.thrustArea,
        uomType: g.uomType,
        direction: g.direction,
        target: g.target,
        weightPct: g.weightPct
      }))
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}