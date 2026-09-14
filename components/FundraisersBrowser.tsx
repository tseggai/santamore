"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Avatar } from "@/components/Avatar";
import { LeaderboardList, type LeaderboardEntry } from "@/components/Leaderboard";
import { formatCents } from "@/lib/money";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/**
 * Everyone raising on one event: individuals or teams, as a grid of faces
 * or the ranked list, with a name search. Rank is by what the page raised.
 */
export function FundraisersBrowser({ individuals, teams }: { individuals: LeaderboardEntry[]; teams: LeaderboardEntry[] }) {
  const t = useTranslations("leaderboard");
  const locale = useLocale() as Locale;
  const [tab, setTab] = useState<"individuals" | "teams">("individuals");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");

  const source = tab === "individuals" ? individuals : teams;
  const needle = query.trim().toLowerCase();
  const entries = needle ? source.filter((entry) => entry.title.toLowerCase().includes(needle)) : source;
  const top = source[0]?.raisedCents || 1;
  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });
  const chip = (active: boolean) =>
    `rounded-lg px-3.5 py-2 text-[14px] font-semibold transition-colors ${active ? "bg-ink text-paper" : "bg-mist hover:bg-mist-2"}`;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label={t("fundraisersTitle")} className="flex gap-1.5">
          <button type="button" aria-pressed={tab === "individuals"} onClick={() => setTab("individuals")} className={chip(tab === "individuals")}>{t("individuals")}</button>
          <button type="button" aria-pressed={tab === "teams"} onClick={() => setTab("teams")} className={chip(tab === "teams")}>{t("teams")}</button>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchName")}
          aria-label={t("searchName")}
          className="w-full rounded-lg bg-mist px-3.5 py-2 text-[14.5px] outline-none focus:bg-mist-2 sm:ml-auto sm:w-56"
        />
        <div role="group" aria-label={t("viewLabel")} className="flex gap-1.5">
          <button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")} className={chip(view === "grid")} aria-label={t("viewGrid")} title={t("viewGrid")}>▦</button>
          <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={chip(view === "list")} aria-label={t("viewList")} title={t("viewList")}>☰</button>
        </div>
      </div>
      <p className="mt-2 text-[13.5px] text-black/55">{tab === "individuals" ? t("individualsHint") : t("teamsHint")}</p>

      {entries.length === 0 ? (
        <p className="mt-5 text-[14.5px] text-black/60">{needle ? t("noMatch") : tab === "individuals" ? t("emptyIndividuals") : t("emptyTeams")}</p>
      ) : view === "list" ? (
        <div className="mt-3">
          <LeaderboardList locale={locale} entries={entries} />
        </div>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {entries.map((entry) => {
            const rank = source.indexOf(entry) + 1;
            return (
              <li key={entry.slug}>
                <Link href={entry.href} className="flex h-full flex-col items-center rounded-lg bg-mist px-3 py-5 text-center transition-colors hover:bg-mist-2">
                  <span className="relative">
                    <Avatar src={entry.photoUrl ?? null} name={entry.title} size={72} />
                    <span className={`absolute -left-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full font-mono text-[12px] font-bold ${rank <= 3 ? "bg-red text-paper" : "bg-paper text-black/60"}`}>
                      {rank}
                    </span>
                  </span>
                  <span className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug">{entry.title}</span>
                  {entry.meta ? <span className="mt-0.5 font-mono text-[12.5px] text-black/50">{entry.meta}</span> : null}
                  <span className="mt-2 font-mono text-[15px] font-semibold tabular-nums">{entry.display ?? money(entry.raisedCents)}</span>
                  <span className="mt-2 block h-[5px] w-full overflow-hidden rounded-[3px] bg-mist-2">
                    <span className={`block h-full rounded-[3px] ${rank === 1 ? "bg-red" : "bg-ink"}`} style={{ width: `${Math.max(2, Math.round((entry.raisedCents / top) * 100))}%` }} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
