import { describe, expect, it } from "vitest";

import { activeTiers, distanceNames, parseDistances, parseTiers, tiersFor } from "@/lib/events";

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

describe("distances", () => {
  it("reads plain names and named distances with places", () => {
    expect(parseDistances(["5 km", " ", { name: "Half 1.9 / 90 / 21", capacity: 350 }, { name: "Olympic", capacity: -1 }, { capacity: 3 }])).toEqual([
      { name: "5 km", capacity: null },
      { name: "Half 1.9 / 90 / 21", capacity: 350 },
      { name: "Olympic", capacity: null },
    ]);
    expect(distanceNames([{ name: "10 km", capacity: 100 }, "5 km"])).toEqual(["10 km", "5 km"]);
  });

  it("offers a distance its own tiers and the general ones", () => {
    const tiers = parseTiers([
      { label: "Half early", amount_cents: 18990, distance: "Half" },
      { label: "Olympic early", amount_cents: 13990, distance: "Olympic" },
      { label: "Child", amount_cents: 0 },
    ]);
    expect(tiersFor(tiers, "Half").map((t) => t.label)).toEqual(["Half early", "Child"]);
    expect(tiersFor(tiers, null).map((t) => t.label)).toEqual(["Child"]);
  });
});
