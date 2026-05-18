import { NextResponse } from "next/server";
import { CycleKind, Role } from "@prisma/client";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";

export async function GET(req: Request) {
  const session = await requireUserSession();
  if (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const format = (searchParams.get("format") ?? "csv").toLowerCase();
  const periodRaw = searchParams.get("period");
  const period =
    periodRaw && Object.values(CycleKind).includes(periodRaw as CycleKind)
      ? (periodRaw as CycleKind)
      : null;

  const goals = await prisma.goal.findMany({
    include: {
      sheet: {
        include: {
          employee: { select: { name: true, email: true, department: true } },
          manager: { select: { name: true, email: true } },
          cycle: true,
        },
      },
      updates: period
        ? { where: { period } }
        : { //orderBy: { updatedAt: "desc" }, 
        take: 1 },
    },
    orderBy: [{ sheetId: "asc" }, { sortOrder: "asc" }],
  });

  const rows = goals.map((g) => {
    const upd = g.updates[0];
    
    // Calculate achievement % for the Excel/CSV
    const targetVal = parseFloat(g.target) || 0;
    const actualVal = parseFloat(upd?.actual ?? "0") || 0;
    const achievementPct = targetVal > 0 
      ? ((actualVal / targetVal) * 100).toFixed(2) + "%" 
      : "0%";

    return {
      "Employee Name": g.sheet.employee.name,
      "Department": g.sheet.employee.department,
      "Manager": g.sheet.manager?.name || "N/A",
      "Quarter": period || "Latest",
      "Goal Title": g.title,
      "Thrust Area": g.thrustArea,
      "Weightage (%)": g.weightPct,
      "Planned Target": g.target, // This is the goal setting target
      "Actual Achievement": upd?.actual ?? "0", // This is from quarterly updates
      "Achievement %": achievementPct,
      "Progress Status": upd?.status ?? "Pending",
      "System Score": upd?.progressScore ?? 0,
    };
  });
  const filename = `Achievement_Report_${period || "Full"}`;

  if (format === "xlsx") {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Achievements");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  const csv = Papa.unparse(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}
