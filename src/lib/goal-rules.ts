const MIN_WEIGHT = 10;
const MAX_GOALS = 8;

// src/lib/goal-rules.ts

export function parseDecimalWeight(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === "") {
    return null;
  }

  // Convert to number if it's a string
  const parsed = typeof input === "string" ? parseFloat(input) : input;

  // Check if it's a valid finite number
  if (isNaN(parsed) || !isFinite(parsed)) {
    return null;
  }

  // Optional: You can round to 2 decimal places to match database precision
  return Math.round(parsed * 100) / 100;
}

/**
 * Validates that the total weight of all goals in a sheet is exactly 100%.
 */
export function validateGoalWeights(goals: { weightPct: number | any }[]) {
  const totalWeight = goals.reduce((sum, g) => {
    // Ensure we handle Decimal objects from Prisma by wrapping in Number()
    return sum + Number(g.weightPct || 0);
  }, 0);

  // Using a small epsilon for floating point comparison (e.g., 99.99999999)
  const isValid = Math.abs(totalWeight - 100) < 0.01;

  if (!isValid) {
    return {
      ok: false,
      errors: [`Total weight must be exactly 100%. Current total: ${totalWeight}%`],
    };
  }

  return { ok: true };
}