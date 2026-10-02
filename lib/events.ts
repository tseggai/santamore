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
  /** The distance (by name) this price is for; null when it applies to every distance. */
  distance?: string | null;
}

/** A distance or category of a race, with its own number of places when it has one. */
export interface EventDistance {
  name: string;
  capacity: number | null;
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
            distance: typeof entry.distance === "string" && entry.distance.trim() !== "" ? entry.distance : null,
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

/** The tiers on offer for one distance: those for that distance and those for every distance. */
export function tiersFor(tiers: EventTier[], distance: string | null): EventTier[] {
  return tiers.filter((tier) => !tier.distance || tier.distance === distance);
}

/** Distances were once plain strings; now each may carry its own number of places. Both shapes read. */
export function parseDistances(value: unknown): EventDistance[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === "string") return entry.trim() ? [{ name: entry, capacity: null }] : [];
    if (entry && typeof entry.name === "string" && entry.name.trim()) {
      const capacity = typeof entry.capacity === "number" && Number.isInteger(entry.capacity) && entry.capacity >= 0 ? entry.capacity : null;
      return [{ name: entry.name, capacity }];
    }
    return [];
  });
}

export function distanceNames(value: unknown): string[] {
  return parseDistances(value).map((d) => d.name);
}
