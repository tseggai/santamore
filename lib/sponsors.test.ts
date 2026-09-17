import { describe, expect, it } from "vitest";

import { groupDonors, sortSponsors, type PublicSponsor } from "./sponsors";

const base = { slug: "", kind: "sponsor" as const, logo_path: null, website: null, tiers: [] as string[] };
const row = (id: string, extra: Partial<PublicSponsor>): PublicSponsor => ({
  id,
  name: id,
  cash_cents: 0,
  in_kind: false,
  offers: 0,
  ...base,
  ...extra,
});

describe("sortSponsors", () => {
  it("puts the biggest cash gift first, then in-kind, then offers, then names", () => {
    const sorted = sortSponsors([
      row("offer-only", { offers: 1 }),
      row("zed-in-kind", { in_kind: true }),
      row("small", { cash_cents: 50_000 }),
      row("big", { cash_cents: 100_000 }),
      row("alpha-in-kind", { in_kind: true }),
    ]);
    expect(sorted.map((s) => s.id)).toEqual(["big", "small", "alpha-in-kind", "zed-in-kind", "offer-only"]);
  });

  it("does not mutate its input", () => {
    const rows = [row("b", { cash_cents: 1 }), row("a", { cash_cents: 2 })];
    sortSponsors(rows);
    expect(rows.map((s) => s.id)).toEqual(["b", "a"]);
  });
});

describe("groupDonors", () => {
  it("merges repeated names, sums their gifts and keeps each gift", () => {
    const wall = groupDonors([
      { name: "Ana", amount_cents: 1000 },
      { name: "Marko", amount_cents: 5000 },
      { name: "ana", amount_cents: 2500 },
      { name: "Anonymous", amount_cents: null },
    ]);
    expect(wall.map((d) => [d.name, d.total_cents, d.gifts.length])).toEqual([
      ["Marko", 5000, 1],
      ["Ana", 3500, 2],
      ["Anonymous", null, 1],
    ]);
  });
});
