import { isPledgeMode } from "@/lib/org";

/** A row of v_public_fundraiser_pledges or v_public_campaign_pledges (migration 0090). */
export interface PledgeRow {
  pledged_cents: number;
  total_cents: number;
  donor_count: number;
}

export const PLEDGE_COLUMNS = "pledged_cents, total_cents, donor_count";

export interface ShownFigures {
  /** The headline amount. */
  raisedCents: number;
  donorCount: number;
  /** Open pledges, for the "Pledged" line; 0 when there are none. */
  pledgedCents: number;
  /** The headline already includes the pledges (pledge mode). */
  pledgesIncluded: boolean;
}

/**
 * What a page shows for its money. While the site takes pledges only
 * (no bank account yet), a pledger is a donor: the headline is the view's
 * own total of received plus pledged, and the donor count covers both
 * (owner decision 2026-11-25). Once the account is open the headline is
 * money received again, with open pledges on a line of their own. Every
 * figure comes from a view; nothing is added up here.
 */
export function shownFigures(
  totals: { raisedCents: number; donorCount: number },
  pledges: PledgeRow | null | undefined,
  pledgeMode: boolean = isPledgeMode(),
): ShownFigures {
  const pledgedCents = Number(pledges?.pledged_cents ?? 0);
  if (!pledges || pledgedCents <= 0) return { ...totals, pledgedCents: 0, pledgesIncluded: false };
  if (!pledgeMode) return { ...totals, pledgedCents, pledgesIncluded: false };
  return {
    raisedCents: Number(pledges.total_cents),
    donorCount: Number(pledges.donor_count),
    pledgedCents,
    pledgesIncluded: true,
  };
}

/** A pledge row keyed by the page's, team's or cause's slug. */
export type PledgeRowBySlug = PledgeRow & { slug: string };

/**
 * A board in pledge mode: each row's amount (and donor count, where the row
 * has one) becomes the view's received-plus-pledged figure, and the board
 * is ranked again by it. Outside pledge mode the rows come back untouched:
 * a board ranks money received.
 */
export function countPledges<T extends { slug: string; raised_cents: number; donor_count?: number }>(
  rows: T[],
  pledges: PledgeRowBySlug[] | null | undefined,
  pledgeMode: boolean = isPledgeMode(),
): T[] {
  if (!pledgeMode || !pledges || pledges.length === 0) return rows;
  const bySlug = new Map(pledges.map((row) => [row.slug, row]));
  return rows
    .map((row) => {
      const pledge = bySlug.get(row.slug);
      if (!pledge || Number(pledge.pledged_cents) <= 0) return row;
      return {
        ...row,
        raised_cents: Number(pledge.total_cents),
        ...(row.donor_count === undefined ? {} : { donor_count: Number(pledge.donor_count) }),
      };
    })
    .sort((a, b) => b.raised_cents - a.raised_cents);
}
