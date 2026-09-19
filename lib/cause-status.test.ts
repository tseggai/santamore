import { describe, expect, it } from "vitest";

import { causeState, openFirst } from "./cause-status";

const NOW = Date.parse("2026-09-19T12:00:00Z");

describe("causeState", () => {
  it("is open while the end date is ahead and the goal is not met", () => {
    const state = causeState({ goal_cents: 500000, raised_cents: 120000, disbursed_cents: 0, ends_at: "2026-12-31T00:00:00Z" }, NOW);
    expect(state).toEqual({ ended: false, goalReached: false, handedOver: 0, completed: false });
  });

  it("reads goal reached from the figures, not from a flag", () => {
    expect(causeState({ goal_cents: 500000, raised_cents: 500000, ends_at: null }, NOW).goalReached).toBe(true);
    expect(causeState({ goal_cents: null, raised_cents: 500000, ends_at: null }, NOW).goalReached).toBe(false);
    expect(causeState({ goal_cents: 0, raised_cents: 500000, ends_at: null }, NOW).goalReached).toBe(false);
  });

  it("is completed once the end date has passed", () => {
    const state = causeState({ goal_cents: null, raised_cents: 642500, disbursed_cents: 642500, ends_at: "2025-12-31T00:00:00Z" }, NOW);
    expect(state.ended).toBe(true);
    expect(state.completed).toBe(true);
    expect(state.handedOver).toBe(642500);
  });

  it("is completed when everything raised has been handed over, even without an end date", () => {
    expect(causeState({ goal_cents: null, raised_cents: 100000, disbursed_cents: 100000, ends_at: null }, NOW).completed).toBe(true);
    expect(causeState({ goal_cents: null, raised_cents: 100000, disbursed_cents: 40000, ends_at: null }, NOW).completed).toBe(false);
    expect(causeState({ goal_cents: null, raised_cents: 0, disbursed_cents: 0, ends_at: null }, NOW).completed).toBe(false);
  });

  it("treats a missing disbursed figure as nothing handed over", () => {
    expect(causeState({ goal_cents: null, raised_cents: 100, ends_at: null }, NOW).handedOver).toBe(0);
  });
});

describe("openFirst", () => {
  it("lists open causes before completed ones and keeps the order within each", () => {
    const rows = [
      { slug: "old", goal_cents: null, raised_cents: 1, ends_at: "2025-12-31T00:00:00Z" },
      { slug: "new-a", goal_cents: null, raised_cents: 1, ends_at: null },
      { slug: "new-b", goal_cents: null, raised_cents: 1, ends_at: "2027-01-01T00:00:00Z" },
    ];
    expect(openFirst(rows, NOW).map((r) => r.slug)).toEqual(["new-a", "new-b", "old"]);
  });
});
