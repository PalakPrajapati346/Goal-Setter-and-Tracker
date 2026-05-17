import { PrismaClient, Role, CycleKind, GoalSheetStatus, UomType, UomDirection } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Demo123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.local" },
    update: {},
    create: {
      email: "admin@demo.local",
      passwordHash: password,
      name: "Alex Admin",
      role: Role.ADMIN,
      department: "HR",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@demo.local" },
    update: {},
    create: {
      email: "manager@demo.local",
      passwordHash: password,
      name: "Morgan Manager",
      role: Role.MANAGER,
      department: "Operations",
      managerId: admin.id,
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: "employee@demo.local" },
    update: {},
    create: {
      email: "employee@demo.local",
      passwordHash: password,
      name: "Ed Employee",
      role: Role.EMPLOYEE,
      department: "Operations",
      managerId: manager.id,
    },
  });

  const employee2 = await prisma.user.upsert({
    where: { email: "employee2@demo.local" },
    update: {},
    create: {
      email: "employee2@demo.local",
      passwordHash: password,
      name: "Erin Employee",
      role: Role.EMPLOYEE,
      department: "Operations",
      managerId: manager.id,
    },
  });

  const year = new Date().getFullYear();
  const cycles = [
    {
      name: `FY${year} Goal Setting`,
      kind: CycleKind.GOAL_SETTING,
      opensAt: new Date(year, 4, 1),
      closesAt: new Date(year, 5, 30),
    },
    {
      name: `FY${year} Q1 Check-in`,
      kind: CycleKind.Q1,
      opensAt: new Date(year, 6, 1),
      closesAt: new Date(year, 6, 31),
    },
    {
      name: `FY${year} Q2 Check-in`,
      kind: CycleKind.Q2,
      opensAt: new Date(year, 9, 1),
      closesAt: new Date(year, 9, 31),
    },
    {
      name: `FY${year} Q3 Check-in`,
      kind: CycleKind.Q3,
      opensAt: new Date(year + 1, 0, 1),
      closesAt: new Date(year + 1, 0, 31),
    },
    {
      name: `FY${year} Q4 / Annual`,
      kind: CycleKind.Q4,
      opensAt: new Date(year + 1, 2, 1),
      closesAt: new Date(year + 1, 3, 30),
    },
  ];

  for (const c of cycles) {
    await prisma.cycle.upsert({
      where: { id: `seed-${c.kind}-${year}` },
      update: {
        name: c.name,
        opensAt: c.opensAt,
        closesAt: c.closesAt,
      },
      create: {
        id: `seed-${c.kind}-${year}`,
        name: c.name,
        kind: c.kind,
        year,
        opensAt: c.opensAt,
        closesAt: c.closesAt,
      },
    });
  }

  const goalCycle = await prisma.cycle.findFirstOrThrow({
    where: { kind: CycleKind.GOAL_SETTING, year },
  });

  const sheet = await prisma.goalSheet.upsert({
    where: {
      employeeId_cycleId: { employeeId: employee.id, cycleId: goalCycle.id },
    },
    update: {},
    create: {
      employeeId: employee.id,
      managerId: manager.id,
      cycleId: goalCycle.id,
      status: GoalSheetStatus.DRAFT,
    },
  });

  const count = await prisma.goal.count({ where: { sheetId: sheet.id } });
  if (count === 0) {
    await prisma.goal.createMany({
      data: [
        {
          sheetId: sheet.id,
          title: "Revenue growth",
          description: "Grow portfolio revenue",
          thrustArea: "Growth",
          uomType: UomType.NUMERIC,
          direction: UomDirection.MIN_HIGHER_BETTER,
          target: "1000000",
          weightPct: 32,
          sortOrder: 0,
        },
        {
          sheetId: sheet.id,
          title: "Customer TAT",
          description: "Reduce turnaround time",
          thrustArea: "Efficiency",
          uomType: UomType.NUMERIC,
          direction: UomDirection.MAX_LOWER_BETTER,
          target: "48",
          weightPct: 24,
          sortOrder: 1,
        },
        {
          sheetId: sheet.id,
          title: "Safety incidents",
          thrustArea: "Safety",
          uomType: UomType.ZERO_BASED,
          direction: UomDirection.MIN_HIGHER_BETTER,
          target: "0",
          weightPct: 24,
          sortOrder: 2,
        },
      ],
    });
  }

  // Shared KPI for two employees (read-only title/target on instances)
  const shared = await prisma.sharedGoalDefinition.upsert({
    where: { id: `seed-shared-cost-${year}` },
    update: {},
    create: {
      id: `seed-shared-cost-${year}`,
      title: "Department cost reduction",
      description: "Shared KPI",
      thrustArea: "Finance",
      uomType: UomType.PERCENT,
      direction: UomDirection.MAX_LOWER_BETTER,
      target: "5",
      createdById: admin.id,
      primaryOwnerId: employee.id,
    },
  });

  for (const emp of [employee, employee2]) {
    const s = await prisma.goalSheet.upsert({
      where: { employeeId_cycleId: { employeeId: emp.id, cycleId: goalCycle.id } },
      update: {},
      create: {
        employeeId: emp.id,
        managerId: manager.id,
        cycleId: goalCycle.id,
        status: GoalSheetStatus.DRAFT,
      },
    });
    const exists = await prisma.goal.findFirst({
      where: { sheetId: s.id, sharedDefId: shared.id },
    });
    if (!exists) {
    await prisma.goal.create({
      data: {
        sheetId: s.id,
        sharedDefId: shared.id,
        title: shared.title,
        description: shared.description,
        thrustArea: shared.thrustArea,
        uomType: shared.uomType,
        direction: shared.direction,
        target: shared.target,
        deadline: shared.deadline,
        weightPct: 20,
        readOnlyTitleTarget: true,
        isPrimaryOwner: emp.id === employee.id,
        sortOrder: 99,
      },
    });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
