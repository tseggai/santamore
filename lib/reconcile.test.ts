import { describe, expect, it } from "vitest";

import {
  buildStatementRows,
  parseStatementAmount,
  parseStatementDate,
  proposeMatches,
  type PendingTarget,
} from "@/lib/reconcile";

const pledge = (overrides: Partial<PendingTarget>): PendingTarget => ({
  target: "pledge",
  id: "p1",
  amountCents: 2500,
  reference: "SM-1226-0473",
  donorName: "Ana",
  donorEmail: "ana@example.invalid",
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

  it("never silently picks among colliding pledges — collisions are ambiguous", () => {
    // References are page-level and public: an attacker can plant a pending
    // pledge under their own name at a common amount, hoping to claim a
    // stranger's transfer. Multiple candidates must go to the admin.
    const pledges = [
      pledge({ id: "newer", amountCents: 2500, createdAt: "2026-12-02T10:00:00Z" }),
      pledge({ id: "older", amountCents: 2500, createdAt: "2026-12-01T10:00:00Z" }),
    ];
    const oneRow = buildStatementRows(
      [["20.12.2026", "25,00", "SM-1226-0473"]],
      { dateColumn: 0, amountColumn: 1, descriptionColumns: [2] },
    );
    const proposals = proposeMatches(oneRow, pledges);
    expect(proposals[0].kind).toBe("ambiguous");
    if (proposals[0].kind === "ambiguous") {
      expect(proposals[0].candidates.map((candidate) => candidate.id)).toEqual([
        "older",
        "newer",
      ]);
    }
  });

  it("flags a single match with a differing amount instead of hiding it", () => {
    const proposals = proposeMatches(
      buildStatementRows(
        [["20.12.2026", "30,00", "SM-1226-0473"]],
        { dateColumn: 0, amountColumn: 1, descriptionColumns: [2] },
      ),
      [pledge({})],
    );
    expect(proposals[0]).toMatchObject({ kind: "matched", amountMatches: false });
  });

  it("does not reuse a pledge already matched to an earlier row", () => {
    const twoRows = buildStatementRows(
      [
        ["20.12.2026", "25,00", "SM-1226-0473"],
        ["21.12.2026", "25,00", "SM-1226-0473"],
      ],
      { dateColumn: 0, amountColumn: 1, descriptionColumns: [2] },
    );
    const proposals = proposeMatches(twoRows, [pledge({})]);
    expect(proposals[0].kind).toBe("matched");
    expect(proposals[1]).toMatchObject({
      kind: "unmatched-reference",
      reference: "SM-1226-0473",
    });
  });

  it("matches registration entry fees by their own reference", () => {
    // Registrations join the queue as their own target kind — the entry fee
    // lands in registrations (Operations Fund), never in donations.
    const registration = pledge({
      target: "registration",
      id: "r1",
      reference: "SM-1226-7001",
      amountCents: 1500,
      pageTitle: "Santa Run 2026 (kotizacija)",
    });
    const proposals = proposeMatches(
      buildStatementRows(
        [
          ["20.12.2026", "15,00", "kotizacija SM-1226-7001"],
          ["20.12.2026", "25,00", "UPLATA SM-1226-0473 Ana"],
        ],
        { dateColumn: 0, amountColumn: 1, descriptionColumns: [2] },
      ),
      [pledge({}), registration],
    );
    expect(proposals[0]).toMatchObject({ kind: "matched", amountMatches: true });
    if (proposals[0].kind === "matched") {
      expect(proposals[0].pledge.target).toBe("registration");
      expect(proposals[0].pledge.id).toBe("r1");
    }
    expect(proposals[1]).toMatchObject({ kind: "matched" });
    if (proposals[1].kind === "matched") {
      expect(proposals[1].pledge.target).toBe("pledge");
    }
  });
});
