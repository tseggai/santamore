import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHeader } from "@/components/console/PageHeader";
import packJson from "@/content/legal-pack/pack.json";
import { currentRole } from "@/lib/current-role";
import { canReadLegalDoc, legalDocLang, legalDocsByCategory, type LegalDocCategory, type LegalDocEntry } from "@/lib/legal-docs";
import type { LegalPack } from "@/lib/legal-pack";
import { SECTIONS_BY_ROLE } from "@/lib/roles";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const pack = packJson as unknown as LegalPack;

/** The governance groups by section (owner decision 2026-10-21); each lists the documents the role may read. */
const SECTIONS: { key: string; title: string; hint: string; groups: LegalDocCategory[]; registration?: boolean }[] = [
  { key: "registration", title: "sectionRegistration", hint: "sectionRegistrationHint", groups: ["template"], registration: true },
  { key: "organisation", title: "sectionOrganisation", hint: "sectionOrganisationHint", groups: ["organisation", "board", "leadership"] },
  { key: "published", title: "sectionPublished", hint: "sectionPublishedHint", groups: ["public"] },
];

const GROUP_TITLE: Record<LegalDocCategory, string> = {
  organisation: "catOrganisation",
  board: "catBoard",
  leadership: "catLeadership",
  template: "catTemplates",
  public: "catPublic",
};

/**
 * Every document in one place, in three sections: what is filed and signed
 * (the founders' guide, the Ministry forms, the agreement templates), the
 * organisation and its rules, and the policies published on the site. Each
 * row says who may read it; the role decides which rows show and whether a
 * row opens for editing (the pack) as well as reading.
 */
export default async function DocumentsIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tRules, tPack, role] = await Promise.all([getTranslations("admin.documents"), getTranslations("admin.rules"), getTranslations("admin.legalPack"), currentRole()]);
  const canEdit = !!role && SECTIONS_BY_ROLE[role].includes("/admin/dokumenti/paket");
  const lang = (doc: LegalDocEntry) => legalDocLang(doc, locale as Locale);
  const me = locale === "me";
  const editHref = (doc: string) => `/admin/dokumenti/paket?doc=${encodeURIComponent(doc)}`;

  const docRow = (doc: LegalDocEntry) => (
    <li key={doc.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t-[0.5px] border-line px-4 py-3 text-[14.5px] first:border-t-0">
      <Link href={`/admin/dokumenti/${doc.id}`} className="font-semibold text-black hover:underline">{doc.title[lang(doc)] ?? doc.title.en}</Link>
      <span className={doc.audience === "leadership" ? "font-semibold text-red-dark" : "text-black/55"}>{t(`audience.${doc.audience}`)}</span>
      {doc.route ? <a href={`/${locale}/${doc.route}`} className="text-black/55 hover:underline" target="_blank" rel="noreferrer">{tRules("onSite", { path: `/${doc.route}` })}</a> : null}
      <span className="ml-auto flex gap-4 text-[14px] font-semibold text-sea">
        <Link href={`/admin/dokumenti/${doc.id}`} className="hover:underline">{t("read")}</Link>
        {canEdit ? <Link href={editHref(`draft:${doc.id}`)} className="hover:underline">{t("edit")} →</Link> : null}
      </span>
    </li>
  );

  return (
    <div className="py-8">
      <PageHeader title={t("title")} />
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-black/60">{t("intro")}</p>

      {SECTIONS.map((section) => {
        const groups = section.groups.map((g) => ({ g, docs: legalDocsByCategory(g).filter((doc) => canReadLegalDoc(role, doc)) })).filter((x) => x.docs.length > 0);
        const showRegistration = !!section.registration && canEdit;
        if (!showRegistration && groups.length === 0) return null;
        return (
          <section key={section.key} className="mt-10">
            <h2 className="type-display text-xl">{t(section.title)}</h2>
            <p className="mt-1 max-w-2xl text-[14px] text-black/60">{t(section.hint)}</p>

            {showRegistration ? (
              <div className="mt-4">
                <h3 className="text-[15px] font-bold">{t("registration")}</h3>
                <ul className="mt-2 overflow-hidden rounded-lg bg-mist">
                  {pack.guide ? (
                    <li className="border-t-[0.5px] border-line first:border-t-0">
                      <Link href={editHref("guide")} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-3 text-[14.5px] transition-colors hover:bg-mist-2">
                        <span className="font-semibold">{me ? pack.guide.title.me : pack.guide.title.en}</span>
                        <span className="text-black/55">{tPack("guide")}</span>
                        <span className="ml-auto text-[14px] font-semibold text-sea">{t("open")} →</span>
                      </Link>
                    </li>
                  ) : null}
                  {pack.forms.map((form) => (
                    <li key={form.id} className="border-t-[0.5px] border-line first:border-t-0">
                      <Link href={editHref(form.id)} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-3 text-[14.5px] transition-colors hover:bg-mist-2">
                        <span className="font-mono text-[13px] font-bold text-black/55">{form.label ?? form.id}</span>
                        <span className="font-semibold">{me ? form.title.me : form.title.en}</span>
                        <span className="text-black/55">{tPack("forms")}</span>
                        <span className="ml-auto text-[14px] font-semibold text-sea">{t("edit")} →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {groups.map(({ g, docs }) => (
              <div key={g} className="mt-4">
                <h3 className="text-[15px] font-bold">{tRules(GROUP_TITLE[g])}</h3>
                <ul className="mt-2 overflow-hidden rounded-lg bg-mist">{docs.map(docRow)}</ul>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
