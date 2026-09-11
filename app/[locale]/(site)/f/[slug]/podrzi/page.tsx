import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { DonateFlow } from "@/components/donate/DonateFlow";
import { loadDonateTarget } from "@/lib/donate/target";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

// The checkout step OF a fundraiser page: /f/<slug>/podrzi. The campaign
// checkout stays at /podrzi; this route nests under the page it funds so
// the URL itself carries the relationship.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [data, t] = await Promise.all([
    loadDonateTarget({ kind: "fundraiser", slug }),
    getTranslations({ locale, namespace: "nav" }),
  ]);
  return {
    title: data ? `${t("donate")} — ${data.target.title} — Santamore` : "Santamore",
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

  const data = await loadDonateTarget({ kind: "fundraiser", slug });
  if (!data) notFound();

  return <DonateFlow locale={locale as Locale} data={data} />;
}
