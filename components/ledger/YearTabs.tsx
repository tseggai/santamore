"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

/**
 * The year in view on the transparency page: one tab per year since the
 * founding year, plus everything at once. Each tab is a link, so a year is
 * shareable and the server renders exactly that year's ledger.
 */
export function YearTabs({ years, selected }: { years: number[]; selected: number | null }) {
  const t = useTranslations("years");
  const chip = (active: boolean) =>
    `rounded-lg px-3.5 py-2 font-mono text-[14px] font-semibold tabular-nums transition-colors ${active ? "bg-ink text-paper" : "bg-mist hover:bg-mist-2"}`;
  return (
    <nav aria-label={t("pickYear")} className="mt-5 flex flex-wrap gap-1.5">
      {years.map((year) => (
        <Link key={year} href={`/transparentnost?godina=${year}`} aria-current={selected === year ? "page" : undefined} className={chip(selected === year)}>
          {year}
        </Link>
      ))}
      <Link href="/transparentnost?godina=sve" aria-current={selected === null ? "page" : undefined} className={`${chip(selected === null)} font-sans`}>
        {t("allYears")}
      </Link>
    </nav>
  );
}
