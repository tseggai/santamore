"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/Avatar";
import { LeaderboardList, entryBar, type LeaderboardEntry } from "@/components/Leaderboard";
import { formatCents } from "@/lib/money";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/**
 * Everyone raising on one event: individuals or teams, as a grid of faces
 * or a list, with a name search, ordered by what the page raised.
 */
export function FundraisersBrowser({
  causes,
  selectedCause,
  individuals,
  teams,
  startHref,
}: {
  causes: { slug: string; name: string; pages: number }[];
  /** null = every cause, ranked together. */
  selectedCause: string | null;
  individuals: LeaderboardEntry[];
  teams: LeaderboardEntry[];
  /** Where "start fundraising" leads. */
  startHref: string;
}) {
  const t = useTranslations("leaderboard");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [tab, setTab] = useState<"individuals" | "teams">("individuals");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");

  const source = tab === "individuals" ? individuals : teams;
  const needle = query.trim().toLowerCase();
  const entries = needle ? source.filter((entry) => entry.title.toLowerCase().includes(needle)) : source;
  const top = source[0]?.raisedCents || 1;
  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });

  const field = "h-10 rounded-lg bg-mist px-2 text-[14px] sm:px-3 font-semibold outline-none focus:bg-mist-2";

  return (
    <div className="mt-6">
      {/* One line, on a phone too: cause, individuals or teams, search, then the
          view toggle and "start fundraising" on the right (owner decision 2026-11-26). */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <label className="sr-only" htmlFor="causePick">{t("pickCause")}</label>
        <select
          id="causePick"
          value={selectedCause ?? ""}
          onChange={(e) => router.push(`/${locale}/prikupljaci${e.target.value ? `?cilj=${encodeURIComponent(e.target.value)}` : ""}`)}
          className={`${field} w-0 min-w-0 flex-1 sm:w-auto sm:flex-none`}
        >
          <option value="">{t("allCauses")}</option>
          {causes.map((cause) => (
            <option key={cause.slug} value={cause.slug}>
              {cause.name}{cause.pages > 0 ? ` (${cause.pages})` : ""}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="kindPick">{t("fundraisersTitle")}</label>
        <select
          id="kindPick"
          value={tab}
          onChange={(e) => setTab(e.target.value === "teams" ? "teams" : "individuals")}
          className={`${field} w-0 min-w-0 flex-1 sm:w-auto sm:flex-none`}
        >
          <option value="individuals">{t("individuals")}</option>
          <option value="teams">{t("teams")}</option>
        </select>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchName")}
          aria-label={t("searchName")}
          className={`${field} w-0 min-w-0 flex-1 font-medium sm:ml-auto sm:w-56 sm:flex-none`}
        />
        {/* One button: it shows the view you would switch to. */}
        <button
          type="button"
          onClick={() => setView(view === "grid" ? "list" : "grid")}
          aria-label={view === "grid" ? t("viewList") : t("viewGrid")}
          title={view === "grid" ? t("viewList") : t("viewGrid")}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mist text-[15px] font-semibold transition-colors hover:bg-mist-2"
        >
          <span aria-hidden>{view === "grid" ? "☰" : "▦"}</span>
        </button>
        <Link
          href={startHref}
          aria-label={t("startFundraisingCta")}
          title={t("startFundraisingCta")}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red text-[22px] font-bold leading-none text-paper transition-colors hover:bg-red-dark"
        >
          <span aria-hidden>+</span>
        </Link>
      </div>

      {entries.length === 0 ? (
        <p className="mt-5 text-[14.5px] text-black/60">{needle ? t("noMatch") : tab === "individuals" ? t("emptyIndividuals") : t("emptyTeams")}</p>
      ) : view === "list" ? (
        <div className="mt-3">
          <LeaderboardList locale={locale} entries={entries} numbered={false} />
        </div>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {entries.map((entry) => {
            const rank = source.indexOf(entry) + 1;
            return (
              <li key={entry.slug}>
                <Link href={entry.href} className="flex h-full flex-col items-center rounded-lg bg-mist px-3 py-5 text-center transition-colors hover:bg-mist-2">
                  <Avatar src={entry.photoUrl ?? null} name={entry.title} size={72} />
                  <span className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug">{entry.title}</span>
                  {entry.meta ? <span className="mt-0.5 font-mono text-[12.5px] text-black/50">{entry.meta}</span> : null}
                  <span className="mt-2 font-mono text-[15px] font-semibold tabular-nums">{entry.display ?? money(entry.raisedCents)}</span>
                  <span className="mt-2 block h-[5px] w-full overflow-hidden rounded-[3px] bg-mist-2">
                    <span className={`block h-full rounded-[3px] ${entryBar(entry, top, rank === 1).tone}`} style={{ width: entryBar(entry, top, rank === 1).width }} />
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
