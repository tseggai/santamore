import { getTranslations, setRequestLocale } from "next-intl/server";

import { YearsManager, type YearCause, type YearRow, type YearSponsorship } from "@/components/admin/YearsManager";
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
  venues: string[];
  is_public: boolean;
  events: { name: string; date: string | null; venue: string | null }[];
  beneficiaries_list: { label: string; amount_cents: number | null }[];
  donors_list: { name: string; amount_cents: number | null }[];
  volunteers_list: string[] | null;
  campaign_id: string | null;
}

interface CampaignRow {
  id: string;
  title: string;
  starts_at: string | null;
  created_at: string;
  is_public: boolean;
}

interface SponsorRow {
  id: string;
  name: string;
  tier: string | null;
  amount_cents: number | null;
  is_in_kind: boolean;
  year: number | null;
  campaign_title: string | null;
  event_name: string | null;
}

const yearOf = (iso: string | null | undefined) => (iso ? Number(iso.slice(0, 4)) : null);

/**
 * One row per year since the founding year: the figures the database
 * derives, the year's causes with their money, its sponsorships, and
 * whether staff have written the year's story yet. A row opens the report.
 */
export default async function YearsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const [{ data: stats }, { data: reports }, { data: campaigns }, { data: totals }, { data: sponsors }] = await Promise.all([
    supabase.from("v_public_year_stats").select("*").order("year", { ascending: false }),
    supabase.from("year_reports").select("*"),
    supabase.from("campaigns").select("id, title, starts_at, created_at, is_public").order("starts_at", { ascending: false }).limit(500),
    // One money view (migration 0054): raised, handed over and hand-over
    // count per cause, the same figures the public pages show.
    supabase.from("v_campaign_totals").select("id, raised_cents, disbursed_cents, hand_overs").limit(2000),
    supabase.from("v_public_sponsors").select("id, name, tier, amount_cents, is_in_kind, year, campaign_title, event_name").limit(2_000),
  ]);

  const totalsById = new Map(((totals ?? []) as { id: string; raised_cents: number; disbursed_cents: number; hand_overs: number }[]).map((row) => [row.id, row]));
  const causesByYear = new Map<number, YearCause[]>();
  for (const c of (campaigns ?? []) as CampaignRow[]) {
    const year = yearOf(c.starts_at) ?? yearOf(c.created_at);
    if (year === null) continue;
    const list = causesByYear.get(year) ?? [];
    list.push({
      id: c.id,
      title: c.title,
      isPublic: c.is_public,
      raisedCents: totalsById.get(c.id)?.raised_cents ?? 0,
      disbursedCents: totalsById.get(c.id)?.disbursed_cents ?? 0,
      handOvers: totalsById.get(c.id)?.hand_overs ?? 0,
    });
    causesByYear.set(year, list);
  }
  const sponsorsByYear = new Map<number, YearSponsorship[]>();
  for (const s of (sponsors ?? []) as SponsorRow[]) {
    if (s.year === null) continue;
    const list = sponsorsByYear.get(s.year) ?? [];
    list.push({ id: s.id, name: s.name, tier: s.tier, amountCents: s.amount_cents, inKind: s.is_in_kind, target: s.event_name ?? s.campaign_title });
    sponsorsByYear.set(s.year, list);
  }

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
      causes: causesByYear.get(row.year) ?? [],
      sponsorships: (sponsorsByYear.get(row.year) ?? []).sort((a, b) => (b.amountCents ?? 0) - (a.amountCents ?? 0) || a.name.localeCompare(b.name)),
      report: report
        ? {
            headline: report.headline,
            summaryMd: report.summary_md,
            planMd: report.plan_md,
            venues: report.venues ?? [],
            isPublic: report.is_public,
            events: report.events ?? [],
            beneficiariesList: report.beneficiaries_list ?? [],
            donorsList: report.donors_list ?? [],
            volunteersList: report.volunteers_list ?? [],
            campaignId: report.campaign_id,
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
