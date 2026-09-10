"use client";

import { useLocale, useTranslations } from "next-intl";

import { formatMetricValue } from "@/lib/metrics";
import type { Locale } from "@/i18n/routing";

export interface PerkChallengeFields {
  sport_types: string[];
  min_distance_m: number;
  max_moving_time_s: number | null;
  min_elevation_m: number;
  max_pace_s_per_km?: number | null;
  required_days?: number;
  window_days?: number | null;
  per_user_daily_cap: number;
  daily_cap: number | null;
  valid_days: number;
}

/** "5:00" for 300 s/km. */
export function formatPace(secondsPerKm: number): string {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = secondsPerKm % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * The rule in one sentence, built from the fields so the admin form, the
 * public catalogue and the award page never disagree about what counts.
 */
export function PerkRule({ challenge }: { challenge: PerkChallengeFields }) {
  const t = useTranslations("perks");
  const locale = useLocale() as Locale;
  const sports = challenge.sport_types
    .map((sport) => (t.has(`sport.${sport}`) ? t(`sport.${sport}`) : sport))
    .join(" / ");
  const parts: string[] = [
    t("ruleDistance", {
      sport: sports,
      distance: formatMetricValue(challenge.min_distance_m, "distance_m", locale),
    }),
  ];
  if (challenge.max_moving_time_s) {
    parts.push(
      t("ruleTime", {
        time: formatMetricValue(challenge.max_moving_time_s, "moving_time_s", locale),
      }),
    );
  }
  if (challenge.max_pace_s_per_km) {
    parts.push(t("rulePace", { pace: formatPace(challenge.max_pace_s_per_km) }));
  }
  if (challenge.min_elevation_m > 0) {
    parts.push(t("ruleElevation", { elevation: challenge.min_elevation_m }));
  }
  const days = challenge.required_days ?? 1;
  const dayRule =
    days > 1
      ? challenge.window_days
        ? t("ruleDaysWindow", { days, window: challenge.window_days })
        : t("ruleDaysPeriod", { days })
      : null;
  return (
    <span>
      {parts.join(", ")}
      {dayRule ? ` — ${dayRule}` : ""}
      {". "}
      {t("ruleCaps", { perUser: challenge.per_user_daily_cap })}
      {challenge.daily_cap ? ` ${t("ruleDailyCap", { cap: challenge.daily_cap })}` : ""}
      {` ${t("ruleValid", { days: challenge.valid_days })}`}
    </span>
  );
}
