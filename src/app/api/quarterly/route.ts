import { NextResponse } from "next/server";
import { CycleKind, GoalProgressStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";
import { assertCycleWindow, demoRelaxWindows } from "@/lib/cycles";
import { computeProgressScore } from "@/lib/progress-score";
import { z } from "zod";

const postSchema = z.object({
  period: z.nativeEnum(CycleKind),
  updates: z
    .array(
      z.object({
        goalId: z.string(),
        actual: z.string().min(1),
        status: z.nativeEnum(GoalProgressStatus),
      })
    )
    .min(1),
});

// ... (keep your existing imports)

export async function POST(req: Request) {
  const session = await requireUserSession();
  if (session.user.role !== Role.EMPLOYEE && session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Quarterly updates are filed by employees." }, { status: 403 });
  }

  const body = postSchema.parse(await req.json());
  // ... (keep your period and cycle validation logic)

  const results = [];

  for (const u of body.updates) {
    const goal = await prisma.goal.findUnique({
      where: { id: u.goalId },
      include: { sheet: { include: { cycle: true } } },
    });

    if (!goal) return NextResponse.json({ error: `Goal ${u.goalId} not found` }, { status: 404 });
    
    // --- PROFESSIONAL CHECK: ONLY ALLOW UPDATES IF SHEET IS APPROVED ---
    if (goal.sheet.status !== "APPROVED" && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ 
        error: `Goal sheet must be APPROVED before logging progress for ${goal.title}.` 
      }, { status: 400 });
    }

    // ... (keep your session and shared KPI checks)

    // Calculate score using your helper
    const score = computeProgressScore({
      uomType: goal.uomType,
      direction: goal.direction,
      target: goal.target,
      actual: u.actual,
      deadline: goal.deadline,
    });

    const saved = await prisma.quarterlyGoalUpdate.upsert({
      where: { goalId_period: { goalId: goal.id, period: body.period } },
      create: {
        goalId: goal.id,
        period: body.period,
        plannedTarget: goal.target,
        actual: u.actual,
        status: u.status,
        progressScore: score, // Saved from your Auto-Scoring logic
        // employeeNotes: u.notes, // Add this if you added it to your Zod schema
      },
      update: {
        actual: u.actual,
        status: u.status,
        progressScore: score,
        updatedAt: new Date(),
      },
    });

    results.push(saved);
    // ... (keep your shared KPI sibling update logic)
  }

  return NextResponse.json(results);
}
export async function GET(req: Request) {
  const session = await requireUserSession();
  const { searchParams } = new URL(req.url);
  const sheetId = searchParams.get("sheetId");
  const period = searchParams.get("period") as CycleKind | null;
  if (!sheetId || !period) return NextResponse.json({ error: "sheetId and period required" }, { status: 400 });

  const sheet = await prisma.goalSheet.findUnique({ where: { id: sheetId }, include: { goals: true } });
  if (!sheet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === Role.EMPLOYEE && sheet.employeeId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.user.role === Role.MANAGER && sheet.managerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates = await prisma.quarterlyGoalUpdate.findMany({
    where: { goalId: { in: sheet.goals.map((g) => g.id) }, period },
  });

  return NextResponse.json(updates);
}
