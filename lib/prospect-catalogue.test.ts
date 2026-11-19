import { describe, expect, it } from "vitest";

import catalogue from "@/content/prospects/catalogue.json";
import { PROSPECT_AREAS, PROSPECT_KINDS, PROSPECT_SECTORS, PROSPECT_TIERS, catalogueKey, type CatalogueEntry } from "@/lib/prospects";

const entries = catalogue as unknown as CatalogueEntry[];
const isUrl = (value: string) => /^https?:\/\/\S+$/.test(value);

describe("prospect catalogue", () => {
  it("uses the vocabulary and keys every entry by its name, once", () => {
    const seen = new Set<string>();
    for (const entry of entries) {
      expect(entry.name.trim().length, entry.key).toBeGreaterThan(1);
      expect(entry.key, entry.name).toBe(catalogueKey(entry.name));
      expect(seen.has(entry.key), `duplicate ${entry.key}`).toBe(false);
      seen.add(entry.key);
      expect(PROSPECT_KINDS, entry.key).toContain(entry.kind);
      expect(PROSPECT_SECTORS, entry.key).toContain(entry.sector);
      expect(PROSPECT_AREAS, entry.key).toContain(entry.area);
      if (entry.tier_fit !== null) expect(PROSPECT_TIERS, entry.key).toContain(entry.tier_fit);
    }
  });

  it("keeps a published source for every entry and for every named person", () => {
    for (const entry of entries) {
      expect(entry.sources.length, entry.key).toBeGreaterThan(0);
      for (const source of entry.sources) expect(isUrl(source), `${entry.key}: ${source}`).toBe(true);
      if (entry.website) expect(isUrl(entry.website), entry.key).toBe(true);
      if (entry.contact_name) expect(entry.contact_source && isUrl(entry.contact_source), `${entry.key}: a named person needs the page that names them`).toBeTruthy();
      if (entry.email) expect(entry.email, entry.key).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      if (entry.contact_email) expect(entry.contact_email, entry.key).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    }
  });
});
