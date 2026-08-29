import { describe, expect, it } from "vitest";

import {
  extractPaymentReferences,
  generatePaymentReference,
  isValidPaymentReference,
  referenceMonth,
} from "@/lib/references";

describe("isValidPaymentReference", () => {
  it("accepts the brief's canonical example", () => {
    expect(isValidPaymentReference("SM-1226-0473")).toBe(true);
  });

  it("rejects the prototype's YYMM variant — the brief and DB use MMYY", () => {
    expect(isValidPaymentReference("SM-2612-0473")).toBe(false);
  });

  it("rejects month 00 and 13, wrong prefix, wrong lengths", () => {
    expect(isValidPaymentReference("SM-0026-0473")).toBe(false);
    expect(isValidPaymentReference("SM-1326-0473")).toBe(false);
    expect(isValidPaymentReference("XX-1226-0473")).toBe(false);
    expect(isValidPaymentReference("SM-1226-473")).toBe(false);
    expect(isValidPaymentReference("SM-1226-04731")).toBe(false);
    expect(isValidPaymentReference("sm-1226-0473")).toBe(false);
  });
});

describe("referenceMonth", () => {
  it("formats MMYY in UTC", () => {
    expect(referenceMonth(new Date(Date.UTC(2026, 11, 20)))).toBe("1226");
    expect(referenceMonth(new Date(Date.UTC(2026, 0, 5)))).toBe("0126");
  });
});

describe("generatePaymentReference", () => {
  it("mints valid references with zero-padded serials", () => {
    const ref = generatePaymentReference(new Date(Date.UTC(2026, 7, 29)), () => 0.0001);
    expect(ref).toBe("SM-0826-0001");
    expect(isValidPaymentReference(ref)).toBe(true);
  });

  it("covers the full serial range", () => {
    expect(generatePaymentReference(new Date(Date.UTC(2026, 7, 1)), () => 0)).toBe(
      "SM-0826-0000",
    );
    expect(
      generatePaymentReference(new Date(Date.UTC(2026, 7, 1)), () => 0.9999999),
    ).toBe("SM-0826-9999");
  });

  it("always validates against the DB constraint pattern", () => {
    for (let month = 0; month < 12; month += 1) {
      const ref = generatePaymentReference(new Date(Date.UTC(2026, month, 15)));
      expect(isValidPaymentReference(ref)).toBe(true);
    }
  });
});

describe("extractPaymentReferences", () => {
  it("finds references inside bank-statement noise", () => {
    expect(
      extractPaymentReferences("UPLATA sm-1226-0473 / Santa Run PAYMENT REF: SM-0826-4127"),
    ).toEqual(["SM-1226-0473", "SM-0826-4127"]);
  });

  it("dedupes and ignores invalid months", () => {
    expect(extractPaymentReferences("SM-1226-0473 SM-1226-0473 SM-1326-0001")).toEqual([
      "SM-1226-0473",
    ]);
  });

  it("refuses references embedded in longer tokens", () => {
    expect(extractPaymentReferences("PRISM-1226-0473")).toEqual([]);
    expect(extractPaymentReferences("SM-1226-04735")).toEqual([]);
    expect(extractPaymentReferences("1SM-1226-0473")).toEqual([]);
    // Punctuation around a real reference is fine.
    expect(extractPaymentReferences("ref:SM-1226-0473;")).toEqual(["SM-1226-0473"]);
  });

  it("returns empty for no matches", () => {
    expect(extractPaymentReferences("regular transfer, no reference")).toEqual([]);
  });
});
