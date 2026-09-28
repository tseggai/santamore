import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { LegalPage } from "@/components/LegalPage";
import { publicLegalDoc } from "@/lib/legal-docs";
import { routing } from "@/i18n/routing";

const DOC = "child-safeguarding-policy";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const doc = publicLegalDoc(DOC, hasLocale(routing.locales, locale) ? locale : routing.defaultLocale);
  return { title: doc ? `${doc.title} — Santamore` : "Santamore" };
}

export default async function SafeguardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const doc = publicLegalDoc(DOC, locale);
  if (!doc) notFound();
  return <LegalPage title={doc.title} html={doc.html} />;
}
