/**
 * Money helpers. Amounts are ALWAYS integer euro cents — never floats.
 *
 * Formatting is deliberately hand-rolled rather than Intl-based so output is
 * byte-identical everywhere (server, client, tests) and matches the visual
 * spec in docs/reference/app-prototype.html:
 *   me/ru  →  "1.234,56 €"  (",00" stripped when trimWholeCents)
 *   en     →  "€1,234.56"   (".00" stripped when trimWholeCents)
 */

import type { Locale } from "@/i18n/routing";

export type Cents = number;

/** Sanity cap: €100 million. Anything above this is a bug, not a donation. */
export const MAX_CENTS: Cents = 10_000_000_000;

export function isCents(value: unknown): value is Cents {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= MAX_CENTS
  );
}

export function assertCents(value: unknown): asserts value is Cents {
  if (!isCents(value)) {
    throw new TypeError(
      `Expected integer cents in [0, ${MAX_CENTS}], got: ${String(value)}`,
    );
  }
}

export function addCents(...amounts: Cents[]): Cents {
  let total = 0;
  for (const a of amounts) {
    assertCents(a);
    total += a;
  }
  assertCents(total);
  return total;
}

function groupThousands(digits: string, separator: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

export interface FormatCentsOptions {
  /** Drop ",00" / ".00" on whole-euro amounts (the prototype's behavior). */
  trimWholeCents?: boolean;
}

export function formatCents(
  cents: Cents,
  locale: Locale,
  options: FormatCentsOptions = {},
): string {
  assertCents(cents);
  const { trimWholeCents = false } = options;

  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  const showCents = !(trimWholeCents && rest === 0);
  const fraction = String(rest).padStart(2, "0");

  if (locale === "en") {
    const whole = groupThousands(String(euros), ",");
    return showCents ? `€${whole}.${fraction}` : `€${whole}`;
  }
  // me and ru: European continental style, currency suffixed.
  const whole = groupThousands(String(euros), ".");
  return showCents ? `${whole},${fraction} €` : `${whole} €`;
}

/**
 * Format a signed cent amount for display, e.g. ledger_adjustments rows.
 * Design decision: money AMOUNTS (donations, disbursements) are always
 * non-negative Cents; corrections carry direction separately, and only the
 * display layer renders a sign. This is the one helper that accepts
 * negatives.
 */
export function formatSignedCents(
  cents: number,
  locale: Locale,
  options: FormatCentsOptions = {},
): string {
  if (!Number.isSafeInteger(cents) || Math.abs(cents) > MAX_CENTS) {
    throw new TypeError(
      `Expected signed integer cents within ±${MAX_CENTS}, got: ${String(cents)}`,
    );
  }
  const formatted = formatCents(Math.abs(cents), locale, options);
  return cents < 0 ? `-${formatted}` : formatted;
}

/**
 * Parse user-entered euros into cents. Accepts "25", "25,75", "25.75".
 * At most two decimals; no thousands separators; no negatives.
 * Returns null on anything else — never guesses.
 */
export function parseEurosToCents(input: string): Cents | null {
  const trimmed = input.trim();
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(trimmed);
  if (!match) return null;

  const euros = Number(match[1]);
  const fraction = match[2] ?? "";
  const centsPart =
    fraction.length === 0
      ? 0
      : fraction.length === 1
        ? Number(fraction) * 10
        : Number(fraction);

  const total = euros * 100 + centsPart;
  return isCents(total) ? total : null;
}
