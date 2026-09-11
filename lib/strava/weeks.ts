/**
 * Weekly buckets (Monday-based) for the trend chart, ending with the week
 * that contains `today` (a YYYY-MM-DD in the athlete's calendar). Pure
 * string/UTC arithmetic so it never depends on the server's time zone.
 */
export interface WeekBucket {
  /** Monday of the week, YYYY-MM-DD. */
  weekStart: string;
  distance_m: number;
  count: number;
  current: boolean;
}

const DAY_MS = 86_400_000;

function toUtc(day: string): number {
  return Date.parse(`${day}T00:00:00Z`);
}

function toDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function mondayOf(day: string): string {
  const ms = toUtc(day);
  const weekday = (new Date(ms).getUTCDay() + 6) % 7; // Monday = 0
  return toDay(ms - weekday * DAY_MS);
}

export function weeklyTotals(
  activities: { started_on: string; distance_m: number }[],
  today: string,
  weeks = 8,
): WeekBucket[] {
  const thisMonday = mondayOf(today);
  const buckets: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const weekStart = toDay(toUtc(thisMonday) - i * 7 * DAY_MS);
    buckets.push({ weekStart, distance_m: 0, count: 0, current: i === 0 });
  }
  const index = new Map(buckets.map((bucket, i) => [bucket.weekStart, i]));
  for (const activity of activities) {
    const i = index.get(mondayOf(activity.started_on));
    if (i === undefined) continue;
    buckets[i].distance_m += activity.distance_m;
    buckets[i].count += 1;
  }
  return buckets;
}
