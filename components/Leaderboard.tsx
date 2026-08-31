"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { formatCents, type Cents } from "@/lib/money";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export interface LeaderboardEntry {
  slug: string;
  title: string;
  raisedCents: Cents;
  /** Trailing muted annotation, e.g. a team's member count. */
  meta?: string;
  href: string;
}

/**
 * Ranked list per the prototype: rank column (top three in red), progress
 * bar relative to the leader (leader's bar in red, the rest sea), mono
 * amounts. Used with the segmented control below and standalone on team
 * pages for the internal member ranking.
 */
export function LeaderboardList({
  locale,
  entries,
}: {
  locale: Locale;
  entries: LeaderboardEntry[];
}) {
  const top = entries[0]?.raisedCents || 1;
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
                className={`w-[26px] shrink-0 text-right font-mono text-[13px] ${
                  rank <= 3 ? "font-medium text-red" : "text-ink/40"
                }`}
              >
                {rank}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold">
                  {entry.title}
                  {entry.meta ? (
                    <span className="font-mono font-normal opacity-50"> · {entry.meta}</span>
                  ) : null}
                </span>
                <span className="mt-1.5 block h-[5px] overflow-hidden rounded-[3px] bg-line-soft">
                  <span
                    className={`block h-full rounded-[3px] ${rank === 1 ? "bg-red" : "bg-sea"}`}
                    style={{
                      width: `${Math.max(2, Math.round((entry.raisedCents / top) * 100))}%`,
                    }}
                  />
                </span>
              </span>
              <span className="shrink-0 font-mono text-[13.5px] font-medium tabular-nums">
                {formatCents(entry.raisedCents, locale, { trimWholeCents: true })}
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
      {view === "individuals" ? (
        <LeaderboardList locale={locale} entries={individuals} />
      ) : (
        <LeaderboardList locale={locale} entries={teams} />
      )}
    </div>
  );
}
