import { describe, expect, it } from "vitest";

import packJson from "@/content/legal-pack/pack.json";
import { docTexts, incompleteFields, initialFields, isIncomplete, keepsPlaceholders, normalizeFieldState, resolveFields, sameEverywhere, sanitizeBlockText, splitTopLevel, packProblems, placeholderIds, sanitizeDraftHtml, savePackSchema, segments, type LegalPack } from "./legal-pack";

const pack = packJson as unknown as LegalPack;

describe("legal pack", () => {
  it("has the five filing forms, the statute with additions, and every draft", () => {
    expect(pack.forms.map((f) => f.id)).toEqual(["01", "02", "03", "04", "04a", "05"]);
    expect(pack.drafts.length).toBeGreaterThanOrEqual(14);
  });

  it("merges the additions into form 04a: every article once, the edits applied, the old numbers shifted", () => {
    const merged = pack.forms.find((f) => f.id === "04a")!;
    const heads = merged.blocks.flatMap((b) => (b.type === "h3" ? [b.me] : []));
    const expected: string[] = [];
    for (let n = 1; n <= 55; n++) { expected.push(`Član ${n}`); if (n === 17) for (const l of "abcdef") expected.push(`Član 17${l}`); }
    expect(heads).toEqual(expected);
    const texts = merged.blocks.flatMap((b) => (b.type === "p" ? [b.me] : b.type === "list" ? b.me : []));
    expect(texts).toContain("Organi udruženja su Skupština, Upravni odbor, Komisija za dodjelu sredstava i lice ovlašćeno za zastupanje (Izvršni direktor).");
    expect(texts).toContain("usvaja godišnji budžet udruženja;");
    expect(texts.some((t) => t.startsWith("Članovi koje predstavljaju opunomoćeni predstavnici u skladu sa članovima 17a do 17f"))).toBe(true);
    expect(texts.some((t) => /prestanku rada udruženja iz člana 52 ovog statuta/.test(t))).toBe(true);
    expect(texts.some((t) => /iz člana 39 ovog statuta/.test(t))).toBe(false);
    // The chapters sit where the additions say: proxies before Article 18, the three new ones before the staff chapter.
    const idx = (me: string) => merged.blocks.findIndex((b) => (b.type === "h2" || b.type === "h3") && b.me === me);
    expect(idx("Član 17f")).toBeLessThan(idx("Član 18"));
    expect(idx("UPRAVNI ODBOR")).toBeLessThan(idx("KOMISIJA ZA DODJELU SREDSTAVA"));
    expect(idx("OGRANCI")).toBeLessThan(idx("SLUŽBENICI (OSOBLJE)"));
    // The English side of a merged article is the summary on its first paragraph; the rest is Montenegrin only.
    const first = merged.blocks[idx("Član 32") + 1];
    expect(first.type === "p" && first.en.startsWith("Position and composition.")).toBe(true);
    expect(merged.blocks[idx("Član 32") + 2]).toMatchObject({ meOnly: true });
  });

  it("refers only to defined blanks, the same ones in both languages", () => {
    expect(packProblems(pack)).toEqual([]);
  });

  it("leaves no template blank in the statute", () => {
    const statute = pack.forms.find((f) => f.id === "04")!;
    for (const block of statute.blocks) {
      if (block.type !== "p") continue;
      expect(block.me, block.en).not.toMatch(/___/);
      expect(block.en, block.me).not.toMatch(/___/);
      expect(block.me.trim()).not.toBe("");
      expect(block.en.trim()).not.toBe("");
    }
  });

  it("never fabricates a fact: unknown values are bracketed", () => {
    const fields = initialFields(pack);
    for (const id of ["f1_jmb", "rep_jmb", "date", "addr"]) {
      expect(fields[id].me, id).toMatch(/^\[/);
    }
    expect(fields.org.me).toContain("Santamore");
  });

  it("splits a template into text, blanks and signature lines", () => {
    expect(segments("Osnivač {{f1_name}} {{sig}}")).toEqual([
      { type: "text", text: "Osnivač " },
      { type: "field", id: "f1_name" },
      { type: "text", text: " " },
      { type: "sig" },
    ]);
    expect(placeholderIds("{{org}} i {{org}} {{sig}}")).toEqual(["org"]);
  });
});

describe("sanitizeDraftHtml", () => {
  it("keeps the drafts' own markup", () => {
    const html = '<h2>1. Svrha / Purpose</h2><p class="en">Text with <b>bold</b>, <code>x</code> and <a href="https://santamore.me">a link</a>.</p><div class="tablewrap"><table><tr><th colspan="2">a</th></tr></table></div>';
    expect(sanitizeDraftHtml(html)).toBe('<h2>1. Svrha / Purpose</h2><p class="en">Text with <b>bold</b>, <code>x</code> and <a href="https://santamore.me" rel="noopener noreferrer">a link</a>.</p><div class="tablewrap"><table><tr><th colspan="2">a</th></tr></table></div>');
  });

  it("drops scripts, handlers, styles and unknown classes", () => {
    expect(sanitizeDraftHtml('<p onclick="x()" style="color:red" class="en evil">hi</p><script>alert(1)</script><span data-x="1">s</span>')).toBe('<p class="en">hi</p>alert(1)<span>s</span>');
    expect(sanitizeDraftHtml('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
    expect(sanitizeDraftHtml("<p>a<br>b</p>")).toBe("<p>a<br />b</p>");
  });

  it("passes every shipped draft through unchanged in substance", () => {
    for (const draft of pack.drafts) {
      const clean = sanitizeDraftHtml(draft.html);
      expect(clean, draft.id).not.toBeNull();
      expect(clean!.replace(/<br \/>/g, "<br>").replace(/\s+/g, " ")).toBe(draft.html.replace(/\s+/g, " "));
    }
  });
});

describe("savePackSchema", () => {
  const schema = savePackSchema(pack);

  it("accepts each part of the pack and rejects unknown ids", () => {
    expect(schema.safeParse({ key: "fields", value: { org: { me: "a", en: "b", ru: "", tr: "", stale: ["ru", "tr"] } } }).success).toBe(true);
    expect(schema.safeParse({ key: "i18n:form:02:ru", value: { t: "Решение", "b3.0": "x" } }).success).toBe(true);
    expect(schema.safeParse({ key: "i18n:form:09:ru", value: { t: "x" } }).success).toBe(false);
    expect(schema.safeParse({ key: "fields", value: { nope: sameEverywhere("a") } }).success).toBe(false);
    expect(schema.safeParse({ key: "checks", value: { s1_1: true } }).success).toBe(true);
    expect(schema.safeParse({ key: "checks", value: { s9_999: true } }).success).toBe(false);
    expect(schema.safeParse({ key: "draft:impressum", value: { html: "<p>x</p>" } }).success).toBe(true);
    expect(schema.safeParse({ key: "draft:unknown", value: { html: "<p>x</p>" } }).success).toBe(false);
    expect(schema.safeParse({ key: "form:04a", value: { blocks: [{ type: "h3", me: "Član 1", en: "Article 1" }, { type: "p", me: "{{org}} je udruženje.", en: "{{org}} is an association.", meOnly: false }, { type: "list", me: ["a"], en: [] }] } }).success).toBe(true);
    expect(schema.safeParse({ key: "form:04a", value: { blocks: null } }).success).toBe(true);
    expect(schema.safeParse({ key: "form:09", value: { blocks: [] } }).success).toBe(false);
    expect(schema.safeParse({ key: "form:04", value: { blocks: [{ type: "p", me: "{{nope}}", en: "" }] } }).success).toBe(false);
    expect(schema.safeParse({ key: "form:01", value: { blocks: [{ type: "check", id: "s9_999", me: "x", en: "y" }] } }).success).toBe(false);
    expect(schema.safeParse({ key: "other", value: {} }).success).toBe(false);
  });

  it("accepts the whole initial field state", () => {
    expect(schema.safeParse({ key: "fields", value: initialFields(pack) }).success).toBe(true);
  });
});

describe("incomplete blanks", () => {
  it("treats empty and bracketed values as not completed", () => {
    expect(isIncomplete("")).toBe(true);
    expect(isIncomplete("  [Full name]")).toBe(true);
    expect(isIncomplete("Ana Anić")).toBe(false);
    expect(isIncomplete("4 (four)")).toBe(false);
  });

  it("lists what the Decision still needs, skipping empty optional founders", () => {
    const form = pack.forms.find((f) => f.id === "02")!;
    const fields = initialFields(pack);
    const before = incompleteFields(form, "en", fields, pack.fields);
    expect(before).toContain("f1_name");
    expect(before).toContain("date");
    expect(before).not.toContain("f2_name");
    expect(before).not.toContain("f4_name");
    expect(before).not.toContain("org");
    fields.f1_name = sameEverywhere("Ana Anić");
    expect(incompleteFields(form, "en", fields, pack.fields)).not.toContain("f1_name");
    // Naming founder 2 makes their JMB and address needed.
    fields.f2_name = sameEverywhere("Bo Bošković");
    const after = incompleteFields(form, "en", fields, pack.fields);
    expect(after).toContain("f2_jmb");
    expect(after).toContain("f2_addr");
    expect(after).not.toContain("f3_jmb");
  });
});

describe("resolveFields", () => {
  it("makes a person blank follow the chosen founder", () => {
    const fields = initialFields(pack);
    fields.f2_name = sameEverywhere("Ana Anić");
    fields.f2_jmb = sameEverywhere("0101990000000");
    fields.rep_of = sameEverywhere("f2");
    const shown = resolveFields(pack, fields);
    expect(shown.rep_name.me).toBe("Ana Anić");
    expect(shown.rep_jmb.en).toBe("0101990000000");
    expect(shown.rep_addr.me).toBe(fields.f2_addr.me);
    expect(shown.chair.me).toBe("[Ime i prezime]");
    expect(fields.rep_name.me).toBe("[Ime i prezime]");
  });
});

describe("four languages", () => {
  it("reads an older two-language row and marks the new languages as waiting", () => {
    const base = initialFields(pack);
    const org = normalizeFieldState({ me: "NVU", en: "NGA", stale: "en" }, pack.fields.org, base.org);
    expect(org).toEqual({ me: "NVU", en: "NGA", ru: "", tr: "", stale: expect.arrayContaining(["en", "ru", "tr"]) });
    const jmb = normalizeFieldState({ me: "123", en: "123", stale: null }, pack.fields.f1_jmb, base.f1_jmb);
    expect(jmb).toEqual({ me: "123", en: "123", ru: "123", tr: "123", stale: [] });
  });

  it("extracts a form's texts by path and a draft's English elements", () => {
    const texts = docTexts(pack, "form:02");
    expect(texts.t).toBe("Decision on founding");
    expect(Object.keys(texts).some((k) => /^b\d+\.\d+$/.test(k))).toBe(true);
    const draft = docTexts(pack, "draft:impressum");
    expect(Object.values(draft).every((v) => !/^<p>/.test(v))).toBe(true);
    expect(Object.keys(docTexts(pack, "labels"))).toContain("f:f1_jmb.h");
  });

  it("splits html into top-level elements and checks placeholders survive translation", () => {
    expect(splitTopLevel('<h2>A</h2>\n<p class="en">x<br>y</p><div class="tablewrap"><table><tr><td>1</td></tr></table></div>')).toHaveLength(3);
    expect(keepsPlaceholders("Osnivač {{f1_name}} {{sig}}", "Kurucu {{f1_name}} {{sig}}")).toBe(true);
    expect(keepsPlaceholders("Osnivač {{f1_name}} {{sig}}", "Kurucu {{f1name}} {{sig}}")).toBe(false);
  });
});

describe("sanitizeBlockText", () => {
  it("keeps the template tags and drops the rest", () => {
    expect(sanitizeBlockText('a <b>b</b><br>c <script>x</script><span onclick="y">d</span> {{org}}')).toBe("a <b>b</b><br>c xd {{org}}");
  });
});
