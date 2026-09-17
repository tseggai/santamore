/** One gift as the public site details it: how much, for what, when. */
export interface GiftDetail {
  /** Null when the gift was in kind or its amount is not published. */
  amount_cents: number | null;
  in_kind: boolean;
  tier: string | null;
  /** The cause or event the gift was on, when it was recorded on one. */
  target: string | null;
  /** ISO date of the cause or event, when known. */
  date: string | null;
}

/** One supporter as the public site shows it: who, and what they gave. */
export interface PublicSponsor {
  id: string;
  name: string;
  slug: string;
  /** An organisation (sponsor, shown with its logo) or an individual (donor, listed by name). */
  kind: "sponsor" | "donor";
  logo_path: string | null;
  website: string | null;
  /** Cash given, in cents; 0 when everything was in kind or an offer. */
  cash_cents: number;
  in_kind: boolean;
  tiers: string[];
  offers: number;
  /** Each deal, when the page fetched them; tiles then open the detail. */
  gifts?: GiftDetail[];
  /** Live challenge offers, linked from the detail. */
  offerLinks?: { href: string; label: string }[];
}

/** One name on the donor wall, with every gift recorded under it. */
export interface DonorEntry {
  name: string;
  /** Sum of the published amounts; null when none is published. */
  total_cents: number | null;
  gifts: GiftDetail[];
}

/** Biggest cash gift first, then in-kind, then offers only; names break ties. */
export function sortSponsors<T extends PublicSponsor>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      b.cash_cents - a.cash_cents ||
      Number(b.in_kind) - Number(a.in_kind) ||
      b.offers - a.offers ||
      a.name.localeCompare(b.name),
  );
}

/**
 * The donor wall groups gifts by name (case-insensitively), so one person
 * who gave several times is one chip whose detail lists each gift.
 * Largest total first; names without a published amount last.
 */
export function groupDonors(rows: { name: string; amount_cents: number | null; target?: string | null; date?: string | null }[]): DonorEntry[] {
  const byName = new Map<string, DonorEntry>();
  for (const row of rows) {
    const name = row.name.trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase();
    const entry = byName.get(key) ?? { name, total_cents: null, gifts: [] };
    entry.gifts.push({ amount_cents: row.amount_cents, in_kind: false, tier: null, target: row.target ?? null, date: row.date ?? null });
    if (row.amount_cents != null) entry.total_cents = (entry.total_cents ?? 0) + row.amount_cents;
    byName.set(key, entry);
  }
  return [...byName.values()].sort((a, b) => (b.total_cents ?? -1) - (a.total_cents ?? -1) || a.name.localeCompare(b.name));
}
