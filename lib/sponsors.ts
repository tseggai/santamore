/** One supporter as the public site shows it: who, and what they gave. */
export interface PublicSponsor {
  id: string;
  name: string;
  slug: string;
  logo_path: string | null;
  website: string | null;
  /** Cash given, in cents; 0 when everything was in kind or an offer. */
  cash_cents: number;
  in_kind: boolean;
  tiers: string[];
  offers: number;
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
