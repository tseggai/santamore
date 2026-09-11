/**
 * Parsers for the JSON columns on events (distances, price tiers). Plain
 * functions with no React so both server pages and client views can call
 * them — a "use client" module cannot export helpers to the server.
 */
export interface EventTier {
  label: string;
  amount_cents: number;
}

export function parseTiers(value: unknown): EventTier[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) =>
    typeof entry?.label === "string" &&
    typeof entry?.amount_cents === "number" &&
    Number.isInteger(entry.amount_cents)
      ? [{ label: entry.label, amount_cents: entry.amount_cents }]
      : [],
  );
}

export function parseDistances(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((d): d is string => typeof d === "string") : [];
}
