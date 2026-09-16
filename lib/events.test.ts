import { describe, expect, it } from "vitest";

import { activeTiers, parseTiers } from "@/lib/events";

describe("price tiers", () => {
  it("keeps a valid until date and drops a malformed one", () => {
    const tiers = parseTiers([
      { label: "Early bird", amount_cents: 1500, until: "2026-10-01" },
      { label: "Regular", amount_cents: 2000, until: "soon" },
      { label: "Child", amount_cents: 0 },
    ]);
    expect(tiers.map((t) => t.until)).toEqual(["2026-10-01", null, null]);
  });

  it("offers a dated tier through its whole last day and not after", () => {
    const tiers = parseTiers([
      { label: "Early bird", amount_cents: 1500, until: "2026-10-01" },
      { label: "Regular", amount_cents: 2000 },
    ]);
    expect(activeTiers(tiers, new Date("2026-10-01T23:00:00Z")).map((t) => t.label)).toEqual(["Early bird", "Regular"]);
    expect(activeTiers(tiers, new Date("2026-10-02T00:30:00Z")).map((t) => t.label)).toEqual(["Regular"]);
  });
});
