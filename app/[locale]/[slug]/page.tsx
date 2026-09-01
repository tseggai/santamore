import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { routing } from "@/i18n/routing";

/**
 * Every planned route now has a real page, so this dynamic segment only
 * exists to route unknown slugs to the localized not-found page inside the
 * locale layout (a top-level 404 would lose the header, footer and locale).
 */
export default function UnknownSlugPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale } = use(params);
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  notFound();
}
