/**
 * Screening a proposed cause against staff-maintained yes/no questions.
 * Pure: the same function judges on the server (the truth) and in the
 * form (the polite early warning).
 */
export interface Criterion {
  id: string;
  /** The answer that turns a proposal down. */
  disqualify_on: boolean;
}

/** Ids of the criteria whose answer disqualifies; empty means it passes. */
export function failedCriteria<T extends Criterion>(criteria: T[], answers: Record<string, boolean | undefined>): T[] {
  return criteria.filter((criterion) => answers[criterion.id] === criterion.disqualify_on);
}

/** Every question answered, one way or the other. */
export function allAnswered(criteria: Criterion[], answers: Record<string, boolean | undefined>): boolean {
  return criteria.every((criterion) => typeof answers[criterion.id] === "boolean");
}

export const SHORTLIST_SIZE = 5;
