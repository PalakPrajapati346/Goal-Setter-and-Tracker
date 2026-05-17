import type { CycleKind, UomDirection, UomType } from "@prisma/client";

export type ProgressInput = {
  uomType: UomType;
  direction: UomDirection;
  target: string;
  actual: string;
  deadline?: Date | null;
};

/** Returns 0-100 score for tracking only (not performance ratings). */
export function computeProgressScore(input: ProgressInput): number | null {
  const t = input.target.trim();
  const a = input.actual.trim();
  if (!t || !a) return null;

  if (input.uomType === "ZERO_BASED") {
    const av = Number(a);
    if (Number.isNaN(av)) return null;
    return av === 0 ? 100 : 0;
  }

  if (input.uomType === "TIMELINE") {
    const done = new Date(a);
    const end = input.deadline ?? new Date(t);
    if (Number.isNaN(done.getTime()) || Number.isNaN(end.getTime())) return null;
    if (done.getTime() <= end.getTime()) return 100;
    const msPerDay = 86400000;
    const lateDays = Math.max(0, (done.getTime() - end.getTime()) / msPerDay);
    return Math.max(0, 100 - Math.min(100, lateDays * 2));
  }

  const target = Number(t);
  const actual = Number(a);
  if (Number.isNaN(target) || Number.isNaN(actual) || target === 0 || actual === 0) {
    return null;
  }

  if (input.direction === "MIN_HIGHER_BETTER") {
    const raw = (actual / target) * 100;
    return clamp(raw);
  }
  const raw = (target / actual) * 100;
  return clamp(raw);
}

function clamp(n: number) {
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n * 100) / 100));
}

export function isQuarterlyKind(kind: CycleKind) {
  return kind === "Q1" || kind === "Q2" || kind === "Q3" || kind === "Q4";
}
