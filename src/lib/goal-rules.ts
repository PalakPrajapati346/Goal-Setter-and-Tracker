const MIN_WEIGHT = 10;
const MAX_GOALS = 8;

// src/lib/goal-rules.ts

export function validateGoalWeights(goals: { weightPct: any }[]) {
  const errors: string[] = [];
  let sum = 0;

  for (const g of goals) {
    const w = parseFloat(String(g.weightPct)) || 0;
    if (w < 10) errors.push("Each goal must be at least 10% weightage.");
    sum += w;
  }

  // CHANGE THIS LINE: 
  // Only error if it EXCEEDS 100. 
  // We check for "Exactly 100" in the SUBMIT route, not the PATCH route.
  if (sum > 100.01) {
    errors.push(`Total weightage cannot exceed 100%. Currently: ${sum}%`);
  }

  return { ok: errors.length === 0, errors };
}