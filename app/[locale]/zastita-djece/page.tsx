import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { LegalPage } from "@/components/LegalPage";
import { safeguardingContent } from "@/content/legal/safeguarding";
import { routing } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const doc =
    safeguardingContent[
      hasLocale(routing.locales, locale) ? locale : routing.defaultLocale
    ];
  return { title: `${doc.title} — Santamore` };
}

export default async function SafeguardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <LegalPage doc={safeguardingContent[locale]} locale={locale} />;
}
