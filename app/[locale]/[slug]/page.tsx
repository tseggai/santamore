import { notFound } from "next/navigation";
import { hasLocale, useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";

/**
 * Interim stub for every planned route that has not been built yet, so no
 * header or footer link 404s. As tasks land, real routes (e.g. app/[locale]/
 * podrzi/) take precedence over this dynamic segment and slugs get removed
 * from these lists.
 */
const SITE_STUBS: Record<string, string> = {
  "o-nama": "about",
  dogadjaji: "events",
  galerija: "gallery",
  transparentnost: "ledger",
  partneri: "partners",
  vijesti: "news",
  "cesta-pitanja": "faq",
};

export function generateStaticParams() {
  const slugs = Object.keys(SITE_STUBS);
  return routing.locales.flatMap((locale) =>
    slugs.map((slug) => ({ locale, slug })),
  );
}

// dynamicParams stays enabled so unknown slugs reach the notFound() call
// below and render the localized not-found page inside the locale layout.

export default function StubPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = use(params);
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = useTranslations();

  const siteKey = SITE_STUBS[slug];
  if (!siteKey) notFound();

  const title = t(`footer.site.${siteKey}`);

  return (
    <div className="mx-auto max-w-3xl px-5 py-20">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
        {t("legalStub.title")}
      </p>
      <h1 className="type-display mt-3 text-4xl">{title}</h1>
      <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink/70">
        {t("legalStub.body")}
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-xl border-[1.5px] border-line px-5 py-3 text-sm font-semibold hover:border-sea hover:text-sea"
      >
        {t("legalStub.back")}
      </Link>
    </div>
  );
}
