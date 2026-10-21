import { getTranslations, setRequestLocale } from "next-intl/server";

import { legalDocLang, legalDocsByAudience, type LegalDocEntry } from "@/lib/legal-docs";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/**
 * Documents for members: how Santamore is organised and the policies written
 * for members, whole, in the member's language; the policies published on the
 * site are linked for completeness. The layout already requires a signed-in
 * account, which is the members' audience.
 */
export default async function DocumentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const lang = (doc: LegalDocEntry) => legalDocLang(doc, locale as Locale);
  const members = legalDocsByAudience("members");
  const published = legalDocsByAudience("public").filter((doc) => doc.route);
  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("documentsTitle")}</h1>
      <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-black/60">{t("documentsHint")}</p>
      <ul className="mt-5 max-w-2xl overflow-hidden rounded-lg bg-mist">
        {members.map((doc) => (
          <li key={doc.id} className="border-t-[0.5px] border-line first:border-t-0">
            <Link href={`/dashboard/dokumenti/${doc.id}`} className="flex flex-wrap items-baseline gap-x-3 px-4 py-3 text-[14.5px] transition-colors hover:bg-mist-2">
              <span className="font-semibold">{doc.title[lang(doc)] ?? doc.title.en}</span>
              <span className="ml-auto text-[14px] font-semibold text-sea">{t("documentsOpen")} →</span>
            </Link>
          </li>
        ))}
      </ul>
      <h2 className="mt-8 text-[16px] font-bold">{t("documentsPublic")}</h2>
      <p className="mt-1 max-w-xl text-[14px] text-black/60">{t("documentsPublicHint")}</p>
      <ul className="mt-3 max-w-2xl overflow-hidden rounded-lg bg-mist">
        {published.map((doc) => (
          <li key={doc.id} className="border-t-[0.5px] border-line first:border-t-0">
            <a href={`/${locale}/${doc.route}`} className="flex flex-wrap items-baseline gap-x-3 px-4 py-3 text-[14.5px] transition-colors hover:bg-mist-2">
              <span className="font-semibold">{doc.title[lang(doc)] ?? doc.title.en}</span>
              <span className="ml-auto text-[14px] font-semibold text-sea">{t("documentsOnSite")} ↗</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
