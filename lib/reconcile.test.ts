import { describe, expect, it } from "vitest";

import {
  buildStatementRows,
  parseStatementAmount,
  parseStatementDate,
  proposeMatches,
  type PendingPledge,
} from "@/lib/reconcile";

const pledge = (overrides: Partial<PendingPledge>): PendingPledge => ({
  id: "p1",
  amountCents: 2500,
  reference: "SM-1226-0473",
  donorName: "Ana",
  isRecurring: false,
  createdAt: "2026-12-01T10:00:00Z",
  pageTitle: "Santa Run 2026",
  ...overrides,
});

describe("parseStatementAmount", () => {
  it("parses European and Anglo formats to cents", () => {
    expect(parseStatementAmount("25,00")).toBe(2500);
    expect(parseStatementAmount("25.00")).toBe(2500);
    expect(parseStatementAmount("1.234,56")).toBe(123456);
    expect(parseStatementAmount("1,234.56")).toBe(123456);
    expect(parseStatementAmount("€ 25")).toBe(2500);
    expect(parseStatementAmount("25,5")).toBe(2550);
  });

  it("treats lone separators with 3-digit groups as thousands", () => {
    expect(parseStatementAmount("1.234")).toBe(123400);
    expect(parseStatementAmount("1,234")).toBe(123400);
  });

  it("rejects debits, junk and zero", () => {
    expect(parseStatementAmount("-25,00")).toBeNull();
    expect(parseStatementAmount("")).toBeNull();
    expect(parseStatementAmount("abc")).toBeNull();
    expect(parseStatementAmount("0,00")).toBeNull();
  });
});

describe("parseStatementDate", () => {
  it("parses ISO and European dates to noon-UTC ISO strings", () => {
    expect(parseStatementDate("2026-12-20")).toBe("2026-12-20T12:00:00.000Z");
    expect(parseStatementDate("20.12.2026")).toBe("2026-12-20T12:00:00.000Z");
    expect(parseStatementDate("5/1/2026")).toBe("2026-01-05T12:00:00.000Z");
  });

  it("returns null for nonsense", () => {
    expect(parseStatementDate("32.13.2026")).toBeNull();
    expect(parseStatementDate("december")).toBeNull();
  });
});

describe("buildStatementRows + proposeMatches", () => {
  const rows = buildStatementRows(
    [
      ["20.12.2026", "25,00", "UPLATA SM-1226-0473 Ana"],
      ["20.12.2026", "30,00", "prenos sm-1226-9999"],
      ["21.12.2026", "10,00", "no reference here"],
    ],
    { dateColumn: 0, amountColumn: 1, descriptionColumns: [2] },
  );

  it("extracts references case-insensitively", () => {
    expect(rows[0].references).toEqual(["SM-1226-0473"]);
    expect(rows[1].references).toEqual(["SM-1226-9999"]);
    expect(rows[2].references).toEqual([]);
  });

  it("matches by reference and flags amount agreement", () => {
    const proposals = proposeMatches(rows, [pledge({})]);
    expect(proposals[0]).toMatchObject({ kind: "matched", amountMatches: true });
    expect(proposals[1]).toMatchObject({
      kind: "unmatched-reference",
      reference: "SM-1226-9999",
    });
    expect(proposals[2]).toMatchObject({ kind: "no-reference" });
  });

  it("prefers the exact-amount pledge, then the oldest, never reusing one", () => {
    const pledges = [
      pledge({ id: "newer", amountCents: 3000, createdAt: "2026-12-02T10:00:00Z" }),
      pledge({ id: "older", amountCents: 2500, createdAt: "2026-12-01T10:00:00Z" }),
    ];
    const twoRows = buildStatementRows(
      [
        ["20.12.2026", "30,00", "SM-1226-0473"],
        ["20.12.2026", "25,00", "SM-1226-0473"],
      ],
      { dateColumn: 0, amountColumn: 1, descriptionColumns: [2] },
    );
    const proposals = proposeMatches(twoRows, pledges);
    expect(proposals[0]).toMatchObject({
      kind: "matched",
      pledge: { id: "newer" },
      amountMatches: true,
    });
    expect(proposals[1]).toMatchObject({
      kind: "matched",
      pledge: { id: "older" },
      amountMatches: true,
    });
  });
});
