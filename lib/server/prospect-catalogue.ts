import "server-only";

import catalogue from "@/content/prospects/catalogue.json";
import type { CatalogueEntry, CatalogueFacet } from "@/lib/prospects";

/**
 * The researched organisations the console develops its prospect list from.
 * Server only: the list of whom we approach is internal (the team guide's
 * rule), so it is read by the staff actions and never shipped to a browser
 * as a whole. Every fact in it comes from a published page kept in the
 * entry's `sources`; lib/prospect-catalogue.test.ts checks its shape.
 */
export const CATALOGUE = catalogue as unknown as CatalogueEntry[];

/** The entries reduced to what the criteria form counts with. */
export function catalogueFacets(): CatalogueFacet[] {
  return CATALOGUE.map((entry) => ({
    key: entry.key,
    kind: entry.kind,
    sector: entry.sector,
    area: entry.area,
    tier_fit: entry.tier_fit,
    hasPerson: Boolean(entry.contact_name),
  }));
}
