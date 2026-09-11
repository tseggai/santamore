import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { DonateFlow } from "@/components/donate/DonateFlow";
import { loadDonateTarget } from "@/lib/donate/target";
import { routing, type Locale } from "@/i18n/routing";

// Reads live campaign data on every request; never prerendered at build.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: `${t("donate")} — Santamore` };
}

/**
 * The standalone checkout: the same three-step flow the overlay shows,
 * for deep links, shared URLs and visitors without JavaScript. Fundraiser
 * pages have their own under /f/<slug>/podrzi.
 */
export default async function DonatePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ za?: string; kampanja?: string }>;
}) {
  const { locale } = await params;
  const { za, kampanja } = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("donate");

  // Legacy links: the fundraiser checkout now lives under its page.
  if (za) {
    redirect(`/${locale}/f/${encodeURIComponent(za)}/podrzi`);
  }

  // /kampanje/<slug> links here with its own campaign; bare /podrzi keeps
  // the flagship one.
  const data = await loadDonateTarget({ kind: "campaign", slug: kampanja });
  if (!data) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20">
        <h1 className="type-display text-3xl">{t("payVerb")}</h1>
        <p className="mt-5 rounded-brand border-[1.5px] border-dashed border-sea bg-mist px-5 py-4 text-[14px] text-sea">
          {t("errServer")}
        </p>
      </div>
    );
  }

  return <DonateFlow locale={locale as Locale} data={data} />;
}
