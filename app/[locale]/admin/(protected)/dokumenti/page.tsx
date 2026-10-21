import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHeader } from "@/components/console/PageHeader";
import packJson from "@/content/legal-pack/pack.json";
import { currentRole } from "@/lib/current-role";
import { meetingDate } from "@/lib/meetings";
import { createClient } from "@/lib/supabase/server";
import { canReadLegalDoc, legalDocLang, legalDocsByCategory, type LegalDocCategory, type LegalDocEntry } from "@/lib/legal-docs";
import { DOC_SECTIONS, type DocSection, type LegalPack } from "@/lib/legal-pack";
import { SECTIONS_BY_ROLE } from "@/lib/roles";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const pack = packJson as unknown as LegalPack;

/** The governance groups of each section (owner decision 2026-10-21); the registration section also lists the guide and the forms. */
const GROUPS_OF: Record<DocSection, LegalDocCategory[]> = {
  registration: ["template"],
  organisation: ["organisation", "board", "leadership"],
  published: ["public"],
};

const SECTION_TEXT: Record<DocSection, { title: string; hint: string }> = {
  registration: { title: "sectionRegistration", hint: "sectionRegistrationHint" },
  organisation: { title: "sectionOrganisation", hint: "sectionOrganisationHint" },
  published: { title: "sectionPublished", hint: "sectionPublishedHint" },
};

const GROUP_TITLE: Record<LegalDocCategory, string> = {
  organisation: "catOrganisation",
  board: "catBoard",
  leadership: "catLeadership",
  template: "catTemplates",
  public: "catPublic",
};

/**
 * Every document in one place, one section at a time: three squares at the
 * top (what is filed and signed, the organisation and its rules, the
 * policies published on the site) and, under them, only the chosen section.
 * Each row says who may read it; the role decides which rows show and
 * whether a row opens for editing (the pack) as well as reading.
 */
export default async function DocumentsIndexPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tRules, tPack, tMeetings, role, { tab }] = await Promise.all([getTranslations("admin.documents"), getTranslations("admin.rules"), getTranslations("admin.legalPack"), getTranslations("admin.meetings"), currentRole(), searchParams]);
  const canEdit = !!role && SECTIONS_BY_ROLE[role].includes("/admin/dokumenti/paket");
  const section: DocSection = DOC_SECTIONS.includes(tab as DocSection) ? (tab as DocSection) : "registration";
  const lang = (doc: LegalDocEntry) => legalDocLang(doc, locale as Locale);
  const me = locale === "me";
  const editHref = (doc: string) => `/admin/dokumenti/paket?doc=${encodeURIComponent(doc)}`;
  const groups = GROUPS_OF[section].map((g) => ({ g, docs: legalDocsByCategory(g).filter((doc) => canReadLegalDoc(role, doc)) })).filter((x) => x.docs.length > 0);
  const showRegistration = section === "registration" && canEdit;
  // The latest meetings, under the organisation: agenda and minutes together (migration 0084).
  const meetings = section === "organisation" ? ((await (await createClient()).from("meetings").select("id, held_at, title, minutes_md").order("held_at", { ascending: false }).limit(5)).data ?? []) : [];

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

      <nav aria-label={t("sections")} className="mt-6 grid gap-3 sm:grid-cols-3">
        {DOC_SECTIONS.map((key) => {
          const active = key === section;
          return (
            <Link key={key} href={`/admin/dokumenti?tab=${key}`} aria-current={active ? "page" : undefined}
              className={`block rounded-lg px-4 py-4 transition-colors sm:min-h-28 ${active ? "bg-sea text-paper" : "bg-mist text-black hover:bg-mist-2"}`}>
              <span className="block text-[15px] font-bold leading-snug">{t(SECTION_TEXT[key].title)}</span>
              <span className={`mt-1.5 block text-[13px] leading-relaxed ${active ? "text-paper/75" : "text-black/60"}`}>{t(SECTION_TEXT[key].hint)}</span>
            </Link>
          );
        })}
      </nav>

      {showRegistration ? (
        <section className="mt-8">
          <h2 className="text-[16px] font-bold">{t("registration")}</h2>
          <ul className="mt-3 overflow-hidden rounded-lg bg-mist">
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
        </section>
      ) : null}

      <div className={section === "organisation" ? "lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8" : ""}>
        <div>
          {groups.map(({ g, docs }) => (
            <section key={g} className="mt-8">
              <h2 className="text-[16px] font-bold">{tRules(GROUP_TITLE[g])}</h2>
              <ul className="mt-3 overflow-hidden rounded-lg bg-mist">{docs.map(docRow)}</ul>
            </section>
          ))}
        </div>
        {section === "organisation" ? (
          <aside className="mt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-[16px] font-bold">{tMeetings("latest")}</h2>
              <Link href="/admin/dokumenti/sastanci" className="text-[14px] font-semibold text-sea hover:underline">{tMeetings("all")} →</Link>
            </div>
            <p className="mt-1 text-[14px] text-black/60">{tMeetings("hint")}</p>
            <ul className="mt-3 overflow-hidden rounded-lg bg-mist">
              {meetings.length === 0 ? <li className="px-4 py-3 text-[14.5px] text-black/60">{tMeetings("empty")}</li> : null}
              {meetings.map((m) => (
                <li key={m.id} className="border-t-[0.5px] border-line first:border-t-0">
                  <Link href={`/admin/dokumenti/sastanci/${m.id}`} className="block px-4 py-3 text-[14.5px] transition-colors hover:bg-mist-2">
                    <span className="block font-mono text-[12.5px] font-bold text-black/55">{meetingDate(m.held_at, locale)}</span>
                    <span className="block font-semibold leading-snug">{m.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>
      {!showRegistration && groups.length === 0 && section !== "organisation" ? <p className="mt-8 text-[14.5px] text-black/60">{t("sectionEmpty")}</p> : null}
    </div>
  );
}
