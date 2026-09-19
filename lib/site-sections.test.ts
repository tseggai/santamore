import { describe, expect, it } from "vitest";

import { aboutContent } from "@/content/site/about";
import { howContent } from "@/content/site/how";
import { draftsFromSections, parseText, projectDrafts, sectionSchema, sectionsFromAbout, sectionsFromHow, sectionsOf, serializeText } from "./site-sections";

describe("site sections", () => {
  it("converts the shipped pages into sections that pass the schema", () => {
    for (const s of [...sectionsFromAbout(aboutContent.en), ...sectionsFromHow(howContent.me)]) {
      expect(sectionSchema.safeParse(s).success, s.id).toBe(true);
    }
    expect(sectionsFromAbout(aboutContent.en).find((s) => s.id === "about-team")?.assets?.people?.kinds).toContain("staff");
  });

  it("round-trips text through the editor's drafts", () => {
    const en = sectionsFromAbout(aboutContent.en);
    const me = sectionsFromAbout(aboutContent.me);
    const drafts = draftsFromSections({ en, me }, ["me", "en", "ru"]);
    expect(drafts).toHaveLength(en.length);
    expect(drafts[0].text.en.title).toBe(aboutContent.en.heroTitle);
    expect(drafts[0].text.me.title).toBe(aboutContent.me.heroTitle);
    expect(drafts[0].text.ru.title).toBe("");
    const back = projectDrafts(drafts, "en");
    expect(back.find((s) => s.id === "about-structure")?.text.items).toEqual(en.find((s) => s.id === "about-structure")?.text.items);
  });

  it("types records and lines through the textarea form", () => {
    const spec = { key: "items", kind: "records" as const, parts: ["kicker", "title", "text"] };
    const text = serializeText(spec, [{ kicker: "Board", title: "Three", text: "Decides." }]);
    expect(text).toBe("Board | Three | Decides.");
    expect(parseText(spec, text)).toEqual([{ kicker: "Board", title: "Three", text: "Decides." }]);
    expect(parseText({ key: "p", kind: "lines" }, "a\n\n b ")).toEqual(["a", "b"]);
  });

  it("recognises saved sections and rejects the old field shape", () => {
    expect(sectionsOf({ sections: sectionsFromHow(howContent.en) })).not.toBeNull();
    expect(sectionsOf({ heroTitle: "x" })).toBeNull();
  });
});
