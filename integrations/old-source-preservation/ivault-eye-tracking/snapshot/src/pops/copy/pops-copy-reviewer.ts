const FORBIDDEN = [
  "watching your eyes",
  "tracking your eyes",
  "eye tracking",
  "tracking your face",
  "watching your face",
  "face tracking",
  "emotion tracking",
  "emotional analysis",
  "surveillance",
  "monitored",
  "suspicious user",
  "fraud detected",
  "cheating",
  "biometric scan",
  "obey",
  "controlled",
] as const;

function normalizeCopy(copy: string): string {
  return copy.trim().toLowerCase();
}

export function reviewPopsUserCopy(copy: string): { safe: boolean; violations: string[] } {
  const hay = normalizeCopy(copy);
  const violations: string[] = [];
  for (const term of FORBIDDEN) {
    if (hay.includes(term)) {
      violations.push(term);
    }
  }
  return { safe: violations.length === 0, violations };
}

export function assertPopsUserCopySafe(copy: string): void {
  const { safe, violations } = reviewPopsUserCopy(copy);
  if (!safe) {
    throw new Error(`Unsafe P.O.P.S user copy: ${violations.join(", ")}`);
  }
}
