import { describe, expect, it } from "vitest";

import { calculateFeeCents, grossWithFeeCents } from "@/lib/fees";

describe("calculateFeeCents", () => {
  it("matches the prototype formula: €25 → €0.73 (2.1% + €0.20, half-up)", () => {
    // 2500 × 0.021 = 52.5 → rounds half-up to 53, + 20 fixed = 73.
    expect(calculateFeeCents(2500)).toBe(73);
  });

  it("charges the fixed part on tiny gifts", () => {
    expect(calculateFeeCents(100)).toBe(22); // 2.1 → 2 + 20
    expect(calculateFeeCents(1)).toBe(20); // 0.021 → 0 + 20
  });

  it("rounds half-up, not banker's", () => {
    // 500 × 0.021 = 10.5 → 11, not 10.
    expect(calculateFeeCents(500)).toBe(31);
  });

  it("handles the suggested amounts", () => {
    expect(calculateFeeCents(1000)).toBe(41); // 21 + 20
    expect(calculateFeeCents(5000)).toBe(125); // 105 + 20
  });

  it("stays exact on large amounts where floats would drift", () => {
    // €1,000,000.00 → 2.1% = €21,000.00 exactly.
    expect(calculateFeeCents(100_000_000)).toBe(2_100_020);
  });

  it("rejects non-positive and non-cent input", () => {
    expect(() => calculateFeeCents(0)).toThrow(RangeError);
    expect(() => calculateFeeCents(-2500)).toThrow();
    expect(() => calculateFeeCents(25.5)).toThrow();
  });
});

describe("grossWithFeeCents", () => {
  it("adds the fee on top", () => {
    expect(grossWithFeeCents(2500)).toBe(2573);
    expect(grossWithFeeCents(1000)).toBe(1041);
  });
});
