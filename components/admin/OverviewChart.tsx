import { formatCents } from "@/lib/money";
import { htmlLang, type Locale } from "@/i18n/routing";

export interface DayPoint {
  /** ISO date (YYYY-MM-DD) */
  date: string;
  cents: number;
}

/**
 * Approved money-in per day, last 30 days. Single series → one brand hue
 * (red, validated against the light surface), no legend; identity comes
 * from the heading. Hover = native per-bar tooltip; the <details> table is
 * the accessible/data view.
 */
export function OverviewChart({
  days,
  locale,
  labels,
}: {
  days: DayPoint[];
  locale: Locale;
  labels: { empty: string; peak: string; table: string; dateCol: string; amountCol: string };
}) {
  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });
  const max = Math.max(...days.map((d) => d.cents), 0);
  const dayFormat = new Intl.DateTimeFormat(htmlLang(locale), {
    day: "numeric",
    month: "short",
  });
  const label = (iso: string) => dayFormat.format(new Date(`${iso}T12:00:00Z`));
  const peak = days.reduce((best, d) => (d.cents > best.cents ? d : best), days[0]);

  if (max === 0) {
    return <p className="mt-3 text-[13.5px] text-ink/55">{labels.empty}</p>;
  }

  return (
    <div className="mt-4">
      {/* bars: thin marks, 2px gaps, rounded data-ends, recessive baseline */}
      <div
        role="img"
        aria-label={`${labels.peak}: ${money(peak.cents)} · ${label(peak.date)}`}
        className="flex h-28 items-end gap-[2px] border-b border-line-soft"
      >
        {days.map((day) => (
          <div
            key={day.date}
            title={`${label(day.date)} · ${money(day.cents)}`}
            className="group flex h-full flex-1 items-end"
          >
            <div
              className="w-full rounded-t-[3px] bg-red transition-opacity group-hover:opacity-75"
              style={{
                height: day.cents === 0 ? "2px" : `${Math.max(4, (day.cents / max) * 100)}%`,
                opacity: day.cents === 0 ? 0.15 : 1,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10.5px] text-ink/45">
        <span>{label(days[0].date)}</span>
        <span>{label(days[days.length - 1].date)}</span>
      </div>
      <p className="mt-2 text-[12.5px] text-ink/60">
        {labels.peak}:{" "}
        <span className="font-mono tabular-nums text-ink">{money(peak.cents)}</span> ·{" "}
        {label(peak.date)}
      </p>

      <details className="mt-2">
        <summary className="cursor-pointer text-[12.5px] font-semibold text-sea hover:underline">
          {labels.table}
        </summary>
        <table className="mt-2 w-full max-w-xs border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-[0.12em] text-sea">
              <th className="py-1 pr-3">{labels.dateCol}</th>
              <th className="py-1 text-right">{labels.amountCol}</th>
            </tr>
          </thead>
          <tbody>
            {days
              .filter((day) => day.cents > 0)
              .map((day) => (
                <tr key={day.date} className="border-b border-line-soft">
                  <td className="py-1 pr-3 font-mono tabular-nums">{label(day.date)}</td>
                  <td className="py-1 text-right font-mono tabular-nums">
                    {money(day.cents)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
