import { describe, expect, it } from "vitest";
import {
  MAX_CENTS,
  addCents,
  assertCents,
  formatCents,
  formatSignedCents,
  isCents,
  parseEurosToCents,
} from "./money";

describe("isCents / assertCents", () => {
  it("accepts non-negative safe integers up to the cap", () => {
    expect(isCents(0)).toBe(true);
    expect(isCents(2575)).toBe(true);
    expect(isCents(MAX_CENTS)).toBe(true);
  });

  it("rejects floats, negatives, NaN, infinities and non-numbers", () => {
    expect(isCents(25.75)).toBe(false);
    expect(isCents(-1)).toBe(false);
    expect(isCents(NaN)).toBe(false);
    expect(isCents(Infinity)).toBe(false);
    expect(isCents(MAX_CENTS + 1)).toBe(false);
    expect(isCents("2575")).toBe(false);
    expect(isCents(null)).toBe(false);
    expect(() => assertCents(0.1 + 0.2)).toThrow(TypeError);
  });
});

describe("addCents", () => {
  it("adds integer cents", () => {
    expect(addCents(1000, 75, 25)).toBe(1100);
    expect(addCents()).toBe(0);
  });

  it("throws on any non-cents input", () => {
    expect(() => addCents(100, 0.5)).toThrow(TypeError);
    expect(() => addCents(-100)).toThrow(TypeError);
  });

  it("throws if the sum overflows the cap", () => {
    expect(() => addCents(MAX_CENTS, 1)).toThrow(TypeError);
  });
});

describe("formatCents", () => {
  it("formats me and ru in continental style with € suffixed", () => {
    expect(formatCents(2575, "me")).toBe("25,75 €");
    expect(formatCents(2575, "ru")).toBe("25,75 €");
    expect(formatCents(2500, "me")).toBe("25,00 €");
    expect(formatCents(5, "me")).toBe("0,05 €");
  });

  it("formats en with € prefixed", () => {
    expect(formatCents(2575, "en")).toBe("€25.75");
    expect(formatCents(2500, "en")).toBe("€25.00");
  });

  it("groups thousands: dots for me/ru, commas for en", () => {
    expect(formatCents(1_468_000, "me")).toBe("14.680,00 €");
    expect(formatCents(1_468_000, "en")).toBe("€14,680.00");
    expect(formatCents(123_456_789, "me")).toBe("1.234.567,89 €");
    expect(formatCents(123_456_789, "en")).toBe("€1,234,567.89");
  });

  it("strips zero cents only when trimWholeCents is set (prototype behavior)", () => {
    expect(formatCents(2500, "me", { trimWholeCents: true })).toBe("25 €");
    expect(formatCents(2500, "en", { trimWholeCents: true })).toBe("€25");
    expect(formatCents(2575, "me", { trimWholeCents: true })).toBe("25,75 €");
    expect(formatCents(1_468_000, "me", { trimWholeCents: true })).toBe(
      "14.680 €",
    );
  });

  it("rejects float input instead of rounding it", () => {
    expect(() => formatCents(25.75 as never, "me")).toThrow(TypeError);
  });
});

describe("formatSignedCents", () => {
  it("formats negative corrections with a leading minus", () => {
    expect(formatSignedCents(-500, "me")).toBe("-5,00 €");
    expect(formatSignedCents(-500, "en")).toBe("-€5.00");
    expect(formatSignedCents(-123_456, "me", { trimWholeCents: true })).toBe(
      "-1.234,56 €",
    );
  });

  it("passes non-negative values through unchanged", () => {
    expect(formatSignedCents(2575, "me")).toBe("25,75 €");
    expect(formatSignedCents(0, "en")).toBe("€0.00");
  });

  it("rejects floats and out-of-range magnitudes", () => {
    expect(() => formatSignedCents(-0.5, "me")).toThrow(TypeError);
    expect(() => formatSignedCents(-(MAX_CENTS + 1), "me")).toThrow(TypeError);
  });
});

describe("parseEurosToCents", () => {
  it("parses whole euros and both decimal separators", () => {
    expect(parseEurosToCents("25")).toBe(2500);
    expect(parseEurosToCents("25,75")).toBe(2575);
    expect(parseEurosToCents("25.75")).toBe(2575);
    expect(parseEurosToCents(" 10 ")).toBe(1000);
    expect(parseEurosToCents("0,05")).toBe(5);
  });

  it("treats a single decimal digit as tens of cents", () => {
    expect(parseEurosToCents("25,7")).toBe(2570);
    expect(parseEurosToCents("25.5")).toBe(2550);
  });

  it("returns null on anything ambiguous or invalid", () => {
    expect(parseEurosToCents("")).toBeNull();
    expect(parseEurosToCents("abc")).toBeNull();
    expect(parseEurosToCents("-5")).toBeNull();
    expect(parseEurosToCents("25,755")).toBeNull();
    expect(parseEurosToCents("1.234,56")).toBeNull();
    expect(parseEurosToCents("1,234.56")).toBeNull();
    expect(parseEurosToCents("25,")).toBeNull();
    expect(parseEurosToCents("25€")).toBeNull();
    expect(parseEurosToCents("1e3")).toBeNull();
  });

  it("returns null above the sanity cap", () => {
    expect(parseEurosToCents("999999999999")).toBeNull();
  });
});
