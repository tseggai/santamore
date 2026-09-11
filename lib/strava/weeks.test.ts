import { describe, expect, it } from "vitest";

import { mondayOf, weeklyTotals } from "./weeks";

describe("weeks", () => {
  it("finds Monday for any weekday, Sunday included", () => {
    expect(mondayOf("2026-09-11")).toBe("2026-09-07"); // Friday
    expect(mondayOf("2026-09-13")).toBe("2026-09-07"); // Sunday
    expect(mondayOf("2026-09-07")).toBe("2026-09-07"); // Monday
  });

  it("buckets activities into the trailing weeks, current week last", () => {
    const weeks = weeklyTotals(
      [
        { started_on: "2026-09-11", distance_m: 5000 },
        { started_on: "2026-09-08", distance_m: 3000 },
        { started_on: "2026-09-06", distance_m: 10000 },
        { started_on: "2026-06-01", distance_m: 99999 }, // outside the window
      ],
      "2026-09-11",
      3,
    );
    expect(weeks.map((w) => w.weekStart)).toEqual(["2026-08-24", "2026-08-31", "2026-09-07"]);
    expect(weeks[2]).toEqual({ weekStart: "2026-09-07", distance_m: 8000, count: 2, current: true });
    expect(weeks[1]).toEqual({ weekStart: "2026-08-31", distance_m: 10000, count: 1, current: false });
    expect(weeks[0].count).toBe(0);
  });
});
