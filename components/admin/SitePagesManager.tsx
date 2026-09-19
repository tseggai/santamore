"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { SectionsEditor, type PickOptions } from "@/components/admin/SectionsEditor";
import { SidePanel } from "@/components/console/SidePanel";
import type { PageContent, SitePage } from "@/lib/site-pages";
import { draftsFromSections, sectionsOf, type Section, type SectionDraft } from "@/lib/site-sections";
import { routing, type Locale } from "@/i18n/routing";

export type { PickOptions } from "@/components/admin/SectionsEditor";

export interface SitePageRow {
  page: SitePage;
  locale: Locale;
  content: PageContent | { sections: Section[] };
  updated_at: string;
}

const PAGES: { page: SitePage; href: string }[] = [
  { page: "about", href: "/o-nama" },
  { page: "how", href: "/kako-radimo" },
];

/**
 * The editorial pages, one card each; a card opens the sections editor.
 * A page not yet saved as sections starts from the shipped copy, converted
 * into sections, so staff edit what is on the site rather than start blank.
 */
export function SitePagesManager({ rows, shipped, locale, options }: { rows: SitePageRow[]; shipped: Record<SitePage, Record<Locale, Section[]>>; locale: Locale; options: PickOptions }) {
  const t = useTranslations("admin");
  const [open, setOpen] = useState<SitePage | null>(null);

  const draftsFor = (page: SitePage): SectionDraft[] => {
    const saved: Partial<Record<Locale, Section[]>> = {};
    for (const loc of routing.locales) {
      const row = rows.find((r) => r.page === page && r.locale === loc);
      const sections = row ? sectionsOf(row.content) : null;
      if (sections) saved[loc as Locale] = sections;
    }
    const source = Object.keys(saved).length > 0 ? saved : shipped[page];
    return draftsFromSections(source, routing.locales as readonly Locale[]);
  };

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2">
        {PAGES.map(({ page, href }) => {
          const latest = routing.locales.map((loc) => rows.find((r) => r.page === page && r.locale === loc)?.updated_at ?? "").sort().at(-1) || null;
          return (
            <li key={page}>
              <button type="button" onClick={() => setOpen(page)} className="w-full rounded-lg bg-mist px-4 py-4 text-left transition-colors hover:bg-mist-2">
                <p className="text-[15.5px] font-bold">{t(`sitePage.${page}`)}</p>
                <p className="mt-1 text-[13.5px] text-black/60">
                  {latest ? t("sitePageEdited", { date: latest.slice(0, 10) }) : t("sitePageShipped")} · <span className="font-mono">{href}</span>
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      <SidePanel open={open !== null} title={open ? t(`sitePage.${open}`) : ""} onClose={() => setOpen(null)} wide>
        {open ? <SectionsEditor key={open} page={open} initial={draftsFor(open)} options={options} locale={locale} onDone={() => setOpen(null)} /> : null}
      </SidePanel>
    </>
  );
}
