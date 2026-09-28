import { describe, expect, it } from "vitest";

import { LEGAL_DOC_IDS, legalDoc, legalDocsByCategory, publicLegalDoc } from "./legal-docs";

describe("legal documents", () => {
  it("ships every document of the manifest in Montenegrin and English", () => {
    expect(LEGAL_DOC_IDS.length).toBe(13);
    for (const id of LEGAL_DOC_IDS) {
      const doc = legalDoc(id)!;
      expect(doc.langs, id).toEqual(expect.arrayContaining(["me", "en"]));
      expect(doc.title.me, id).toBeTruthy();
      expect(doc.title.en, id).toBeTruthy();
      expect(doc.html.me, id).toContain("<");
      expect(doc.bilingualHtml, id).toContain('class="en"');
      expect(doc.bilingualHtml, id).not.toMatch(/<script|javascript:/i);
    }
  });

  it("publishes the public documents in all three languages", () => {
    const published = LEGAL_DOC_IDS.map((id) => legalDoc(id)!).filter((doc) => doc.route);
    expect(published.map((doc) => doc.id).sort()).toEqual(["child-safeguarding-policy", "code-of-conduct", "donation-policy", "event-terms-and-waiver", "impressum", "privacy-policy", "terms-of-use"]);
    for (const doc of published) {
      expect(doc.langs, doc.id).toEqual(["me", "en", "ru"]);
      for (const locale of ["me", "en", "ru"] as const) {
        const page = publicLegalDoc(doc.id, locale)!;
        expect(page.title, `${doc.id} ${locale}`).toBeTruthy();
        expect(page.html, `${doc.id} ${locale}`).toMatch(/<h[23]>/);
      }
      // The public part leaves the internal part out.
      expect(publicLegalDoc(doc.id, "en")!.html.length).toBeLessThanOrEqual(doc.html.en!.length);
    }
  });

  it("groups the documents by category", () => {
    expect(legalDocsByCategory("board").map((d) => d.id)).toEqual(["child-safeguarding-policy", "grants-criteria", "chapter-rules", "conflict-of-interest-policy"]);
    expect(legalDocsByCategory("template").map((d) => d.id)).toEqual(["volunteer-agreement", "sponsorship-agreement", "beneficiary-application-form"]);
  });
});
