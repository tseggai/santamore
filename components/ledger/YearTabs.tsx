"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import type { Locale } from "@/i18n/routing";

/**
 * The year in view on the transparency page: a select with every year
 * since the founding year and "All years". Choosing one navigates, so a
 * year is shareable and the server renders exactly that year's ledger.
 */
export function YearTabs({ years, selected }: { years: number[]; selected: number | null }) {
  const t = useTranslations("years");
  const locale = useLocale() as Locale;
  const router = useRouter();
  return (
    <div className="mt-5 flex items-center gap-3">
      <label htmlFor="yearPick" className="text-[14px] font-semibold text-black/70">{t("pickYearLabel")}</label>
      <select
        id="yearPick"
        value={selected === null ? "sve" : String(selected)}
        onChange={(event) => router.push(`/${locale}/transparentnost?godina=${event.target.value}`)}
        className="rounded-lg bg-mist px-3.5 py-2 font-mono text-[15px] font-semibold tabular-nums outline-none focus:bg-mist-2"
      >
        {[...years].reverse().map((year) => (
          <option key={year} value={year}>{year}</option>
        ))}
        <option value="sve">{t("allYears")}</option>
      </select>
    </div>
  );
}
