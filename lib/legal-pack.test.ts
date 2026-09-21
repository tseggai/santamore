import { describe, expect, it } from "vitest";

import packJson from "@/content/legal-pack/pack.json";
import { initialFields, packProblems, placeholderIds, sanitizeDraftHtml, segments, type LegalPack } from "./legal-pack";

const pack = packJson as unknown as LegalPack;

describe("legal pack", () => {
  it("has five forms and every draft", () => {
    expect(pack.forms.map((f) => f.id)).toEqual(["01", "02", "03", "04", "05"]);
    expect(pack.drafts.length).toBeGreaterThanOrEqual(14);
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
    for (const id of ["f1_jmb", "f2_jmb", "f3_jmb", "rep_jmb", "date", "addr"]) {
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
