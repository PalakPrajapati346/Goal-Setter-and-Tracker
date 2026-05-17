import { CycleKind } from "@prisma/client";

export function nowInWindow(opensAt: Date, closesAt: Date) {
  const n = Date.now();
  return n >= opensAt.getTime() && n <= closesAt.getTime();
}

export function assertCycleWindow(
  kind: CycleKind,
  opensAt: Date,
  closesAt: Date,
  relax: boolean
) {
  if (relax) return;
  if (!nowInWindow(opensAt, closesAt)) {
    throw new Error(`This action is outside the active window for ${kind}.`);
  }
}

export function demoRelaxWindows() {
  return process.env.DEMO_RELAX_WINDOWS === "true";
}
