export const ASSIGNMENT_SCORE_LABELS = {
  1: "1 — Guess",
  2: "2 — Weak signal",
  3: "3 — User confirmed",
  4: "4 — Strong reused",
  5: "5 — Known rule",
} as const;

export type AssignmentScore = keyof typeof ASSIGNMENT_SCORE_LABELS;

export function assignmentScoreLabel(
  score: number | null | undefined
): string | null {
  if (score !== 1 && score !== 2 && score !== 3 && score !== 4 && score !== 5) {
    return null;
  }
  return ASSIGNMENT_SCORE_LABELS[score];
}
