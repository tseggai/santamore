import { describe, expect, it } from "vitest";

import {
  buildEpcQrPayload,
  formatIbanForDisplay,
  normalizeIban,
} from "@/lib/epc-qr";

// A syntactically valid IBAN for tests only (never displayed to users).
const TEST_IBAN = "ME25505000001234567890";
const TEST_NAME = "Test Beneficiary";

describe("buildEpcQrPayload", () => {
  it("builds the exact 11-line payload with amount and reference", () => {
    const payload = buildEpcQrPayload({
      beneficiaryName: TEST_NAME,
      iban: "ME25 5050 0000 1234 5678 90",
      amountCents: 2500,
      reference: "SM-1226-0473",
    });
    expect(payload).toBe(
      [
        "BCD",
        "002",
        "1",
        "SCT",
        "", // BIC omitted under version 002
        TEST_NAME,
        TEST_IBAN,
        "EUR25.00",
        "", // purpose
        "", // structured remittance stays empty: SM-refs are not ISO 11649
        "SM-1226-0473",
      ].join("\n"),
    );
  });

  it("includes a normalised BIC when given", () => {
    const payload = buildEpcQrPayload({
      beneficiaryName: TEST_NAME,
      iban: TEST_IBAN,
      bic: "abcdmep1",
      amountCents: 100,
      reference: "SM-0826-4127",
    });
    expect(payload.split("\n")[4]).toBe("ABCDMEP1");
  });

  it("omits the amount line content when no amount is set", () => {
    const payload = buildEpcQrPayload({
      beneficiaryName: TEST_NAME,
      iban: TEST_IBAN,
      reference: "SM-0826-4127",
    });
    expect(payload.split("\n")[7]).toBe("");
    expect(payload.split("\n")[10]).toBe("SM-0826-4127");
  });

  it("formats cents exactly (no floats)", () => {
    const line = (cents: number) =>
      buildEpcQrPayload({
        beneficiaryName: TEST_NAME,
        iban: TEST_IBAN,
        amountCents: cents,
        reference: "SM-0826-4127",
      }).split("\n")[7];
    expect(line(1)).toBe("EUR0.01");
    expect(line(2573)).toBe("EUR25.73");
    expect(line(100_000_000)).toBe("EUR1000000.00");
  });

  it("rejects out-of-contract input", () => {
    const base = {
      beneficiaryName: TEST_NAME,
      iban: TEST_IBAN,
      reference: "SM-0826-4127",
    };
    expect(() => buildEpcQrPayload({ ...base, beneficiaryName: "" })).toThrow();
    expect(() =>
      buildEpcQrPayload({ ...base, beneficiaryName: "x".repeat(71) }),
    ).toThrow();
    expect(() => buildEpcQrPayload({ ...base, iban: "NOT-AN-IBAN" })).toThrow();
    expect(() => buildEpcQrPayload({ ...base, bic: "NOPE" })).toThrow();
    expect(() => buildEpcQrPayload({ ...base, amountCents: 0 })).toThrow();
    expect(() => buildEpcQrPayload({ ...base, amountCents: 25.5 })).toThrow();
    expect(() => buildEpcQrPayload({ ...base, reference: "" })).toThrow();
  });

  it("enforces the 331-byte cap", () => {
    expect(() =>
      buildEpcQrPayload({
        beneficiaryName: TEST_NAME,
        iban: TEST_IBAN,
        reference: "č".repeat(140), // 2 bytes each in UTF-8 → over the cap
      }),
    ).toThrow(/331/);
  });
});

describe("IBAN helpers", () => {
  it("normalises and groups for display", () => {
    expect(normalizeIban("me25 5050 0000 1234 5678 90")).toBe(TEST_IBAN);
    expect(formatIbanForDisplay(TEST_IBAN)).toBe("ME25 5050 0000 1234 5678 90");
  });
});
