import { describe, expect, it } from "vitest";

import { hasBankDetails, isPlausibleIban } from "@/lib/org";

describe("bank details", () => {
  it("accepts a real IBAN, with or without spaces", () => {
    expect(isPlausibleIban("ME25505000012345678951")).toBe(true);
    expect(isPlausibleIban("ME25 5050 0001 2345 6789 51")).toBe(true);
    expect(isPlausibleIban("DE89 3704 0044 0532 0130 00")).toBe(true);
  });

  it("refuses placeholders and mistyped numbers", () => {
    expect(isPlausibleIban("")).toBe(false);
    expect(isPlausibleIban("Coming Soon When We get iBan")).toBe(false);
    expect(isPlausibleIban("[[PLACEHOLDER: IBAN]]")).toBe(false);
    expect(isPlausibleIban("ME25505000012345678952")).toBe(false);
  });

  it("needs a name and a real IBAN before donations open", () => {
    expect(hasBankDetails({ name: "Santamore", iban: "ME25505000012345678951", bic: "" })).toBe(true);
    expect(hasBankDetails({ name: "Santamore", iban: "Coming soon", bic: "" })).toBe(false);
    expect(hasBankDetails({ name: "", iban: "ME25505000012345678951", bic: "" })).toBe(false);
  });
});
