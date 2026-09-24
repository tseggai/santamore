import "server-only";

import { flagshipCause } from "@/lib/cause-status";
import {
  normalizeSuggested,
  type DonateRequest,
  type DonateTargetData,
} from "@/lib/donate/types";
import { getOrgBankDetails } from "@/lib/org";
import { fundraiserPhotoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

const SLUG = /^[a-z0-9-]{1,100}$/;

interface CampaignRow {
  slug: string;
  title: string;
  description: string | null;
  goal_cents: number | null;
  payment_reference: string;
  suggested_amounts: unknown;
  raised_cents: number;
  starts_at: string | null;
  ends_at: string | null;
}

const CAMPAIGN_COLUMNS = "slug, title, description, goal_cents, payment_reference, suggested_amounts, raised_cents, disbursed_cents, starts_at, ends_at, completed_at";

interface FundraiserRow {
  slug: string;
  title: string;
  story: string | null;
  goal_cents: number | null;
  payment_reference: string;
  photo_path: string | null;
}

/**
 * Resolve what a Donate button points at. Anonymous reads through the
 * public views only (CLAUDE.md); the service role stays confined to the
 * pledge insert. Null when the slug is unknown or not public.
 */
export async function loadDonateTarget(request: DonateRequest): Promise<DonateTargetData | "none" | null> {
  const common = {
    bank: getOrgBankDetails(),
    cardRailEnabled: process.env.NEXT_PUBLIC_CARD_RAIL_ENABLED === "true",
  };
  try {
    const supabase = await createClient();

    if (request.kind === "fundraiser") {
      if (!request.slug || !SLUG.test(request.slug)) return null;
      const [{ data: fundraiser }, { data: flagship }] = await Promise.all([
        supabase
          .from("v_fundraiser_totals")
          .select("slug, title, story, goal_cents, payment_reference, photo_path")
          .eq("slug", request.slug)
          .maybeSingle(),
        // Fundraiser pages borrow the flagship campaign's suggested amounts.
        supabase.from("v_public_campaigns").select("suggested_amounts").limit(1).maybeSingle(),
      ]);
      const row = fundraiser as FundraiserRow | null;
      if (!row) return null;
      return {
        ...common,
        target: {
          kind: "fundraiser",
          slug: row.slug,
          title: row.title,
          description: row.story,
          goalCents: row.goal_cents,
          paymentReference: row.payment_reference,
        },
        suggested: normalizeSuggested(flagship?.suggested_amounts),
        backPath: `/f/${row.slug}`,
        photoUrl: fundraiserPhotoUrl(row.photo_path),
      };
    }

    // A named cause, or the flagship: the open cause that started most
    // recently, else the latest one. Nothing is hard-coded.
    let row: CampaignRow | null;
    if (request.slug) {
      if (!SLUG.test(request.slug)) return null;
      const { data } = await supabase.from("v_public_campaigns").select(CAMPAIGN_COLUMNS).eq("slug", request.slug).maybeSingle();
      row = data as CampaignRow | null;
    } else {
      const { data } = await supabase.from("v_public_campaigns").select(CAMPAIGN_COLUMNS).order("starts_at", { ascending: false, nullsFirst: false }).limit(20);
      row = flagshipCause((data ?? []) as CampaignRow[]);
      // No open cause: the checkout says so instead of failing.
      if (!row) return "none";
    }
    if (!row) return null;
    return {
      ...common,
      target: {
        kind: "campaign",
        slug: row.slug,
        title: row.title,
        description: row.description,
        goalCents: row.goal_cents,
        paymentReference: row.payment_reference,
      },
      suggested: normalizeSuggested(row.suggested_amounts),
      backPath: request.slug ? `/kampanje/${row.slug}` : null,
      photoUrl: null,
    };
  } catch (error) {
    console.error("[donate] target load failed:", error);
    return null;
  }
}
