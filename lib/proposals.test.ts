import { describe, expect, it } from "vitest";

import { allAnswered, failedCriteria } from "@/lib/proposals";

const criteria = [
  { id: "gov", disqualify_on: true },
  { id: "montenegro", disqualify_on: false },
];

describe("cause screening", () => {
  it("turns down on the disqualifying answer only", () => {
    expect(failedCriteria(criteria, { gov: false, montenegro: true })).toEqual([]);
    expect(failedCriteria(criteria, { gov: true, montenegro: true }).map((c) => c.id)).toEqual(["gov"]);
    expect(failedCriteria(criteria, { gov: false, montenegro: false }).map((c) => c.id)).toEqual(["montenegro"]);
  });

  it("requires every question answered", () => {
    expect(allAnswered(criteria, { gov: false })).toBe(false);
    expect(allAnswered(criteria, { gov: false, montenegro: true })).toBe(true);
  });
});
