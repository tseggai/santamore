"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { formatMetricValue } from "@/lib/metrics";
import type { Locale } from "@/i18n/routing";

export interface PerkProgressRow {
  challenge_id: string;
  slug: string;
  title: string;
  partner_name: string;
  reward_label: string;
  partner_url: string | null;
  sport_types: string[];
  min_distance_m: number;
  max_pace_s_per_km: number | null;
  required_days: number;
  window_days: number | null;
  window_from: string;
  today: string;
  qualifying_days: number;
  today_qualified: boolean;
  best_today_m: number;
  awarded_in_window: boolean;
}

function pace(secondsPerKm: number): string {
  const m = Math.floor(secondsPerKm / 60);
  const s = secondsPerKm % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Where the runner stands on each active partner challenge today, from
 * my_perk_progress() — the same predicate the awarding engine uses, so
 * "2 of 3 days" here is exactly what the engine will count.
 */
export function PerkProgressList({ rows, limit }: { rows: PerkProgressRow[]; limit?: number }) {
  const t = useTranslations("strava");
  const locale = useLocale() as Locale;
  const km = (m: number) => formatMetricValue(m, "distance_m", locale);
  const [open, setOpen] = useState(false);

  if (rows.length === 0) {
    return <p className="mt-2 text-[14.5px] text-black/60">{t("progressEmpty")}</p>;
  }
  const visible = limit && !open ? rows.slice(0, limit) : rows;

  return (
    <>
    <ul className="mt-2 space-y-2">
      {visible.map((row) => {
        const needed = row.required_days;
        const done = Math.min(row.qualifying_days, needed);
        const shortfall = Math.max(row.min_distance_m - row.best_today_m, 0);
        const window =
          row.window_days !== null
            ? t("progressWindowRolling", { days: row.window_days })
            : needed > 1
              ? t("progressWindowPeriod")
              : t("progressWindowToday");
        const state = row.awarded_in_window
          ? { text: t("progressEarned"), tone: "text-sea" }
          : row.today_qualified
            ? { text: t("progressTodayDone"), tone: "text-sea" }
            : row.best_today_m > 0
              ? { text: t("progressNeedMore", { km: km(shortfall) }), tone: "text-red-dark" }
              : { text: t("progressNeedRun", { km: km(row.min_distance_m) }), tone: "text-black/70" };
        return (
          <li key={row.challenge_id} className="rounded-lg bg-paper px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="min-w-0 text-[15px] font-semibold">
                {row.reward_label} · {row.partner_name}
              </span>
              <span className="font-mono text-[13.5px] tabular-nums text-black/60">
                {t("progressDays", { done, needed })} · {window}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={needed}
              aria-valuenow={done}
              aria-label={row.title}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-mist-2"
            >
              <div
                className={`h-full rounded-full transition-[width] motion-reduce:transition-none ${
                  row.awarded_in_window ? "bg-sea" : "bg-red"
                }`}
                style={{ width: `${Math.round((done / needed) * 100)}%` }}
              />
            </div>
            <p className={`mt-2 text-[14px] font-semibold ${state.tone}`}>{state.text}</p>
            <p className="mt-0.5 text-[13px] text-black/55">
              {row.title} · {km(row.min_distance_m)}
              {row.max_pace_s_per_km ? ` · ${t("progressPace", { pace: pace(row.max_pace_s_per_km) })}` : ""}
              {" · "}
              {row.sport_types.join(", ")}
            </p>
          </li>
        );
      })}
    </ul>
    {limit && rows.length > limit ? (
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="mt-2 text-[14px] font-semibold text-sea underline underline-offset-2"
      >
        {open ? t("showLess") : t("showAll", { count: rows.length })}
      </button>
    ) : null}
    </>
  );
}
