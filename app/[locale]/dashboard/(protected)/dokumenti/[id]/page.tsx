import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { OrgChart } from "@/components/org/OrgChart";
import { legalDoc, legalDocLang } from "@/lib/legal-docs";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/** One members' document, whole, in the member's language (English where there is no translation), with its drawing where it has one. */
export default async function MemberDocPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const doc = legalDoc(id);
  // Only the members' documents are read here; the rest live on the site or in the console.
  if (!doc || doc.audience !== "members") notFound();
  const t = await getTranslations("dashboard");
  const lang = legalDocLang(doc, locale as Locale);
  const title = doc.title[lang] ?? doc.title.en ?? id;
  return (
    <div className="py-8">
      <p className="text-[14px]"><Link href="/dashboard/dokumenti" className="font-semibold text-sea hover:underline">← {t("documentsTitle")}</Link></p>
      <h1 className="type-display mt-4 text-2xl">{title}</h1>
      <p className="mt-2 max-w-xl text-[14px] text-black/60">{lang === "me" ? t("documentsOperative") : t("documentsTranslation")}</p>
      {doc.figure === "org-chart" ? (
        <figure className="mt-6 max-w-3xl rounded-lg bg-paper p-2">
          <OrgChart lang={lang === "me" ? "me" : "en"} />
        </figure>
      ) : null}
      <article className="prose-legal mt-6 max-w-3xl" dangerouslySetInnerHTML={{ __html: doc.html[lang] ?? doc.html.en ?? "" }} />
    </div>
  );
}
