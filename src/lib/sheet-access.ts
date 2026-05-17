import { GoalSheetStatus, Role } from "@prisma/client";

export function assertSheetRole(opts: {
  role: Role;
  userId: string;
  sheet: { employeeId: string; managerId: string | null };
}) {
  const { role, userId, sheet } = opts;
  if (role === Role.ADMIN) return;
  if (role === Role.EMPLOYEE && sheet.employeeId === userId) return;
  if (role === Role.MANAGER && sheet.managerId === userId) return;
  const err = new Error("Forbidden");
  (err as Error & { status?: number }).status = 403;
  throw err;
}

export function assertEmployeeCanEditSheet(status: GoalSheetStatus) {
  if (status === GoalSheetStatus.DRAFT || status === GoalSheetStatus.REWORK) return;
  const err = new Error("Goal sheet is not editable for employees in the current status.");
  (err as Error & { status?: number }).status = 400;
  throw err;
}

export function assertManagerCanEditSheet(status: GoalSheetStatus) {
  if (status === GoalSheetStatus.SUBMITTED) return;
  const err = new Error("Manager edits are only allowed while the sheet is submitted.");
  (err as Error & { status?: number }).status = 400;
  throw err;
}

export function assertSheetNotLocked(status: GoalSheetStatus, lockedAt: Date | null) {
  if (status !== GoalSheetStatus.APPROVED || !lockedAt) return;
  const err = new Error("This goal sheet is locked.");
  (err as Error & { status?: number }).status = 400;
  throw err;
}
