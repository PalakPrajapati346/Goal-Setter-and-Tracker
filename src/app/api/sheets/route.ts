import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";
import { GoalSheetStatus } from "@prisma/client";

/**
 * GET: Fetch all sheets (usually for Admin/Manager overview)
 */
export async function GET() {
  try {
    const session = await requireUserSession();

    // If Admin, they might want to see everything
    const sheets = await prisma.goalSheet.findMany({
      include: {
        user: {
          select: { name: true, email: true }
        },
        goals: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(sheets);
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/**
 * POST: Auto-initialize a new sheet for the current user
 */
export async function POST() {
  try {
    const session = await requireUserSession();
  
  // DEBUG: This will show up in your Vercel logs
  console.log("Current Session:", JSON.stringify(session));

  if (!session?.user?.id) {
    return NextResponse.json({ 
      error: "Session missing user ID", 
      debug: !!session 
    }, { status: 401 });
  }
    

    // 1. Check if a sheet already exists to prevent duplicates
    const existing = await prisma.goalSheet.findFirst({
      where: { userId: session.user.id },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    // 2. Create a new "Ad-hoc" sheet
    // Note: We use a generic cycle name since it's being auto-created
    const newSheet = await prisma.goalSheet.create({
      data: {
        userId: session.user.id,
        status: GoalSheetStatus.DRAFT,
        // Using a default cycle name if none is configured
        cycleId: "adhoc-2026", 
      },
    });

    return NextResponse.json(newSheet);
  } catch (error: any) {
    console.error("Sheet creation error:", error);
    return NextResponse.json(
      { error: "Failed to initialize goal sheet: " + error.message },
      { status: 500 }
    );
  }
}