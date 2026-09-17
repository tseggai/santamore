import { describe, expect, it } from "vitest";

import { sortSponsors, type PublicSponsor } from "./sponsors";

const base = { slug: "", logo_path: null, website: null, tiers: [] as string[] };
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
