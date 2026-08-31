import { describe, expect, it } from "vitest";

import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("transliterates Montenegrin diacritics conventionally", () => {
    expect(slugify("Ana Đurović trči")).toBe("ana-djurovic-trci");
    expect(slugify("Čćšžđ")).toBe("ccszdj");
  });

  it("collapses separators and trims", () => {
    expect(slugify("  Podrži -- Anu!  ")).toBe("podrzi-anu");
  });

  it("caps length without a trailing hyphen", () => {
    const slug = slugify(`${"a".repeat(59)} bbb`);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("falls back when nothing survives", () => {
    expect(slugify("Анна")).toBe("stranica");
    expect(slugify("Анна", "runner")).toBe("runner");
  });
});
