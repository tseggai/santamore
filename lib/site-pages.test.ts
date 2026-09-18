import { describe, expect, it } from "vitest";

import { PAGE_FIELDS, mergePageContent, parseField, serializeField } from "./site-pages";

const roles = PAGE_FIELDS.about.find((f) => f.key === "roles")!;
const story = PAGE_FIELDS.about.find((f) => f.key === "story")!;

describe("site page fields", () => {
  it("round-trips records through the textarea form", () => {
    const value = [
      { name: "Board", who: "Three members", desc: "Signs off every hand-over." },
      { name: "Committee", who: "Volunteers", desc: "Reads the applications." },
    ];
    const text = serializeField(roles, value);
    expect(text).toBe("Board · Three members · Signs off every hand-over.\nCommittee · Volunteers · Reads the applications.");
    expect(parseField(roles, text)).toEqual(value);
  });

  it("treats empty text as not set and drops blank lines", () => {
    expect(parseField(story, "   ")).toBeUndefined();
    expect(parseField(story, "One\n\n  Two  \n")).toEqual(["One", "Two"]);
  });

  it("lays saved fields over the shipped copy and ignores malformed ones", () => {
    const shipped = { heroTitle: "Shipped", story: ["a"], roles: [{ name: "x", who: "y", desc: "z" }] };
    const merged = mergePageContent(shipped, { heroTitle: "Saved", story: "not a list", roles: [{ name: "n", who: "w", desc: "d" }] }, "about");
    expect(merged.heroTitle).toBe("Saved");
    expect(merged.story).toEqual(["a"]);
    expect(merged.roles).toEqual([{ name: "n", who: "w", desc: "d" }]);
  });
});
