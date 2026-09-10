"use client";

import { useLocale, useTranslations } from "next-intl";

import { formatMetricValue } from "@/lib/metrics";
import type { Locale } from "@/i18n/routing";

export interface PerkChallengeFields {
  sport_types: string[];
  min_distance_m: number;
  max_moving_time_s: number | null;
  min_elevation_m: number;
  per_user_daily_cap: number;
  daily_cap: number | null;
  valid_days: number;
}

/**
 * The rule in one sentence, built from the fields so the admin form, the
 * public catalogue and the award page never disagree about what counts.
 */
export function PerkRule({ challenge }: { challenge: PerkChallengeFields }) {
  const t = useTranslations("perks");
  const locale = useLocale() as Locale;
  const sports = challenge.sport_types
    .map((sport) => t.has(`sport.${sport}`) ? t(`sport.${sport}`) : sport)
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
  if (challenge.min_elevation_m > 0) {
    parts.push(t("ruleElevation", { elevation: challenge.min_elevation_m }));
  }
  return (
    <span>
      {parts.join(", ")}
      {". "}
      {t("ruleCaps", { perUser: challenge.per_user_daily_cap })}
      {challenge.daily_cap ? ` ${t("ruleDailyCap", { cap: challenge.daily_cap })}` : ""}
      {` ${t("ruleValid", { days: challenge.valid_days })}`}
    </span>
  );
}
