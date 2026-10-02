"use client";

import { useState } from "react";

import { SponsorGrid, type PublicSponsor } from "@/components/partners/SponsorGrid";

/**
 * The sponsors of one year at a time: the current year first ("Current"),
 * every earlier year with sponsors behind it in the menu.
 */
export function SponsorsByYear({ byYear, currentYear, labels }: {
  byYear: Record<string, PublicSponsor[]>;
  currentYear: number;
  labels: { year: string; current: string; empty: string; inKind: string };
}) {
  const years = Object.keys(byYear).map(Number).filter((y) => y !== currentYear).sort((a, b) => b - a);
  const [year, setYear] = useState(currentYear);
  const sponsors = byYear[String(year)] ?? [];
  return (
    <div>
      <label className="flex items-center gap-2 text-[14px] text-black/60">
        <span>{labels.year}</span>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-lg bg-mist px-3 py-1.5 text-[14.5px] font-semibold text-black">
          <option value={currentYear}>{labels.current} · {currentYear}</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </label>
      {sponsors.length === 0 ? (
        <p className="mt-4 text-[15px] text-black/60">{labels.empty}</p>
      ) : (
        <div className="mt-5">
          <SponsorGrid sponsors={sponsors} inKindLabel={labels.inKind} size="lg" showAmounts={false} />
        </div>
      )}
    </div>
  );
}
