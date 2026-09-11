import type { WeekBucket } from "@/lib/strava/weeks";

/**
 * Kilometres per week, one series, eight bars. Thin marks with rounded
 * tops on a recessive baseline; the current week carries the full hue and
 * its value as a direct label, earlier weeks a tint of the same hue. Each
 * bar has a native tooltip and the same numbers sit in a visually hidden
 * table for screen readers.
 */
export function WeeklyKmChart({
  weeks,
  weekLabel,
  km,
  caption,
}: {
  weeks: WeekBucket[];
  /** Short label for a week start, e.g. "7 Sep". */
  weekLabel: (weekStart: string) => string;
  /** Formats metres as a distance string. */
  km: (m: number) => string;
  caption: string;
}) {
  const width = 320;
  const height = 110;
  const top = 18;
  const bottom = 92;
  const max = Math.max(1, ...weeks.map((w) => w.distance_m));
  const slot = width / weeks.length;
  const bar = Math.min(22, slot * 0.5);

  return (
    <figure>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={caption}
        className="block h-auto w-full max-w-[520px]"
      >
        <line x1="0" x2={width} y1={bottom} y2={bottom} stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
        {weeks.map((week, i) => {
          const x = i * slot + (slot - bar) / 2;
          const h = week.distance_m > 0 ? Math.max(3, ((bottom - top) * week.distance_m) / max) : 0;
          const y = bottom - h;
          const r = Math.min(4, h / 2);
          const label = `${weekLabel(week.weekStart)} · ${km(week.distance_m)} · ${week.count}`;
          return (
            <g key={week.weekStart}>
              <title>{label}</title>
              {h > 0 ? (
                <path
                  d={`M${x},${bottom} V${y + r} a${r},${r} 0 0 1 ${r},-${r} h${bar - 2 * r} a${r},${r} 0 0 1 ${r},${r} V${bottom} Z`}
                  fill="var(--color-sea)"
                  fillOpacity={week.current ? 1 : 0.35}
                />
              ) : (
                <rect x={x} y={bottom - 2} width={bar} height="2" fill="currentColor" fillOpacity="0.15" />
              )}
              {week.current && week.distance_m > 0 ? (
                <text
                  x={x + bar / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  fill="currentColor"
                >
                  {km(week.distance_m)}
                </text>
              ) : null}
              <text
                x={x + bar / 2}
                y={height - 4}
                textAnchor="middle"
                fontSize="8.5"
                fill="currentColor"
                fillOpacity={week.current ? 0.9 : 0.5}
              >
                {weekLabel(week.weekStart)}
              </text>
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {weeks.map((week) => (
            <tr key={week.weekStart}>
              <th scope="row">{weekLabel(week.weekStart)}</th>
              <td>{km(week.distance_m)}</td>
              <td>{week.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
