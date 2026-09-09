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
export function LeaderboardList({
  locale,
  entries,
  emptyLabel,
}: {
  locale: Locale;
  entries: LeaderboardEntry[];
  emptyLabel?: string;
}) {
  const top = entries[0]?.raisedCents || 1;
  if (entries.length === 0 && emptyLabel) {
    return <p className="mt-4 text-[13.5px] text-ink/60">{emptyLabel}</p>;
  }
  return (
    <ol className="mt-1.5">
      {entries.map((entry, index) => {
        const rank = index + 1;
        return (
          <li key={entry.slug} className="border-b border-line-soft last:border-b-0">
            <Link
              href={entry.href}
              className="flex items-center gap-3 py-3 transition-colors hover:text-sea"
            >
              <span
                className={`w-[22px] shrink-0 text-right font-mono text-[13px] ${
                  rank <= 3 ? "font-medium text-red" : "text-ink/40"
                }`}
              >
                {rank}
              </span>
              <Avatar src={entry.photoUrl ?? null} name={entry.title} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">
                  {entry.title}
                  {entry.meta ? (
                    <span className="font-mono font-normal opacity-50"> · {entry.meta}</span>
                  ) : null}
                </span>
                <span className="mt-1.5 block h-[5px] overflow-hidden rounded-[3px] bg-line-soft">
                  <span
                    className={`block h-full rounded-[3px] ${rank === 1 ? "bg-red" : "bg-ink"}`}
                    style={{
                      width: `${Math.max(2, Math.round((entry.raisedCents / top) * 100))}%`,
                    }}
                  />
                </span>
              </span>
              <span className="shrink-0 font-mono text-[13.5px] font-medium tabular-nums">
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
        className="mt-4 grid grid-cols-2 overflow-hidden rounded-[11px] border-[1.5px] border-ink"
      >
        <button
          type="button"
          aria-pressed={view === "individuals"}
          onClick={() => setView("individuals")}
          className="px-3 py-2.5 text-[13px] font-semibold transition-colors aria-pressed:bg-ink aria-pressed:text-paper"
        >
          {t("individuals")}
        </button>
        <button
          type="button"
          aria-pressed={view === "teams"}
          onClick={() => setView("teams")}
          className="px-3 py-2.5 text-[13px] font-semibold transition-colors aria-pressed:bg-ink aria-pressed:text-paper"
        >
          {t("teams")}
        </button>
      </div>
      <p className="mt-2 text-[12.5px] text-ink/55">
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
