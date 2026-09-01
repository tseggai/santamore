import type { Locale } from "@/i18n/routing";

// Challenge metrics (owner decision): a challenge ranks by ONE configurable
// metric. Raw activity facts are integers (metres, seconds, count); display
// formatting is locale-aware and lives here so leaderboards and dashboards
// agree.

export type ChallengeMetric =
  | "distance_m"
  | "moving_time_s"
  | "activity_count"
  | "elevation_m";

export interface ActivityTotals {
  distance_m: number;
  moving_time_s: number;
  activity_count: number;
  elevation_m: number;
}

export function metricValue(totals: ActivityTotals, metric: ChallengeMetric): number {
  return totals[metric];
}

function decimal(locale: Locale): string {
  return locale === "en" ? "." : ",";
}

/** "12,4 km" · "3 h 24 min" · "18×" · "1240 m" */
export function formatMetricValue(
  value: number,
  metric: ChallengeMetric,
  locale: Locale,
): string {
  switch (metric) {
    case "distance_m": {
      const tenths = Math.round(value / 100); // 12345 m → 123 tenths of km
      const whole = Math.floor(tenths / 10);
      const rest = tenths % 10;
      return rest === 0
        ? `${whole} km`
        : `${whole}${decimal(locale)}${rest} km`;
    }
    case "moving_time_s": {
      const hours = Math.floor(value / 3600);
      const minutes = Math.round((value % 3600) / 60);
      return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
    }
    case "activity_count":
      return `${value}×`;
    case "elevation_m":
      return `${value} m`;
  }
}
