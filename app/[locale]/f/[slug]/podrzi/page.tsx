import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  DonateForm,
  type DonateTarget,
  type SuggestedSets,
} from "@/components/donate/DonateForm";
import { getOrgBankDetails } from "@/lib/org";
import { fundraiserPhotoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

// The checkout step OF a fundraiser page: /f/<slug>/podrzi. The campaign
// checkout stays at /podrzi; this route nests under the page it funds so
// the URL itself carries the relationship.

interface FundraiserRow {
  slug: string;
  title: string;
  story: string | null;
  goal_cents: number;
  payment_reference: string;
  photo_path: string | null;
}

async function fetchFundraiser(slug: string): Promise<FundraiserRow | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("v_fundraiser_totals")
      .select("slug, title, story, goal_cents, payment_reference, photo_path")
      .eq("slug", slug)
      .single();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

interface RawSuggested {
  amount_cents?: unknown;
  impact_key?: unknown;
  default?: unknown;
}

function normalizeSet(value: unknown): SuggestedSets["oneoff"] {
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

async function fetchSuggested(): Promise<SuggestedSets> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("v_public_campaigns")
      .select("suggested_amounts")
      .limit(1)
      .maybeSingle();
    const record = data?.suggested_amounts as
      | { oneoff?: unknown; monthly?: unknown }
      | unknown[]
      | null;
    if (Array.isArray(record)) {
      const oneoff = normalizeSet(record);
      return { oneoff, monthly: oneoff };
    }
    const oneoff = normalizeSet(record?.oneoff);
    const monthly = normalizeSet(record?.monthly);
    return { oneoff, monthly: monthly.length > 0 ? monthly : oneoff };
  } catch {
    return { oneoff: [], monthly: [] };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [fundraiser, t] = await Promise.all([
    fetchFundraiser(slug),
    getTranslations({ locale, namespace: "nav" }),
  ]);
  return {
    title: fundraiser
      ? `${t("donate")} — ${fundraiser.title} — Santamore`
      : "Santamore",
  };
}

export default async function FundraiserDonatePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [fundraiser, suggested] = await Promise.all([
    fetchFundraiser(slug),
    fetchSuggested(),
  ]);
  if (!fundraiser) notFound();

  return (
    <DonateForm
      locale={locale as Locale}
      campaign={
        {
          kind: "fundraiser",
          slug: fundraiser.slug,
          title: fundraiser.title,
          description: fundraiser.story,
          goalCents: fundraiser.goal_cents,
          paymentReference: fundraiser.payment_reference,
        } satisfies DonateTarget
      }
      suggested={suggested}
      bank={getOrgBankDetails()}
      cardRailEnabled={process.env.NEXT_PUBLIC_CARD_RAIL_ENABLED === "true"}
      backPath={`/f/${fundraiser.slug}`}
      photoUrl={fundraiserPhotoUrl(fundraiser.photo_path)}
    />
  );
}
