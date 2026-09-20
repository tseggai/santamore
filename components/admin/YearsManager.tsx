"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { saveYearReport } from "@/app/[locale]/admin/(protected)/novac/godine/actions";
import { SidePanel } from "@/components/console/SidePanel";
import { formatCents, parseEurosToCents } from "@/lib/money";
import type { Locale } from "@/i18n/routing";

export interface YearReport {
  headline: string | null;
  summaryMd: string | null;
  planMd: string | null;
  venues: string[];
  isPublic: boolean;
  isTest: boolean;
  events: { name: string; date: string | null; venue: string | null }[];
  beneficiariesList: { label: string; amount_cents: number | null }[];
  donorsList: { name: string; amount_cents: number | null }[];
  volunteersList: string[];
  /** The cause the recorded donor list and hand-overs belong to. */
  campaignId: string | null;
}

/** A cause of the year with what the ledger holds for it. */
export interface YearCause {
  id: string;
  title: string;
  isPublic: boolean;
  raisedCents: number;
  disbursedCents: number;
  handOvers: number;
}

/** A signed or active sponsorship of the year, from the supporter records. */
export interface YearSponsorship {
  id: string;
  name: string;
  tier: string | null;
  amountCents: number | null;
  inKind: boolean;
  target: string | null;
}

export interface YearRow {
  year: number;
  receivedCents: number;
  disbursedCents: number;
  donors: number;
  runners: number;
  events: number;
  supporters: number;
  causes: YearCause[];
  sponsorships: YearSponsorship[];
  report: YearReport | null;
}

const labelClass = "text-[13.5px] font-semibold";
const inputClass = "mt-1 w-full rounded-lg bg-paper px-3.5 py-2.5 text-[15px] outline-none ring-sea/40 focus:ring-2";
const linkClass = "font-semibold text-sea underline underline-offset-2";

/** Years since the founding year; a row opens the year's report in the slide-over. */
export function YearsManager({ rows }: { rows: YearRow[] }) {
  const t = useTranslations("admin");
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState<number | null>(null);
  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });
  const current = new Date().getFullYear();
  const row = rows.find((r) => r.year === open) ?? null;

  return (
    <>
      <ul className="overflow-hidden rounded-lg bg-mist">
        {rows.map((r) => {
          const state = r.year < current ? t("yearPast") : r.year === current ? t("yearCurrent") : t("yearPlanned");
          return (
            <li key={r.year} className="border-t-[0.5px] border-line first:border-t-0">
              <button
                type="button"
                onClick={() => setOpen(r.year)}
                className="flex w-full flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3.5 text-left transition-colors hover:bg-mist-2"
              >
                <span className="font-mono text-[18px] font-bold tabular-nums">{r.year}</span>
                <span className="text-[13px] text-black/55">{state}</span>
                <span className="ml-auto flex flex-wrap gap-x-4 font-mono text-[13.5px] tabular-nums text-black/70">
                  <span>{money(r.receivedCents)} ↓</span>
                  <span>{money(r.disbursedCents)} ↑</span>
                  <span>{r.causes.length} {t("yearCauses")}</span>
                  <span>{r.sponsorships.length} {t("yearSponsorsShort")}</span>
                  <span>{r.events} {t("yearEvents")}</span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${
                    r.report?.isPublic ? "bg-sea text-paper" : r.report ? "bg-paper text-black/60" : "bg-paper text-red-dark"
                  }`}
                >
                  {r.report?.isPublic ? t("yearPublished") : r.report ? t("yearDraft") : t("yearMissing")}
                </span>
                {r.report?.isTest ? <span className="rounded-full bg-red px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-paper">{t("testChip")}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>

      <SidePanel open={row !== null} title={row ? `${t("yearReport")} ${row.year}` : ""} onClose={() => setOpen(null)} wide>
        {row ? <YearForm key={row.year} row={row} onDone={() => setOpen(null)} /> : null}
      </SidePanel>
    </>
  );
}

const TABS = ["story", "causes", "events", "sponsors", "handovers", "donors", "volunteers"] as const;
type Tab = (typeof TABS)[number];

/**
 * The year's report, one tab per section so each fits the panel. Every
 * figure on the site derives from what is recorded here or elsewhere in
 * the admin; nothing here overrides a derived number.
 */
function YearForm({ row, onDone }: { row: YearRow; onDone: () => void }) {
  const t = useTranslations("admin");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const r = row.report;
  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });
  const euros = (cents: number | null | undefined) => (cents == null ? "" : (cents / 100).toFixed(2).replace(/\.00$/, ""));
  const [tab, setTab] = useState<Tab>("story");
  const [headline, setHeadline] = useState(r?.headline ?? "");
  const [summary, setSummary] = useState(r?.summaryMd ?? "");
  const [plan, setPlan] = useState(r?.planMd ?? "");
  const [venues, setVenues] = useState((r?.venues ?? []).join(", "));
  const [isPublic, setIsPublic] = useState(r?.isPublic ?? false);
  // A new report follows the test-mode switch like every other record; an existing one shows its flag.
  const [isTest, setIsTest] = useState<boolean | undefined>(r?.isTest);
  const [eventsText, setEventsText] = useState((r?.events ?? []).map((e) => [e.name, e.date ?? "", e.venue ?? ""].filter(Boolean).join(" · ")).join("\n"));
  const [beneficiariesText, setBeneficiariesText] = useState((r?.beneficiariesList ?? []).map((b) => (b.amount_cents != null ? `${b.label} · ${euros(b.amount_cents)}` : b.label)).join("\n"));
  const [donorsText, setDonorsText] = useState((r?.donorsList ?? []).map((d) => (d.amount_cents != null ? `${d.name} · ${euros(d.amount_cents)}` : d.name)).join("\n"));
  const [volunteersText, setVolunteersText] = useState((r?.volunteersList ?? []).join("\n"));
  const [campaignId, setCampaignId] = useState(r?.campaignId ?? "");
  const [state, setState] = useState<"idle" | "busy" | "error" | "invalid">("idle");

  const lines = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);
  const count = (text: string) => lines(text).length;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (state === "busy") return;
    setState("busy");
    const result = await saveYearReport({
      year: row.year,
      headline: headline.trim() || null,
      summaryMd: summary.trim() || null,
      planMd: plan.trim() || null,
      venues: venues.split(",").map((v) => v.trim()).filter(Boolean),
      isPublic,
      isTest,
      events: lines(eventsText).map((line) => {
        const [name, date, venue] = line.split("·").map((part) => part.trim());
        return { name: name ?? "", date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null, venue: venue || null };
      }),
      beneficiariesList: lines(beneficiariesText).map((line) => {
        const [label, amount] = line.split("·").map((part) => part.trim());
        return { label: label ?? "", amount_cents: amount ? (parseEurosToCents(amount) ?? null) : null };
      }),
      donorsList: lines(donorsText).map((line) => {
        const [name, amount] = line.split("·").map((part) => part.trim());
        return { name: name ?? "", amount_cents: amount ? (parseEurosToCents(amount) ?? null) : null };
      }),
      volunteersList: lines(volunteersText),
      campaignId: campaignId || null,
    }).catch(() => ({ ok: false as const, error: "server" as const }));
    if (result.ok) {
      router.refresh();
      onDone();
    } else {
      setState(result.error === "invalid" ? "invalid" : "error");
    }
  };

  const tabCount: Record<Tab, number | null> = {
    story: null,
    causes: row.causes.length,
    events: row.events + count(eventsText),
    sponsors: row.sponsorships.length,
    handovers: row.causes.reduce((sum, c) => sum + c.handOvers, 0) + count(beneficiariesText),
    donors: count(donorsText),
    volunteers: count(volunteersText),
  };
  const hint = (text: string) => <p className="mt-1 text-[13px] text-black/50">{text}</p>;
  const section = (key: Tab) => (tab === key ? "" : "hidden");

  return (
    <form id="yearForm" onSubmit={submit}>
      {/* the sections, as tabs, so each fits the panel */}
      <div role="tablist" aria-label={t("yearReport")} className="-mx-1 flex flex-wrap gap-1 border-b-[0.5px] border-line pb-3">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-3 py-1.5 text-[14px] font-semibold transition-colors ${tab === key ? "bg-ink text-paper" : "bg-paper hover:bg-mist-2"}`}
          >
            {t(`yearTab.${key}`)}
            {tabCount[key] != null && tabCount[key] > 0 ? <span className={`ml-1.5 font-mono text-[12px] tabular-nums ${tab === key ? "text-paper/70" : "text-black/50"}`}>{tabCount[key]}</span> : null}
          </button>
        ))}
      </div>

      {/* Story */}
      <div className={`${section("story")} mt-4 space-y-4`}>
        <p className="text-[14px] leading-relaxed text-black/60">{t("yearFormHint")}</p>
        <div>
          <label htmlFor="yHeadline" className={labelClass}>{t("yearHeadline")}</label>
          <input id="yHeadline" type="text" maxLength={160} value={headline} onChange={(e) => setHeadline(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="ySummary" className={labelClass}>{t("yearSummary")}</label>
          <textarea id="ySummary" rows={8} maxLength={8000} value={summary} onChange={(e) => setSummary(e.target.value)} className={inputClass} />
          {hint(t("yearSummaryHint"))}
        </div>
        <div>
          <label htmlFor="yPlan" className={labelClass}>{t("yearPlan")}</label>
          <textarea id="yPlan" rows={5} maxLength={8000} value={plan} onChange={(e) => setPlan(e.target.value)} className={inputClass} />
          {hint(t("yearPlanHint"))}
        </div>
        <div>
          <label htmlFor="yVenues" className={labelClass}>{t("yearVenues")}</label>
          <input id="yVenues" type="text" value={venues} onChange={(e) => setVenues(e.target.value)} className={inputClass} />
          {hint(t("yearVenuesHint"))}
        </div>
      </div>

      {/* Causes: the year's causes and their money, from the ledger */}
      <div className={`${section("causes")} mt-4`}>
        <p className="text-[14px] leading-relaxed text-black/60">{t("yearCausesHint")}</p>
        {row.causes.length === 0 ? (
          <p className="mt-3 text-[14px] text-black/55">{t("yearCausesEmpty")}</p>
        ) : (
          <ul className="mt-3 overflow-hidden rounded-lg bg-paper">
            {row.causes.map((cause) => (
              <li key={cause.id} className="border-t-[0.5px] border-line px-4 py-3 first:border-t-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[15px] font-bold">{cause.title}</span>
                  {!cause.isPublic ? <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-black/50">{t("yearCausePrivate")}</span> : null}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[13.5px] tabular-nums text-black/70">
                  <span>{money(cause.raisedCents)} ↓</span>
                  <span>{money(cause.disbursedCents)} ↑ · {cause.handOvers} {t("yearHandOvers")}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px]">
                  <Link href={`/${locale}/admin/kampanje?uredi=${cause.id}`} className={linkClass}>{t("yearEditCause")}</Link>
                  <Link href={`/${locale}/admin/novac/odliv?cilj=${cause.id}`} className={linkClass}>{t("yearRecordHandOver")}</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[13.5px]">
          <Link href={`/${locale}/admin/kampanje`} className={linkClass}>{t("yearNewCause")}</Link>
        </p>
      </div>

      {/* Events: what the Events screen holds, plus what was recorded outside it */}
      <div className={`${section("events")} mt-4 space-y-4`}>
        <p className="text-[14px] leading-relaxed text-black/60">{t("yearEventsFromDb", { count: row.events })} <Link href={`/${locale}/admin/dogadjaji`} className={linkClass}>{t("yearManageEvents")}</Link></p>
        <div>
          <label htmlFor="yEvents" className={labelClass}>{t("yearEventsList")}</label>
          <textarea id="yEvents" rows={4} value={eventsText} onChange={(e) => setEventsText(e.target.value)} className={`${inputClass} font-mono text-[14px]`} />
          {hint(t("yearEventsHint"))}
        </div>
      </div>

      {/* Sponsors: from the supporter records, read-only here */}
      <div className={`${section("sponsors")} mt-4`}>
        <p className="text-[14px] leading-relaxed text-black/60">{t("yearSponsorsHint")} <Link href={`/${locale}/admin/podrska`} className={linkClass}>{t("yearSponsorsLink")}</Link></p>
        {row.sponsorships.length === 0 ? (
          <p className="mt-3 text-[14px] text-black/55">{t("yearSponsorsEmpty")}</p>
        ) : (
          <ul className="mt-3 overflow-hidden rounded-lg bg-paper">
            {row.sponsorships.map((deal) => (
              <li key={deal.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t-[0.5px] border-line px-4 py-2.5 text-[14.5px] first:border-t-0">
                <span className="font-bold">{deal.name}</span>
                {deal.tier ? <span className="capitalize text-black/60">{deal.tier}</span> : null}
                {deal.target ? <span className="text-black/60">{deal.target}</span> : null}
                <span className="ml-auto whitespace-nowrap font-mono tabular-nums">{deal.amountCents != null ? money(deal.amountCents) : deal.inKind ? t("spInKindShort") : "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Hand-overs: from the ledger, plus what was recorded outside it */}
      <div className={`${section("handovers")} mt-4 space-y-4`}>
        <p className="text-[14px] leading-relaxed text-black/60">{t("yearHandOversHint")} <Link href={`/${locale}/admin/novac/odliv`} className={linkClass}>{t("yearManageHandOvers")}</Link></p>
        <div>
          <label htmlFor="yBeneficiariesList" className={labelClass}>{t("yearBeneficiariesList")}</label>
          <textarea id="yBeneficiariesList" rows={4} value={beneficiariesText} onChange={(e) => setBeneficiariesText(e.target.value)} className={`${inputClass} font-mono text-[14px]`} />
          {hint(t("yearBeneficiariesListHint"))}
        </div>
      </div>

      {/* Donors: the wall of a year recorded before the ledger */}
      <div className={`${section("donors")} mt-4 space-y-4`}>
        <div className="rounded-lg bg-paper px-3.5 py-3">
          <label htmlFor="yRecordedCause" className={labelClass}>{t("yearRecordedCause")}</label>
          <select id="yRecordedCause" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className={inputClass}>
            <option value="">—</option>
            {row.causes.map((cause) => <option key={cause.id} value={cause.id}>{cause.title}</option>)}
          </select>
          <p className="mt-1 text-[13px] text-black/50">{t("yearRecordedCauseHint")}</p>
        </div>
        <div>
        <label htmlFor="yDonors" className={labelClass}>{t("yearDonorsList")}</label>
        <textarea id="yDonors" rows={14} value={donorsText} onChange={(e) => setDonorsText(e.target.value)} className={`${inputClass} font-mono text-[14px]`} />
        {hint(t("yearDonorsHint"))}
        </div>
      </div>

      {/* Volunteers: by name */}
      <div className={`${section("volunteers")} mt-4`}>
        <label htmlFor="yVolunteers" className={labelClass}>{t("yearVolunteersList")}</label>
        <textarea id="yVolunteers" rows={10} value={volunteersText} onChange={(e) => setVolunteersText(e.target.value)} className={`${inputClass} font-mono text-[14px]`} />
        {hint(t("yearVolunteersHint"))}
      </div>

      {state === "error" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("actionError")}</p> : null}
      {state === "invalid" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("evInvalid")}</p> : null}

      <div className="sticky bottom-0 -mx-5 mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t-[0.5px] border-line bg-mist px-5 py-3 sm:-mx-6 sm:px-6">
        <label className="flex items-center gap-2 text-[14.5px]">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-4 w-4 accent-red" />
          {t("yearPublic")}
        </label>
        {isTest !== undefined ? (
          <label className="flex items-center gap-2 text-[14.5px]">
            <input type="checkbox" checked={isTest} onChange={(e) => setIsTest(e.target.checked)} className="h-4 w-4 accent-red" />
            {t("yearTestData")}
          </label>
        ) : null}
        <div className="ml-auto flex gap-2">
          <button type="submit" disabled={state === "busy"} className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60">
            {t("evSave")}
          </button>
          <button type="button" onClick={onDone} className="rounded-lg bg-paper px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:bg-mist-2">
            {t("cancel")}
          </button>
        </div>
      </div>
    </form>
  );
}
