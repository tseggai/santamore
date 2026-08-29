import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { DonateForm, type SuggestedSets } from "@/components/donate/DonateForm";
import { getOrgBankDetails } from "@/lib/org";
import { createServiceClient } from "@/lib/supabase/admin";
import { routing, type Locale } from "@/i18n/routing";

// Reads live campaign data on every request; never prerendered at build.
export const dynamic = "force-dynamic";

// Task 3 serves the single seeded campaign; fundraiser pages (Task 5) will
// route here with their own slug and reference.
const DEFAULT_CAMPAIGN_SLUG = "santa-run-2026";

interface CampaignRow {
  slug: string;
  title: string;
  description: string | null;
  goal_cents: number;
  payment_reference: string;
  suggested_amounts: unknown;
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

/** Tolerates both the legacy flat array and the {oneoff, monthly} shape. */
function normalizeSuggested(value: unknown): SuggestedSets {
  if (Array.isArray(value)) {
    const oneoff = normalizeSet(value);
    return { oneoff, monthly: oneoff };
  }
  const record = value as { oneoff?: unknown; monthly?: unknown } | null;
  const oneoff = normalizeSet(record?.oneoff);
  const monthly = normalizeSet(record?.monthly);
  return { oneoff, monthly: monthly.length > 0 ? monthly : oneoff };
}

async function fetchCampaign(): Promise<CampaignRow | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("campaigns")
      .select("slug, title, description, goal_cents, payment_reference, suggested_amounts")
      .eq("slug", DEFAULT_CAMPAIGN_SLUG)
      .eq("is_public", true)
      .single();
    if (error) {
      console.error("[donate] campaign fetch failed:", error.code);
      return null;
    }
    return data;
  } catch (error) {
    console.error("[donate] campaign fetch failed:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: `${t("donate")} — Santamore` };
}

export default async function DonatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("donate");

  const campaign = await fetchCampaign();
  if (!campaign) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20">
        <h1 className="type-display text-3xl">{t("payVerb")}</h1>
        <p className="mt-5 rounded-brand border-[1.5px] border-dashed border-sea bg-mist px-5 py-4 text-[14px] text-sea">
          {t("errServer")}
        </p>
      </div>
    );
  }

  return (
    <DonateForm
      locale={locale as Locale}
      campaign={{
        slug: campaign.slug,
        title: campaign.title,
        description: campaign.description,
        goalCents: campaign.goal_cents,
        paymentReference: campaign.payment_reference,
      }}
      suggested={normalizeSuggested(campaign.suggested_amounts)}
      bank={getOrgBankDetails()}
      cardRailEnabled={process.env.NEXT_PUBLIC_CARD_RAIL_ENABLED === "true"}
    />
  );
}
