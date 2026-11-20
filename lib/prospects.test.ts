import { describe, expect, it } from "vitest";

import { catalogueKey, composeMessage, tierFrom, followUpAfter, followUpDays, instagramLink, isDue, isMobile, mailtoLink, matchesCriteria, phoneDigits, whatsappLink, type ProspectCriteria } from "@/lib/prospects";

const any: ProspectCriteria = { kinds: [], sectors: [], areas: [], tiers: [], personOnly: false };
const bank = { kind: "sponsor", sector: "bank", area: "national", tier_fit: "gold", hasPerson: true } as const;
const radio = { kind: "media", sector: "media", area: "tivat", tier_fit: null, hasPerson: false } as const;

describe("prospect criteria", () => {
  it("takes everything when nothing is picked", () => {
    expect(matchesCriteria(bank, any)).toBe(true);
    expect(matchesCriteria(radio, any)).toBe(true);
  });

  it("narrows by kind, sector, area and a named person", () => {
    expect(matchesCriteria(bank, { ...any, kinds: ["media"] })).toBe(false);
    expect(matchesCriteria(bank, { ...any, sectors: ["bank", "insurance"] })).toBe(true);
    expect(matchesCriteria(bank, { ...any, areas: ["tivat"] })).toBe(false);
    expect(matchesCriteria(radio, { ...any, personOnly: true })).toBe(false);
  });

  it("applies a tier to sponsors only", () => {
    expect(matchesCriteria(bank, { ...any, tiers: ["local"] })).toBe(false);
    expect(matchesCriteria(bank, { ...any, tiers: ["gold", "silver"] })).toBe(true);
    expect(matchesCriteria(radio, { ...any, tiers: ["local"] })).toBe(true);
  });

  it("keys an entry by its name, diacritics folded", () => {
    expect(catalogueKey("Lovćen osiguranje a.d.")).toBe("lovcen-osiguranje-a-d");
    expect(catalogueKey("  Đak Sport  ")).toBe("djak-sport");
  });
});

describe("follow-ups", () => {
  it("counts days and knows what is due", () => {
    expect(followUpDays("2026-11-24", "2026-11-19")).toBe(5);
    expect(followUpDays("2026-11-19", "2026-11-19")).toBe(0);
    expect(followUpDays(null, "2026-11-19")).toBeNull();
    expect(isDue({ stage: "contacted", next_follow_up: "2026-11-18" }, "2026-11-19")).toBe(true);
    expect(isDue({ stage: "contacted", next_follow_up: "2026-11-20" }, "2026-11-19")).toBe(false);
    expect(isDue({ stage: "won", next_follow_up: "2026-11-18" }, "2026-11-19")).toBe(false);
  });

  it("comes back in five days after a first message, a week after a follow-up", () => {
    expect(followUpAfter("first", "2026-11-28")).toBe("2026-12-03");
    expect(followUpAfter("follow_up", "2026-12-28")).toBe("2027-01-04");
  });
});

describe("send links", () => {
  it("normalises a number for WhatsApp and knows a mobile from a landline", () => {
    expect(phoneDigits("+382 68 755 921")).toBe("38268755921");
    expect(phoneDigits("00382 32 660 700")).toBe("38232660700");
    expect(phoneDigits("068/755-921")).toBe("38268755921");
    expect(phoneDigits("+382 20 409 600; +382 20 409 601")).toBe("38220409600");
    expect(phoneDigits("n/a")).toBeNull();
    expect(isMobile("+382 68 755 921")).toBe(true);
    expect(isMobile("+382 32 660 700")).toBe(false);
    expect(whatsappLink("068 755 921", "Zdravo & hvala")).toBe("https://wa.me/38268755921?text=Zdravo%20%26%20hvala");
    expect(whatsappLink(null, "x")).toBeNull();
  });

  it("builds a mail link and an Instagram message link", () => {
    expect(mailtoLink("pr@example.me", "Santamore: sponzorstvo", "A\n\nB")).toBe("mailto:pr@example.me?subject=Santamore%3A%20sponzorstvo&body=A%0A%0AB");
    expect(mailtoLink(null, "s", "b")).toBeNull();
    expect(instagramLink("@porto.montenegro")).toBe("https://ig.me/m/porto.montenegro");
    expect(instagramLink("https://www.instagram.com/radio_tivat/")).toBe("https://ig.me/m/radio_tivat");
    expect(instagramLink("not a handle")).toBeNull();
  });
});

describe("messages", () => {
  const base = { org: "Banka", contactName: "Ana Anić", sender: "Marko", pledgeUrl: "https://santamore.me/partneri", siteUrl: "https://santamore.me", pdfUrl: "https://santamore.me/s.pdf" } as const;

  it("asks a sponsor in either language, with the sheet and the tiers", () => {
    const me = composeMessage({ ...base, kind: "sponsor", template: "first", lang: "me" });
    expect(me.subject).toBe("Santamore: sponzorstvo");
    expect(me.body.startsWith("Poštovani/a Ana,")).toBe(true);
    expect(me.body).toContain("Organizujemo Santamore Week, od 7. do 13. decembra");
    expect(me.body).toContain("voljeli bismo da nam se Banka pridruži kao sponzor. Nivoi sponzorstva počinju od €5.000.");
    expect(me.body).toContain("https://santamore.me/s.pdf");
    expect(me.body).toContain("Nivoi i prijava: https://santamore.me/partneri");
    expect(me.body.endsWith("Hvala unaprijed,\nMarko\nSantamore")).toBe(true);
    const en = composeMessage({ ...base, kind: "sponsor", template: "first", lang: "en", contactName: null });
    expect(en.body.startsWith("Hello,")).toBe(true);
    expect(en.body).toContain("This holiday season, we would love for Banka to join us as a sponsor. Tiers start at €5,000.");
  });

  it("opens a sponsor ask at the prospect's tier", () => {
    expect(tierFrom("local", "en")).toBe("€250");
    expect(tierFrom("silver", "en")).toBe("€2,000");
    expect(tierFrom("gold", "me")).toBe("€5.000");
    expect(tierFrom("title", "en")).toBe("€10,000");
    expect(tierFrom("core", "me")).toBe("€25.000");
    // No cash tier on file: the Gold figure.
    expect(tierFrom("inkind", "en")).toBe("€5,000");
    expect(tierFrom(null, "en")).toBe("€5,000");
    const silver = composeMessage({ ...base, kind: "sponsor", template: "first", lang: "me", tierFit: "silver" });
    expect(silver.body).toContain("Nivoi sponzorstva počinju od €2.000.");
  });

  it("greets by first name, and keeps the whole name after a title", () => {
    const hello = (contactName: string) => composeMessage({ ...base, kind: "sponsor", template: "first", lang: "en", contactName }).body.split("\n")[0];
    expect(hello("Nataša Milović")).toBe("Hello Nataša,");
    expect(hello("Dr. Ana Anić")).toBe("Hello Dr. Ana Anić,");
    expect(hello("  ")).toBe("Hello,");
  });

  it("points the other asks at the site and can leave the sheet out", () => {
    const media = composeMessage({ ...base, kind: "media", template: "first", lang: "en", pdfUrl: null });
    expect(media.body).not.toContain("PDF");
    expect(media.body).toContain("More about us: https://santamore.me");
    expect(media.body).not.toContain("/partneri");
  });

  it("follows up briefly", () => {
    const follow = composeMessage({ ...base, kind: "sponsor", template: "follow_up", lang: "en", pdfUrl: null });
    expect(follow.body).toContain("I wanted to follow up on my message about Banka and Santamore.");
    expect(follow.body).not.toContain("Montenegrin non-profit");
  });
});
