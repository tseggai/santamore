/**
 * Parsers for the JSON columns on events (distances, price tiers). Plain
 * functions with no React so both server pages and client views can call
 * them — a "use client" module cannot export helpers to the server.
 */
export interface EventTier {
  label: string;
  amount_cents: number;
  /** Last day (YYYY-MM-DD) this price is offered — early bird and the like. */
  until?: string | null;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function parseTiers(value: unknown): EventTier[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) =>
    typeof entry?.label === "string" &&
    typeof entry?.amount_cents === "number" &&
    Number.isInteger(entry.amount_cents)
      ? [
          {
            label: entry.label,
            amount_cents: entry.amount_cents,
            until: typeof entry.until === "string" && DAY.test(entry.until) ? entry.until : null,
          },
        ]
      : [],
  );
}

/** The tiers still on offer today: an "until" date is valid through that whole day. */
export function activeTiers(tiers: EventTier[], now = new Date()): EventTier[] {
  const today = now.toISOString().slice(0, 10);
  return tiers.filter((tier) => !tier.until || tier.until >= today);
}

export type EventHosting = "own" | "external";
export type BibPolicy = "none" | "we_buy";

export function parseDistances(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((d): d is string => typeof d === "string") : [];
}
