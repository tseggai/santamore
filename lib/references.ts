// Payment references are the SEPA matching key (brief §6.2, §8): format
// SM-<MMYY>-<4 digits>, globally unique across fundraisers AND campaigns.
// Uniqueness is enforced in the database (unique constraints + the
// cross-table trigger from migration 0004); callers retry generation on a
// collision. References are public — they appear on donate pages and bank
// statements — so predictability is not a concern.

export const PAYMENT_REFERENCE_PATTERN = /^SM-(0[1-9]|1[0-2])[0-9]{2}-[0-9]{4}$/;

export function isValidPaymentReference(value: string): boolean {
  return PAYMENT_REFERENCE_PATTERN.test(value);
}

/** The MMYY block for a reference minted at `date` (UTC, deterministic). */
export function referenceMonth(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = String(date.getUTCFullYear() % 100).padStart(2, "0");
  return `${month}${year}`;
}

/**
 * Mint a new payment reference. `random` is injectable for tests; the
 * default is fine because references are not secrets.
 */
export function generatePaymentReference(
  date: Date = new Date(),
  random: () => number = Math.random,
): string {
  const serial = String(Math.floor(random() * 10000)).padStart(4, "0");
  return `SM-${referenceMonth(date)}-${serial}`;
}

/**
 * Find every payment reference mentioned in free text (bank statement
 * rows). Boundary guards keep a longer token ("PRISM-…", "SM-1226-04735")
 * from being misread as a valid reference and matched to the wrong pledge.
 */
export function extractPaymentReferences(text: string): string[] {
  const matches = text
    .toUpperCase()
    .match(/(?<![A-Z0-9])SM-(0[1-9]|1[0-2])[0-9]{2}-[0-9]{4}(?![0-9])/g);
  return [...new Set(matches ?? [])];
}
