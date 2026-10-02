import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHeader } from "@/components/console/PageHeader";
import { legalDocLang, legalDocsByCategory, type LegalDocCategory, type LegalDocEntry } from "@/lib/legal-docs";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const CATEGORIES: { key: LegalDocCategory; title: string; hint: string }[] = [
  { key: "board", title: "catBoard", hint: "catBoardHint" },
  { key: "public", title: "catPublic", hint: "catPublicHint" },
  { key: "template", title: "catTemplates", hint: "catTemplatesHint" },
];

/** The team's rules and templates, for reference: every governance document in Montenegrin and English, staff only. */
export default async function RulesIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.rules");
  const lang = (doc: LegalDocEntry) => legalDocLang(doc, locale as Locale);
  return (
    <div className="py-8">
      <PageHeader title={t("title")} />
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-black/60">{t("intro")}</p>
      {CATEGORIES.map((cat) => {
        const docs = legalDocsByCategory(cat.key);
        if (docs.length === 0) return null;
        return (
          <section key={cat.key} className="mt-8">
            <h2 className="text-[16px] font-bold">{t(cat.title)}</h2>
            <p className="mt-1 max-w-2xl text-[14px] text-black/60">{t(cat.hint)}</p>
            <ul className="mt-3 overflow-hidden rounded-lg bg-mist">
              {docs.map((doc) => (
                <li key={doc.id} className="border-t-[0.5px] border-line first:border-t-0">
                  <Link href={`/admin/pravila/${doc.id}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-3 text-[14.5px] transition-colors hover:bg-mist-2">
                    <span className="font-semibold">{doc.title[lang(doc)] ?? doc.title.en}</span>
                    {doc.route ? <span className="text-black/55">{t("onSite", { path: `/${doc.route}` })}</span> : null}
                    <span className="ml-auto text-[14px] font-semibold text-sea">{t("open")} →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
