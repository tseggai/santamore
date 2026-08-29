import { describe, expect, it } from "vitest";

import {
  buildEpcQrPayload,
  formatIbanForDisplay,
  normalizeIban,
} from "@/lib/epc-qr";

// Syntactically valid values for tests only (never displayed to users).
// The DE IBAN is the spec's own §2.3 example account.
const TEST_IBAN_ME = "ME25505000001234567890";
const TEST_IBAN_EEA = "DE71110220330123456789";
const TEST_BIC = "ABCDMEP1";
const TEST_NAME = "Test Beneficiary";

describe("buildEpcQrPayload", () => {
  it("builds the exact payload with BIC, amount and reference", () => {
    const payload = buildEpcQrPayload({
      beneficiaryName: TEST_NAME,
      iban: "ME25 5050 0000 1234 5678 90",
      bic: TEST_BIC,
      amountCents: 2500,
      reference: "SM-1226-0473",
    });
    expect(payload).toBe(
      [
        "BCD",
        "002",
        "1",
        "SCT",
        TEST_BIC,
        TEST_NAME,
        TEST_IBAN_ME,
        "EUR25.00",
        "", // purpose
        "", // structured remittance stays empty: SM-refs are not RF creditor refs
        "SM-1226-0473",
      ].join("\n"),
    );
  });

  it("never emits a trailing separator after the last populated element", () => {
    const payload = buildEpcQrPayload({
      beneficiaryName: TEST_NAME,
      iban: TEST_IBAN_EEA,
      amountCents: 100,
      reference: "SM-0826-4127",
    });
    expect(payload.endsWith("SM-0826-4127")).toBe(true);
    expect(payload.endsWith("\n")).toBe(false);
  });

  it("normalises a lowercase BIC", () => {
    const payload = buildEpcQrPayload({
      beneficiaryName: TEST_NAME,
      iban: TEST_IBAN_ME,
      bic: "abcdmep1",
      amountCents: 100,
      reference: "SM-0826-4127",
    });
    expect(payload.split("\n")[4]).toBe(TEST_BIC);
  });

  it("requires a BIC for a non-EEA beneficiary (EPC069-12 §2.2, e.g. Montenegro)", () => {
    expect(() =>
      buildEpcQrPayload({
        beneficiaryName: TEST_NAME,
        iban: TEST_IBAN_ME,
        reference: "SM-0826-4127",
      }),
    ).toThrow(/BIC/);
  });

  it("allows omitting the BIC for an EEA beneficiary under version 002", () => {
    const payload = buildEpcQrPayload({
      beneficiaryName: TEST_NAME,
      iban: TEST_IBAN_EEA,
      reference: "SM-0826-4127",
    });
    expect(payload.split("\n")[4]).toBe("");
  });

  it("omits the amount line content when no amount is set", () => {
    const payload = buildEpcQrPayload({
      beneficiaryName: TEST_NAME,
      iban: TEST_IBAN_EEA,
      reference: "SM-0826-4127",
    });
    expect(payload.split("\n")[7]).toBe("");
    expect(payload.split("\n")[10]).toBe("SM-0826-4127");
  });

  it("formats cents exactly (no floats)", () => {
    const line = (cents: number) =>
      buildEpcQrPayload({
        beneficiaryName: TEST_NAME,
        iban: TEST_IBAN_EEA,
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
      iban: TEST_IBAN_EEA,
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
        iban: TEST_IBAN_EEA,
        reference: "č".repeat(140), // 2 bytes each in UTF-8 → over the cap
      }),
    ).toThrow(/331/);
  });
});

describe("IBAN helpers", () => {
  it("normalises and groups for display", () => {
    expect(normalizeIban("me25 5050 0000 1234 5678 90")).toBe(TEST_IBAN_ME);
    expect(formatIbanForDisplay(TEST_IBAN_ME)).toBe("ME25 5050 0000 1234 5678 90");
  });
});
