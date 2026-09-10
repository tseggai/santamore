import type { Cents } from "@/lib/money";
import type { OrgBankDetails } from "@/lib/org";

export interface SuggestedAmount {
  amountCents: Cents;
  impactKey?: string;
  isDefault?: boolean;
}

export interface SuggestedSets {
  oneoff: SuggestedAmount[];
  monthly: SuggestedAmount[];
}

export interface DonateTarget {
  kind: "campaign" | "fundraiser";
  slug: string;
  title: string;
  description: string | null;
  goalCents: Cents;
  paymentReference: string;
}

/** Everything the checkout needs, whether it opens in the overlay or on /podrzi. */
export interface DonateTargetData {
  target: DonateTarget;
  suggested: SuggestedSets;
  bank: OrgBankDetails;
  cardRailEnabled: boolean;
  /** Unlocalized path of the page this checkout belongs to, e.g. "/f/ana". */
  backPath: string | null;
  photoUrl: string | null;
}

/** What a Donate button asks for; no slug means the flagship campaign. */
export interface DonateRequest {
  kind: "campaign" | "fundraiser";
  slug?: string;
}

// The flagship campaign when none is chosen.
export const DEFAULT_CAMPAIGN_SLUG = "santa-run-2026";

interface RawSuggested {
  amount_cents?: unknown;
  impact_key?: unknown;
  default?: unknown;
}

function normalizeSet(value: unknown): SuggestedAmount[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry: RawSuggested) => {
    if (typeof entry?.amount_cents !== "number" || !Number.isInteger(entry.amount_cents)) {
      return [];
    }
    return [
      {
        amountCents: entry.amount_cents,
        impactKey: typeof entry.impact_key === "string" ? entry.impact_key : undefined,
        isDefault: entry.default === true,
      },
    ];
  });
}

/** Tolerates both the legacy flat array and the {oneoff, monthly} shape. */
export function normalizeSuggested(value: unknown): SuggestedSets {
  if (Array.isArray(value)) {
    const oneoff = normalizeSet(value);
    return { oneoff, monthly: oneoff };
  }
  const record = value as { oneoff?: unknown; monthly?: unknown } | null;
  const oneoff = normalizeSet(record?.oneoff);
  const monthly = normalizeSet(record?.monthly);
  return { oneoff, monthly: monthly.length > 0 ? monthly : oneoff };
}
