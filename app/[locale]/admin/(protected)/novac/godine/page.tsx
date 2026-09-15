import { getTranslations, setRequestLocale } from "next-intl/server";

import { YearsManager, type YearRow } from "@/components/admin/YearsManager";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface StatsRow {
  year: number;
  received_cents: number;
  disbursed_cents: number;
  donor_count: number;
  runner_count: number;
  event_count: number;
  supporter_count: number;
}

interface ReportRow {
  year: number;
  headline: string | null;
  summary_md: string | null;
  plan_md: string | null;
  volunteers: number | null;
  beneficiaries: number | null;
  venues: string[];
  is_public: boolean;
}

/**
 * One row per year since the founding year: the figures the database
 * derives, and whether staff have written the year's story and plan yet.
 * A row opens the report in the slide-over.
 */
export default async function YearsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const [{ data: stats }, { data: reports }] = await Promise.all([
    supabase.from("v_public_year_stats").select("*").order("year", { ascending: false }),
    supabase.from("year_reports").select("*"),
  ]);
  const reportByYear = new Map(((reports ?? []) as ReportRow[]).map((row) => [row.year, row]));
  const rows: YearRow[] = ((stats ?? []) as StatsRow[]).map((row) => {
    const report = reportByYear.get(row.year);
    return {
      year: row.year,
      receivedCents: row.received_cents,
      disbursedCents: row.disbursed_cents,
      donors: row.donor_count,
      runners: row.runner_count,
      events: row.event_count,
      supporters: row.supporter_count,
      report: report
        ? {
            headline: report.headline,
            summaryMd: report.summary_md,
            planMd: report.plan_md,
            volunteers: report.volunteers,
            beneficiaries: report.beneficiaries,
            venues: report.venues ?? [],
            isPublic: report.is_public,
          }
        : null,
    };
  });

  return (
    <div className="pb-8">
      <p className="text-[14px] leading-relaxed text-black/60">{t("yearsHint")}</p>
      <div className="mt-4">
        <YearsManager rows={rows} />
      </div>
    </div>
  );
}
