import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHeader } from "@/components/console/PageHeader";
import { LEGAL_DOC_IDS, legalDoc, legalDocLang } from "@/lib/legal-docs";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const SHOW = ["me", "en", "both"] as const;
type Show = (typeof SHOW)[number];

export function generateStaticParams() {
  return LEGAL_DOC_IDS.map((id) => ({ id }));
}

/** One governance document for the team: Montenegrin, English or both side by side, with the working notes. */
export default async function RulesDocPage({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ show?: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const doc = legalDoc(id);
  if (!doc) notFound();
  const t = await getTranslations("admin.rules");
  const { show: rawShow } = await searchParams;
  const show: Show = SHOW.includes(rawShow as Show) ? (rawShow as Show) : legalDocLang(doc, locale as Locale) === "me" ? "me" : "en";
  const title = doc.title[show === "me" ? "me" : "en"] ?? doc.title.en ?? id;
  const category = t(doc.category === "board" ? "catBoard" : doc.category === "public" ? "catPublic" : "catTemplates");
  return (
    <div className="py-8">
      <p className="text-[14px]"><Link href="/admin/pravila" className="font-semibold text-sea hover:underline">← {t("title")}</Link></p>
      <div className="mt-4">
        <PageHeader title={title} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[14px] text-black/60 print:hidden">
        <span className="rounded-lg bg-mist px-2.5 py-1 font-semibold text-black/70">{category}</span>
        {doc.route ? <a href={`/${locale}/${doc.route}`} className="font-semibold text-sea hover:underline" target="_blank" rel="noreferrer">{t("openOnSite")} ↗</a> : null}
        <span className="grow" />
        <div role="group" aria-label={t("language")} className="flex overflow-hidden rounded-lg bg-mist">
          {SHOW.map((s) => (
            <Link key={s} href={`/admin/pravila/${id}?show=${s}`} aria-current={show === s ? "true" : undefined}
              className={`px-3 py-1.5 text-[14px] font-semibold ${show === s ? "bg-sea text-paper" : "text-black/70 hover:bg-mist-2"}`}>
              {t(s === "me" ? "showMe" : s === "en" ? "showEn" : "showBoth")}
            </Link>
          ))}
        </div>
      </div>
      <p className="mt-4 rounded-lg bg-sand px-4 py-3 text-[14px] text-black/70 print:hidden">{t("hint")}</p>
      <article className="prose-legal mt-6 max-w-3xl" data-show={show === "both" ? undefined : show} dangerouslySetInnerHTML={{ __html: doc.rulesHtml }} />
      {doc.notesHtml ? (
        <details className="mt-10 max-w-3xl rounded-lg bg-mist px-5 py-4 print:hidden">
          <summary className="cursor-pointer text-[15px] font-bold">{t("notes")}</summary>
          <p className="mt-1 text-[14px] text-black/60">{t("notesHint")}</p>
          <div className="prose-legal mt-3" dangerouslySetInnerHTML={{ __html: doc.notesHtml }} />
        </details>
      ) : null}
    </div>
  );
}
