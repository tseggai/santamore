import type { Cents } from "@/lib/money";

/** The figures a cause's state is read from; every one is a record. */
export interface CauseFigures {
  goal_cents: Cents | null;
  raised_cents: Cents;
  /** Published hand-overs plus those recorded on a year report; absent before migration 0044. */
  disbursed_cents?: Cents | null;
  ends_at: string | null;
}

export interface CauseState {
  /** The cause's end date has passed. */
  ended: boolean;
  /** Raised at least the goal. Only a cause with a goal can reach it. */
  goalReached: boolean;
  /** Money was handed over to the beneficiaries. */
  handedOver: Cents;
  /** Ended, or everything raised has been handed over: nothing left to do. */
  completed: boolean;
}

/**
 * What a cause's own records say about where it stands. Nothing here is
 * set by hand: the end date, the goal, what came in and what went out.
 */
export function causeState(cause: CauseFigures, now: number = Date.now()): CauseState {
  const ended = cause.ends_at !== null && new Date(cause.ends_at).getTime() < now;
  const goalReached = cause.goal_cents !== null && cause.goal_cents > 0 && cause.raised_cents >= cause.goal_cents;
  const handedOver = cause.disbursed_cents ?? 0;
  const completed = ended || (handedOver > 0 && cause.raised_cents > 0 && handedOver >= cause.raised_cents);
  return { ended, goalReached, handedOver, completed };
}

/** Open causes first, then the completed ones; each group keeps its order. */
export function openFirst<T extends CauseFigures>(causes: T[], now: number = Date.now()): T[] {
  return [...causes].sort((a, b) => Number(causeState(a, now).completed) - Number(causeState(b, now).completed));
}
