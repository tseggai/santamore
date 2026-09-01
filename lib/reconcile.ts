import { extractPaymentReferences } from "@/lib/references";
import type { Cents } from "@/lib/money";

// Pure matching logic for the admin SEPA reconciliation queue (brief §8):
// statement rows are matched to pending targets by payment reference, with
// the amount as a tie-breaker. Targets are donation pledges AND event
// registrations awaiting their entry fee — each carries its own unique
// reference, so one queue serves both, while approval routes to different
// tables (fees land in registrations/Operations Fund, never in donations).
// Runs client-side over the parsed CSV so the bank statement itself never
// leaves the admin's browser — only confirmed rows reach the server.

export interface StatementRow {
  index: number;
  dateText: string;
  amountText: string;
  amountCents: Cents | null;
  description: string;
  references: string[];
}

export interface PendingTarget {
  target: "pledge" | "registration";
  id: string;
  amountCents: Cents;
  reference: string;
  donorName: string | null;
  donorEmail: string | null;
  isRecurring: boolean;
  createdAt: string;
  pageTitle: string;
}

export type MatchProposal =
  | { kind: "matched"; row: StatementRow; pledge: PendingTarget; amountMatches: boolean }
  | { kind: "ambiguous"; row: StatementRow; candidates: PendingTarget[] }
  | { kind: "unmatched-reference"; row: StatementRow; reference: string }
  | { kind: "no-reference"; row: StatementRow };

export interface ColumnMapping {
  dateColumn: number;
  amountColumn: number;
  descriptionColumns: number[];
}

/**
 * Bank amount formats vary ("1.234,56", "1,234.56", "25,00", "€ 25").
 * Negative amounts (debits) return null — only credits can be donations.
 */
export function parseStatementAmount(input: string): Cents | null {
  const cleaned = input.replace(/[^\d.,-]/g, "");
  if (cleaned === "" || cleaned.includes("-")) return null;

  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  let normalized: string;
  if (lastDot !== -1 && lastComma !== -1) {
    // Both present: the rightmost is the decimal separator.
    const thousands = lastDot > lastComma ? "," : ".";
    normalized = cleaned.split(thousands).join("").replace(",", ".");
  } else if (lastComma !== -1) {
    const parts = cleaned.split(",");
    normalized =
      parts.length === 2 && parts[1].length <= 2 ? parts.join(".") : parts.join("");
  } else {
    const parts = cleaned.split(".");
    normalized =
      parts.length === 2 && parts[1].length <= 2 ? cleaned : parts.join("");
  }

  const [euros, cents = ""] = normalized.split(".");
  if (!/^\d+$/.test(euros) || (cents !== "" && !/^\d{1,2}$/.test(cents))) return null;
  const total = Number(euros) * 100 + (cents === "" ? 0 : Number(cents.padEnd(2, "0")));
  return Number.isSafeInteger(total) && total > 0 ? total : null;
}

/** Best-effort statement-date parse; null when the format is unrecognised. */
export function parseStatementDate(input: string): string | null {
  const text = input.trim();
  let year: number | undefined;
  let month: number | undefined;
  let day: number | undefined;

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const european = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (iso) {
    [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (european) {
    [day, month, year] = [Number(european[1]), Number(european[2]), Number(european[3])];
  } else {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString();
}

export function buildStatementRows(
  rows: string[][],
  mapping: ColumnMapping,
): StatementRow[] {
  return rows.map((cells, index) => {
    const description = mapping.descriptionColumns
      .map((column) => cells[column] ?? "")
      .filter((value) => value !== "")
      .join(" · ");
    const amountText = cells[mapping.amountColumn] ?? "";
    return {
      index,
      dateText: cells[mapping.dateColumn] ?? "",
      amountText,
      amountCents: parseStatementAmount(amountText),
      description,
      references: extractPaymentReferences(description),
    };
  });
}

/**
 * A row is proposed as "matched" only when exactly one pending pledge
 * carries its reference. References are page-level and public, so anyone
 * can plant a pending pledge with an arbitrary name at a common amount —
 * silently auto-picking among collisions would let that pledge claim a
 * stranger's transfer (wrong name in the public ledger, receipt to the
 * wrong inbox). Collisions come back as "ambiguous" with every candidate,
 * oldest first, for the admin to resolve against the statement text.
 */
export function proposeMatches(
  rows: StatementRow[],
  pledges: PendingTarget[],
): MatchProposal[] {
  const used = new Set<string>();
  return rows.map((row) => {
    if (row.references.length === 0) {
      return { kind: "no-reference", row };
    }
    const candidates = pledges.filter(
      (pledge) => row.references.includes(pledge.reference) && !used.has(pledge.id),
    );
    if (candidates.length === 0) {
      return { kind: "unmatched-reference", row, reference: row.references[0] };
    }
    if (candidates.length > 1) {
      return {
        kind: "ambiguous",
        row,
        candidates: [...candidates].sort((a, b) =>
          a.createdAt.localeCompare(b.createdAt),
        ),
      };
    }
    const pledge = candidates[0];
    used.add(pledge.id);
    return {
      kind: "matched",
      row,
      pledge,
      amountMatches: pledge.amountCents === row.amountCents,
    };
  });
}
