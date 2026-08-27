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
  podrzi: "donate",
  prikupljaci: "fundraisers",
  partneri: "partners",
  vijesti: "news",
  "cesta-pitanja": "faq",
  kontakt: "contact",
};

const LEGAL_STUBS: Record<string, string> = {
  "pravila-privatnosti": "privacy",
  kolacici: "cookies",
  "uslovi-koriscenja": "terms",
  "pravila-donacija": "donations",
  "uslovi-ucesca": "eventTerms",
  "zastita-djece": "safeguarding",
  kodeks: "codeOfConduct",
  "informacije-o-organizaciji": "impressum",
};

export function generateStaticParams() {
  const slugs = [...Object.keys(SITE_STUBS), ...Object.keys(LEGAL_STUBS)];
  return routing.locales.flatMap((locale) =>
    slugs.map((slug) => ({ locale, slug })),
  );
}

export const dynamicParams = false;

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
  const legalKey = LEGAL_STUBS[slug];
  if (!siteKey && !legalKey) notFound();

  const title = legalKey
    ? t(`footer.legal.${legalKey}`)
    : t(`footer.site.${siteKey}`);

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
