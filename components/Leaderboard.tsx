"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Avatar } from "@/components/Avatar";
import { formatCents, type Cents } from "@/lib/money";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export interface LeaderboardEntry {
  slug: string;
  title: string;
  /** Public photo URL, or null for the initial avatar. */
  photoUrl?: string | null;
  /** Ranking value — money, or a challenge metric via `display`. */
  raisedCents: Cents;
  /** Preformatted value shown instead of money (challenge leaderboards). */
  display?: string;
  /**
   * The page's own goal. When given (null = no goal set), the bar is progress
   * towards it, as on the page itself; when left out, the bar compares the
   * entry with the leader (challenge standings).
   */
  goalCents?: Cents | null;
  /** Trailing muted annotation, e.g. a team's member count. */
  meta?: string;
  href: string;
}

/**
 * Ranked list per the prototype, plus the face of each entry: rank column
 * (top three in red), avatar, progress bar relative to the leader (leader
 * in red, the rest ink), mono amounts. Used with the segmented control
 * below and standalone on team pages for the internal member ranking.
 */
/** The bar under an entry: progress to its own goal, or its share of the leader's value. */
export function entryBar(entry: LeaderboardEntry, top: number, first: boolean): { width: string; tone: string } {
  if (entry.goalCents !== undefined) {
    const pct = entry.goalCents && entry.goalCents > 0 ? Math.min(100, Math.round((entry.raisedCents / entry.goalCents) * 100)) : 0;
    return { width: `${Math.max(2, pct)}%`, tone: "bg-sea" };
  }
  return { width: `${Math.max(2, Math.round((entry.raisedCents / top) * 100))}%`, tone: first ? "bg-red" : "bg-ink" };
}

export function LeaderboardList({
  locale,
  entries,
  emptyLabel,
  numbered = true,
}: {
  locale: Locale;
  entries: LeaderboardEntry[];
  emptyLabel?: string;
  /** The rank column; off on the fundraisers board, where a place number says nothing (owner decision 2026-11-25). */
  numbered?: boolean;
}) {
  const top = entries[0]?.raisedCents || 1;
  if (entries.length === 0 && emptyLabel) {
    return <p className="mt-4 text-[14.5px] text-black/60">{emptyLabel}</p>;
  }
  return (
    <ol className="mt-1.5">
      {entries.map((entry, index) => {
        const rank = index + 1;
        return (
          <li key={entry.slug} className="border-b-[0.5px] border-line last:border-b-0">
            <Link
              href={entry.href}
              className="flex items-center gap-3 py-3 transition-colors hover:text-sea"
            >
              {numbered ? (
                <span
                  className={`w-[22px] shrink-0 text-right font-mono text-[14px] ${
                    rank <= 3 ? "font-medium text-red" : "text-black/40"
                  }`}
                >
                  {rank}
                </span>
              ) : null}
              <Avatar src={entry.photoUrl ?? null} name={entry.title} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">
                  {entry.title}
                  {entry.meta ? (
                    <span className="font-mono font-normal opacity-50"> · {entry.meta}</span>
                  ) : null}
                </span>
                <span className="mt-1.5 block h-[5px] overflow-hidden rounded-[3px] bg-line-soft">
                  <span
                    className={`block h-full rounded-[3px] ${entryBar(entry, top, rank === 1).tone}`}
                    style={{ width: entryBar(entry, top, rank === 1).width }}
                  />
                </span>
              </span>
              <span className="shrink-0 font-mono text-[14.5px] font-medium tabular-nums">
                {entry.display ??
                  formatCents(entry.raisedCents, locale, { trimWholeCents: true })}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/** The individuals/teams switcher (aria-pressed segmented control). */
export function Leaderboard({
  locale,
  individuals,
  teams,
}: {
  locale: Locale;
  individuals: LeaderboardEntry[];
  teams: LeaderboardEntry[];
}) {
  const t = useTranslations("leaderboard");
  const [view, setView] = useState<"individuals" | "teams">("individuals");

  return (
    <div>
      <div
        role="group"
        aria-label={t("title")}
        className="mt-4 grid grid-cols-2 overflow-hidden rounded-lg bg-mist"
      >
        <button
          type="button"
          aria-pressed={view === "individuals"}
          onClick={() => setView("individuals")}
          className="px-3 py-2.5 text-[14px] font-semibold transition-colors aria-pressed:bg-ink aria-pressed:text-paper"
        >
          {t("individuals")}
        </button>
        <button
          type="button"
          aria-pressed={view === "teams"}
          onClick={() => setView("teams")}
          className="px-3 py-2.5 text-[14px] font-semibold transition-colors aria-pressed:bg-ink aria-pressed:text-paper"
        >
          {t("teams")}
        </button>
      </div>
      <p className="mt-2 text-[13.5px] text-black/55">
        {view === "individuals" ? t("individualsHint") : t("teamsHint")}
      </p>
      {view === "individuals" ? (
        <LeaderboardList locale={locale} entries={individuals} emptyLabel={t("emptyIndividuals")} />
      ) : (
        <LeaderboardList locale={locale} entries={teams} emptyLabel={t("emptyTeams")} />
      )}
    </div>
  );
}
