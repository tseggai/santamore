import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHeader } from "@/components/console/PageHeader";
import { currentRole } from "@/lib/current-role";
import { canReadLegalDoc, legalDocLang, legalDocsByCategory, type LegalDocCategory, type LegalDocEntry } from "@/lib/legal-docs";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const CATEGORIES: { key: LegalDocCategory; title: string; hint: string }[] = [
  { key: "organisation", title: "catOrganisation", hint: "catOrganisationHint" },
  { key: "board", title: "catBoard", hint: "catBoardHint" },
  { key: "public", title: "catPublic", hint: "catPublicHint" },
  { key: "template", title: "catTemplates", hint: "catTemplatesHint" },
  { key: "leadership", title: "catLeadership", hint: "catLeadershipHint" },
];

/** The team's rules and templates, for reference: every governance document the role may read, in Montenegrin and English. */
export default async function RulesIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, role] = await Promise.all([getTranslations("admin.rules"), currentRole()]);
  const lang = (doc: LegalDocEntry) => legalDocLang(doc, locale as Locale);
  return (
    <div className="py-8">
      <PageHeader title={t("title")} />
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-black/60">{t("intro")}</p>
      {CATEGORIES.map((cat) => {
        const docs = legalDocsByCategory(cat.key).filter((doc) => canReadLegalDoc(role, doc));
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
                    {doc.audience === "members" ? <span className="text-black/55">{t("forMembers")}</span> : null}
                    {doc.audience === "leadership" ? <span className="font-semibold text-red-dark">{t("forLeadership")}</span> : null}
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
