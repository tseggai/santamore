import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { BeneficiaryStories, type PublicBeneficiary } from "@/components/beneficiaries/BeneficiaryStories";
import { createClient } from "@/lib/supabase/server";
import { routing, type Locale } from "@/i18n/routing";

// Staff publish stories from the admin; live on every request.
export const dynamic = "force-dynamic";

async function loadBeneficiaries(): Promise<PublicBeneficiary[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("v_public_beneficiaries")
      .select("id, slug, name, website, photo_path, story, campaign_slug, campaign_title")
      .order("sort_order")
      .order("name");
    return (data ?? []) as PublicBeneficiary[];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "beneficiaries" });
  return { title: `${t("title")} — Santamore`, description: t("sub") };
}

export default async function BeneficiariesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("beneficiaries");
  const rows = await loadBeneficiaries();

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-sea/80">{t("eyebrow")}</p>
      <h1 className="type-display mt-3 max-w-2xl text-4xl leading-[1.1] sm:text-5xl">{t("title")}</h1>
      <p className="mt-5 max-w-2xl text-[16.5px] leading-relaxed text-black/70">{t("sub")}</p>
      <div className="mt-12 border-t-[0.5px] border-line pt-10">
        {rows.length === 0 ? (
          <p className="text-[15px] text-black/60">{t("empty")}</p>
        ) : (
          <BeneficiaryStories rows={rows} locale={locale as Locale} labels={{ more: t("more"), cause: t("cause") }} />
        )}
      </div>
    </div>
  );
}
