import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { LedgerTabs, type LedgerRow } from "@/components/ledger/LedgerTabs";
import { YearTabs } from "@/components/ledger/YearTabs";
import { DonorWall } from "@/components/ledger/DonorWall";
import { YearSections, type YearSection } from "@/components/ledger/YearSections";
import { SponsorGrid } from "@/components/partners/SponsorGrid";
import { groupDonors, type GiftDetail, type PublicSponsor } from "@/lib/sponsors";
import { formatShortDate } from "@/lib/dates";
import { formatCents, formatSignedCents } from "@/lib/money";
import { disbursementDocUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

const FOUNDING_YEAR = 2025;

export const dynamic = "force-dynamic";

const RAIL_KEYS: Record<string, string> = {
  card: "railCard",
  sepa: "railSepa",
  cash: "railCash",
  other: "railMixed",
};

interface InRow {
  id: string;
  entry_date: string;
  amount_cents: number;
  display_name: string | null;
  fundraiser_title: string | null;
  campaign_title: string | null;
  chapter_slug: string | null;
  rail: string;
}
interface OutRow {
  id: string;
  entry_date: string;
  amount_cents: number;
  beneficiary_label: string;
  category: string | null;
  chapter_slug: string | null;
  documentation_paths: string[];
}
interface AdjRow {
  id: string;
  entry_date: string;
  amount_cents: number;
  reason: string;
  references_donation_id: string | null;
  references_disbursement_id: string | null;
}

interface YearStats {
  year: number;
  received_cents: number;
  disbursed_cents: number;
  operations_cents: number;
  donor_count: number;
  runner_count: number;
  page_count: number;
  team_count: number;
  event_count: number;
  supporter_count: number;
  beneficiary_count: number;
}
interface YearReport {
  year: number;
  headline: string | null;
  summary_md: string | null;
  plan_md: string | null;
  volunteers: number | null;
  beneficiaries: number | null;
  venues: string[];
  events?: { name: string; date: string | null; venue: string | null }[];
  supporters?: string[];
  beneficiaries_list?: { label: string; amount_cents: number | null }[];
  donors_list?: { name: string; amount_cents: number | null }[];
  volunteers_list?: string[];
}
interface PageRow {
  slug: string;
  title: string;
  raised_cents: number;
  campaign_slug: string | null;
}
interface TeamRow {
  slug: string;
  name: string;
  raised_cents: number;
  member_count: number;
  campaign_slug: string | null;
}
interface CampaignRow {
  slug: string;
  title: string;
  starts_at: string | null;
}
interface EventRow {
  slug: string;
  name: string;
  starts_at: string | null;
  venue: string | null;
  kind: string;
}
type SupporterRow = PublicSponsor;
interface DealRow {
  supporter_id: string | null;
  tier: string | null;
  is_in_kind: boolean;
  amount_cents: number | null;
  campaign_title: string | null;
  event_name: string | null;
  starts_at: string | null;
}

/**
 * The ledger, whole or for one calendar year. Year rows are read straight
 * from the same public views with an entry_date window, so a year's list
 * always sums to that year's headline figures.
 */
async function fetchLedger(year: number | null) {
  const supabase = await createClient();
  const from = year ? `${year}-01-01` : null;
  const to = year ? `${year + 1}-01-01` : null;
  const windowed = <T extends { gte: (c: string, v: string) => T; lt: (c: string, v: string) => T }>(q: T) =>
    from && to ? q.gte("entry_date", from).lt("entry_date", to) : q;
  const [summary, ops, inRows, outRows, adjustments, yearStats, yearReports, events, supporters, deals, campaignsOfYear] = await Promise.all([
    supabase.from("v_public_ledger_summary").select("*").single(),
    supabase.from("v_public_ops_total").select("*").single(),
    windowed(supabase.from("v_public_ledger_in").select("*")).order("entry_date", { ascending: false }).limit(year ? 1000 : 150),
    windowed(supabase.from("v_public_ledger_out").select("*")).order("entry_date", { ascending: false }).limit(year ? 1000 : 150),
    windowed(supabase.from("v_public_ledger_adjustments").select("*")).order("entry_date", { ascending: false }).limit(year ? 1000 : 100),
    supabase.from("v_public_year_stats").select("*").order("year"),
    supabase.from("v_public_year_reports").select("*"),
    year
      ? supabase.from("v_public_events").select("slug, name, starts_at, venue, kind").gte("starts_at", from).lt("starts_at", to).order("starts_at")
      : Promise.resolve({ data: [] as EventRow[] }),
    year
      ? supabase.from("v_public_year_supporters").select("id, name, slug, kind, logo_path, website, cash_cents, in_kind, tiers, offers").eq("year", year)
      : Promise.resolve({ data: [] as SupporterRow[] }),
    year
      ? supabase.from("v_public_sponsors").select("supporter_id, tier, is_in_kind, amount_cents, campaign_title, event_name, starts_at").eq("year", year)
      : Promise.resolve({ data: [] as DealRow[] }),
    year
      ? supabase.from("v_public_campaigns").select("slug, title, starts_at").gte("starts_at", from).lt("starts_at", to).order("starts_at")
      : Promise.resolve({ data: [] as CampaignRow[] }),
  ]);
  // The year's causes, and the pages and teams raising for them.
  const causes = (campaignsOfYear.data ?? []) as CampaignRow[];
  const causeSlugs = causes.map((c) => c.slug);
  const [pages, teams] = causeSlugs.length > 0
    ? await Promise.all([
        supabase.from("v_leaderboard").select("slug, title, raised_cents, campaign_slug").in("campaign_slug", causeSlugs).order("raised_cents", { ascending: false }).limit(200),
        supabase.from("v_leaderboard_teams").select("slug, name, raised_cents, member_count, campaign_slug").in("campaign_slug", causeSlugs).order("raised_cents", { ascending: false }).limit(200),
      ])
    : [{ data: [] as PageRow[] }, { data: [] as TeamRow[] }];
  // Each supporter's gifts of the year, for the detail behind a tile or chip.
  const giftsOf = new Map<string, GiftDetail[]>();
  for (const d of (deals.data ?? []) as DealRow[]) {
    if (!d.supporter_id) continue;
    const list = giftsOf.get(d.supporter_id) ?? [];
    list.push({ amount_cents: d.is_in_kind ? null : d.amount_cents, in_kind: d.is_in_kind, tier: d.tier, target: d.event_name ?? d.campaign_title, date: d.starts_at });
    giftsOf.set(d.supporter_id, list);
  }
  return {
    summary: summary.data as {
      received_cents: number;
      disbursed_cents: number;
      approved_pending_cents: number;
      unallocated_cents: number;
    } | null,
    opsCents: (ops.data as { operations_cents: number } | null)?.operations_cents ?? 0,
    inRows: (inRows.data ?? []) as InRow[],
    outRows: (outRows.data ?? []) as OutRow[],
    adjustments: (adjustments.data ?? []) as AdjRow[],
    yearStats: (yearStats.data ?? []) as YearStats[],
    yearReports: (yearReports.data ?? []) as YearReport[],
    events: (events.data ?? []) as EventRow[],
    supporters: ((supporters.data ?? []) as SupporterRow[]).map((su) => ({ ...su, gifts: giftsOf.get(su.id) ?? [] })),
    causes,
    pages: (pages.data ?? []) as PageRow[],
    teams: (teams.data ?? []) as TeamRow[],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ledger" });
  return { title: `${t("title")} — Santamore` };
}

export default async function LedgerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ godina?: string }>;
}) {
  const [{ locale }, { godina }] = await Promise.all([params, searchParams]);
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [t, tYears] = await Promise.all([getTranslations("ledger"), getTranslations("years")]);

  // The year in view: this year by default, "sve" for everything since the
  // founding year, or any year the stats view knows.
  const thisYear = new Date().getFullYear();
  const year = godina === "sve" ? null : /^\d{4}$/.test(godina ?? "") ? Number(godina) : thisYear;

  const { summary, opsCents, inRows, outRows, adjustments, yearStats, yearReports, events, supporters: yearSupporters, pages, teams } = await fetchLedger(year);
  // Organisations are sponsors, shown with their logos; individuals are donors, listed by name.
  const supporters = yearSupporters.filter((su) => su.kind === "sponsor");
  const individualDonors = yearSupporters.filter((su) => su.kind === "donor");
  const years = yearStats.map((row) => row.year).filter((y) => y >= FOUNDING_YEAR);
  if (year !== null && !years.includes(year) && yearStats.length > 0) notFound();
  const derived = year !== null ? (yearStats.find((row) => row.year === year) ?? null) : null;
  const report = year !== null ? (yearReports.find((row) => row.year === year) ?? null) : null;
  // What the report records that the ledger cannot: lists from a year
  // before the ledger existed, and the volunteers by name.
  const recordedEvents = report?.events ?? [];
  const recordedHandOvers = report?.beneficiaries_list ?? [];
  const recordedDonorRows = report?.donors_list ?? [];
  const volunteers = report?.volunteers_list ?? [];
  const recordedOutsideLedger = recordedDonorRows.length > 0 || recordedHandOvers.length > 0;
  // The donor wall: individuals recorded as supporters plus the recorded
  // list, one chip per name with every gift behind it.
  const donors = groupDonors([
    ...individualDonors.flatMap((su) =>
      (su.gifts ?? []).length > 0
        ? (su.gifts ?? []).map((g) => ({ name: su.name, amount_cents: g.amount_cents, target: g.target, date: g.date }))
        : [{ name: su.name, amount_cents: su.cash_cents > 0 ? su.cash_cents : null }],
    ),
    ...recordedDonorRows,
  ]);
  const sponsorCash = supporters.reduce((sum, su) => sum + su.cash_cents, 0);
  const listSum = (rows: { amount_cents: number | null }[]) => rows.reduce((sum, row) => sum + (row.amount_cents ?? 0), 0);
  // Hand-overs of the year grouped by their public label: the ledger's
  // published rows plus what was recorded before the ledger.
  const byLabel = new Map<string, number>();
  for (const row of outRows) byLabel.set(row.beneficiary_label, (byLabel.get(row.beneficiary_label) ?? 0) + row.amount_cents);
  for (const row of recordedHandOvers) byLabel.set(row.label, (byLabel.get(row.label) ?? 0) + (row.amount_cents ?? 0));
  const beneficiaries = [...byLabel].map(([label, cents]) => ({ label, cents })).sort((a, b) => b.cents - a.cents);
  // Every figure derives from a record: the ledger, the events, the
  // supporter records, and the report's lists. Nothing overrides them.
  const stats: YearStats | null = derived
    ? {
        ...derived,
        received_cents: derived.received_cents + listSum(recordedDonorRows),
        disbursed_cents: derived.disbursed_cents + listSum(recordedHandOvers),
        donor_count: derived.donor_count + groupDonors(recordedDonorRows).length,
        event_count: derived.event_count + recordedEvents.length,
        supporter_count: supporters.length,
        beneficiary_count: beneficiaries.length,
      }
    : null;
  const tense = year === null ? "all" : year < thisYear ? "past" : year === thisYear ? "current" : "future";
  // unallocated_cents can transiently go negative (a disbursement published
  // while its matching credits are still pending approval) — the flagship
  // page must show the honest signed figure, never crash.
  const money = (cents: number) =>
    cents < 0
      ? formatSignedCents(cents, locale as Locale, { trimWholeCents: true })
      : formatCents(cents, locale as Locale, { trimWholeCents: true });

  const moneyIn: LedgerRow[] = inRows.map((row) => ({
    id: row.id,
    date: row.entry_date,
    name: row.display_name,
    attribution:
      row.fundraiser_title ??
      row.campaign_title ??
      (row.chapter_slug ? row.chapter_slug.toUpperCase() : t("national")),
    railKey: RAIL_KEYS[row.rail] ?? "railMixed",
    amountCents: row.amount_cents,
  }));

  const moneyOut: LedgerRow[] = outRows.map((row) => ({
    id: row.id,
    date: row.entry_date,
    name: row.beneficiary_label,
    attribution: row.chapter_slug ? row.chapter_slug.toUpperCase() : t("national"),
    railKey: null,
    amountCents: row.amount_cents,
    docs: row.documentation_paths.flatMap((path, index) => {
      const url = disbursementDocUrl(path);
      if (!url) return [];
      return [
        {
          url,
          label:
            row.documentation_paths.length > 1
              ? `${t("docPill")} ${index + 1}`
              : t("docPill"),
        },
      ];
    }),
  }));

  // Corrections render inside their direction, as their own dated rows —
  // the append-only ledger never silently alters a published figure.
  for (const adj of adjustments) {
    const row: LedgerRow = {
      id: adj.id,
      date: adj.entry_date,
      name: adj.reason,
      attribution: null,
      railKey: null,
      amountCents: adj.amount_cents,
      correction: true,
    };
    if (adj.references_disbursement_id) moneyOut.push(row);
    else moneyIn.push(row);
  }
  moneyIn.sort((a, b) => b.date.localeCompare(a.date));
  moneyOut.sort((a, b) => b.date.localeCompare(a.date));

  const count = (n: number) => new Intl.NumberFormat(locale).format(n);
  const venues = [...new Set([...events.flatMap((e) => (e.venue ? [e.venue] : [])), ...recordedEvents.flatMap((e) => (e.venue ? [e.venue] : [])), ...(report?.venues ?? [])])];
  const prose = "prose-santamore mt-2 text-[15.5px] leading-relaxed text-black/80 [&_p]:mt-3 [&_p:first-child]:mt-0 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-sea [&_a]:underline [&_strong]:font-bold";

  const emptyLine = (text: string) => <p className="text-[14px] text-black/55">{text}</p>;
  const listBox = "overflow-hidden rounded-lg bg-mist";
  const rowClass = "flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t-[0.5px] border-line px-4 py-2.5 text-[14.5px] first:border-t-0";
  const handOverList =
    beneficiaries.length === 0 ? (
      <p className="mt-2 text-[14px] text-black/55">{tYears("noBeneficiaries")}</p>
    ) : (
      <ul className={`mt-2 ${listBox}`}>
        {beneficiaries.map((row) => (
          <li key={row.label} className="flex items-baseline justify-between gap-3 border-t-[0.5px] border-line px-4 py-2.5 text-[14.5px] first:border-t-0">
            <span>{row.label}</span>
            <span className="whitespace-nowrap font-mono tabular-nums">{money(row.cents)}</span>
          </li>
        ))}
      </ul>
    );
  const eventList = (
    <>
      {events.length === 0 && recordedEvents.length === 0 ? (
        emptyLine(tYears("noEvents"))
      ) : (
        <ul className={listBox}>
          {recordedEvents.map((event) => (
            <li key={`recorded-${event.name}`} className={rowClass}>
              <span className="font-mono text-[13px] tabular-nums text-black/60">{event.date ? formatShortDate(event.date, locale as Locale) : "—"}</span>
              <span className="font-semibold">{event.name}</span>
              {event.venue ? <span className="text-black/55">· {event.venue}</span> : null}
            </li>
          ))}
          {events.map((event) => (
            <li key={event.slug} className="border-t-[0.5px] border-line first:border-t-0">
              <Link href={`/dogadjaji/${event.slug}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2.5 text-[14.5px] transition-colors hover:bg-mist-2">
                <span className="font-mono text-[13px] tabular-nums text-black/60">{event.starts_at ? formatShortDate(event.starts_at, locale as Locale) : "—"}</span>
                <span className="font-semibold">{event.name}</span>
                {event.venue ? <span className="text-black/55">· {event.venue}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {venues.length > 0 ? (
        <p className="mt-2 text-[13.5px] text-black/60">
          <span className="font-semibold">{tYears("venuesHeading")}:</span> {venues.join(" · ")}
        </p>
      ) : null}
    </>
  );
  const sections: YearSection[] = stats
    ? [
        {
          key: "donors",
          label: tYears("donors"),
          value: count(stats.donor_count),
          content: donors.length > 0 ? <DonorWall donors={donors} wentTo={beneficiaries.map((row) => row.label)} /> : emptyLine(tYears("noDonorsYet")),
        },
        {
          key: "runners",
          label: tYears("runners"),
          value: count(stats.runner_count),
          content: (
            <>
              <p className="text-[14.5px] text-black/70">{tYears("runnersNote", { count: stats.runner_count })}</p>
              <div className="mt-3">{eventList}</div>
            </>
          ),
        },
        {
          key: "pages",
          label: tYears("pages"),
          value: count(stats.page_count),
          content:
            pages.length === 0 ? (
              emptyLine(tYears("noPages"))
            ) : (
              <ul className={listBox}>
                {pages.map((page) => (
                  <li key={page.slug} className="border-t-[0.5px] border-line first:border-t-0">
                    <Link href={`/f/${page.slug}`} className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-[14.5px] transition-colors hover:bg-mist-2">
                      <span className="font-semibold">{page.title}</span>
                      <span className="whitespace-nowrap font-mono tabular-nums">{money(page.raised_cents)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ),
        },
        {
          key: "teams",
          label: tYears("teams"),
          value: count(stats.team_count),
          content:
            teams.length === 0 ? (
              emptyLine(tYears("noTeams"))
            ) : (
              <ul className={listBox}>
                {teams.map((team) => (
                  <li key={team.slug} className="border-t-[0.5px] border-line first:border-t-0">
                    <Link href={`/t/${team.slug}`} className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-[14.5px] transition-colors hover:bg-mist-2">
                      <span className="font-semibold">{team.name} <span className="font-normal text-black/55">· {tYears("members", { count: team.member_count })}</span></span>
                      <span className="whitespace-nowrap font-mono tabular-nums">{money(team.raised_cents)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ),
        },
        { key: "events", label: tYears("events"), value: count(stats.event_count), content: eventList },
        {
          key: "sponsors",
          label: tYears("supporters"),
          value: count(stats.supporter_count),
          content: (
            <>
              {sponsorCash > 0 ? (
                <p className="mb-3 text-[14px] text-black/60">
                  <span className="font-mono text-[15px] font-bold tabular-nums text-sea">{money(sponsorCash)}</span> {tYears("sponsorCash")}
                </p>
              ) : null}
              {supporters.length === 0 ? emptyLine(tYears("noSupporters")) : <SponsorGrid sponsors={supporters} inKindLabel={tYears("inKind")} />}
            </>
          ),
        },
        {
          key: "volunteers",
          label: tYears("volunteers"),
          value: count(volunteers.length),
          content:
            volunteers.length === 0 ? (
              emptyLine(tYears("noVolunteers"))
            ) : (
              <ul className="flex flex-wrap gap-2">
                {volunteers.map((name) => (
                  <li key={name} className="rounded-lg bg-mist px-3 py-2 text-[14px] font-semibold">{name}</li>
                ))}
              </ul>
            ),
        },
        { key: "beneficiaries", label: tYears("beneficiaries"), value: count(stats.beneficiary_count), content: handOverList },
      ]
    : [];

  const heroRow = (label: string, cents: number, big = false) => (
    <div
      className={`flex items-baseline justify-between gap-3 py-[7px] text-[13.5px] ${
        big
          ? "mt-1.5 border-t-[1.5px] border-paper/40 pt-3"
          : "border-b border-paper/15"
      }`}
    >
      <span>{label}</span>
      <span
        className={`whitespace-nowrap font-mono tabular-nums ${
          big ? "text-[20px] font-medium" : "text-[16px]"
        }`}
      >
        {money(cents)}
      </span>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-sea/80">
        {t("eyebrow")}
      </p>
      <h1 className="type-display mt-2 text-3xl sm:text-4xl">{t("title")}</h1>

      <YearTabs years={years} selected={year} />

      {/* what this view is */}
      <h2 className="type-display mt-6 text-2xl">
        {tense === "all"
          ? tYears("eyebrowAll")
          : tense === "past"
            ? tYears("pastTitle", { year: String(year) })
            : tense === "current"
              ? tYears("currentTitle", { year: String(year) })
              : tYears("futureTitle", { year: String(year) })}
      </h2>
      {tense !== "all" ? (
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-black/60">
          {tense === "past" ? tYears("pastLead") : tense === "current" ? tYears("currentLead") : tYears("futureLead")}
          {recordedOutsideLedger ? ` ${tYears("legacyNote")}` : ""}
        </p>
      ) : null}

      {/* dark reconciliation summary, per the prototype */}
      <div className="mt-4 rounded-brand bg-sea p-5 text-paper">
        {stats ? (
          <>
            {heroRow(tYears("received"), stats.received_cents)}
            {heroRow(tYears("disbursed"), stats.disbursed_cents)}
            {heroRow(tYears("operations"), stats.operations_cents, true)}
          </>
        ) : (
          <>
            {heroRow(t("received"), summary?.received_cents ?? 0)}
            {heroRow(t("disbursed"), summary?.disbursed_cents ?? 0)}
            {heroRow(t("approvedPending"), summary?.approved_pending_cents ?? 0)}
            {heroRow(t("unallocated"), summary?.unallocated_cents ?? 0, true)}
          </>
        )}
      </div>

      {/* the two funds — the core promise, most legible thing on the page */}
      <div className="mt-3 rounded-brand bg-mist px-4 py-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
          {t("twoFunds")}
        </p>
        <div className="flex items-baseline justify-between gap-3 border-b-[0.5px] border-line py-2 text-[13.5px]">
          <span>{t("impactFund")}</span>
          <span className="whitespace-nowrap font-mono text-[14px] font-medium text-red">
            {t("impactFundValue")}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-2 text-[13.5px]">
          <span>{t("operationsFund")}</span>
          <span className="whitespace-nowrap font-mono text-[16px] tabular-nums">
            {money(stats ? stats.operations_cents : opsCents)}
          </span>
        </div>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-black/60">{t("fundsNote")}</p>
      </div>

      {stats ? (
        <>
          {/* where the money went, in the public form */}
          <section className="mt-5">
            <h3 className="type-eyebrow text-sea/80">{tYears("beneficiariesHeading")}</h3>
            {handOverList}
          </section>

          {/* the year in figures: each tile opens what stands behind it */}
          <div className="mt-5">
            <YearSections
              story={{
                key: "story",
                label: tense === "past" ? tYears("pastTitle", { year: String(year) }) : tense === "current" ? tYears("currentTitle", { year: String(year) }) : tYears("futureTitle", { year: String(year) }),
                content: (
                  <>
                    {report?.headline ? <p className="text-[18px] font-bold leading-snug">{report.headline}</p> : null}
                    {tense !== "future" && report?.summary_md ? (
                      <section className="mt-4">
                        <h3 className="type-eyebrow text-sea/80">{tYears("summaryHeading")}</h3>
                        <div className={prose}>
                          <Markdown remarkPlugins={[remarkGfm]}>{report.summary_md}</Markdown>
                        </div>
                      </section>
                    ) : null}
                    {tense !== "past" && report?.plan_md ? (
                      <section className="mt-4">
                        <h3 className="type-eyebrow text-sea/80">{tYears("planHeading")}</h3>
                        <div className={prose}>
                          <Markdown remarkPlugins={[remarkGfm]}>{report.plan_md}</Markdown>
                        </div>
                      </section>
                    ) : null}
                    {!report?.headline && !report?.summary_md && !report?.plan_md ? (
                      <p className="text-[14px] text-black/50">{tYears("noReport")}</p>
                    ) : null}
                  </>
                ),
              }}
              sections={sections}
            />
          </div>
        </>
      ) : null}

      <h2 className="mt-8 type-eyebrow text-sea/80">
        {year !== null ? tYears("ledgerHeading", { year: String(year) }) : tYears("ledgerHeadingAll")}
      </h2>
      <LedgerTabs locale={locale as Locale} moneyIn={moneyIn} moneyOut={moneyOut} />

      {/* CSV downloads are attachment responses, not navigations — plain
          anchors on purpose. */}
      <div className="mt-6 flex flex-wrap gap-3 text-[13.5px] font-semibold">
        <a
          href="/api/ledger/in"
          download
          className="rounded-lg bg-mist px-3 py-1.5 transition-colors hover:bg-mist-2 hover:text-sea"
        >
          {t("downloadIn")}
        </a>
        <a
          href="/api/ledger/out"
          download
          className="rounded-lg bg-mist px-3 py-1.5 transition-colors hover:bg-mist-2 hover:text-sea"
        >
          {t("downloadOut")}
        </a>
      </div>

      <p className="mt-5 text-[12.5px] leading-relaxed text-black/60">{t("footNote")}</p>
    </div>
  );
}
