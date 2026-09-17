"use client";

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
  volunteers: number | null;
  beneficiaries: number | null;
  venues: string[];
  isPublic: boolean;
  isLegacy: boolean;
  figures: Record<string, number>;
  events: { name: string; date: string | null; venue: string | null }[];
  supporters: string[];
  beneficiariesList: { label: string; amount_cents: number | null }[];
}

export interface YearRow {
  year: number;
  receivedCents: number;
  disbursedCents: number;
  donors: number;
  runners: number;
  events: number;
  supporters: number;
  report: YearReport | null;
}

const labelClass = "text-[13.5px] font-semibold";
const inputClass = "mt-1 w-full rounded-lg bg-paper px-3.5 py-2.5 text-[15px] outline-none ring-sea/40 focus:ring-2";

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
                  <span>{r.runners} {t("yearRunners")}</span>
                  <span>{r.events} {t("yearEvents")}</span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${
                    r.report?.isPublic ? "bg-sea text-paper" : r.report ? "bg-paper text-black/60" : "bg-paper text-red-dark"
                  }`}
                >
                  {r.report?.isPublic ? t("yearPublished") : r.report ? t("yearDraft") : t("yearMissing")}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <SidePanel open={row !== null} title={row ? `${t("yearReport")} ${row.year}` : ""} onClose={() => setOpen(null)}>
        {row ? <YearForm key={row.year} row={row} onDone={() => setOpen(null)} /> : null}
      </SidePanel>
    </>
  );
}

function YearForm({ row, onDone }: { row: YearRow; onDone: () => void }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const r = row.report;
  const [headline, setHeadline] = useState(r?.headline ?? "");
  const [summary, setSummary] = useState(r?.summaryMd ?? "");
  const [plan, setPlan] = useState(r?.planMd ?? "");
  const [volunteers, setVolunteers] = useState(r?.volunteers != null ? String(r.volunteers) : "");
  const [beneficiaries, setBeneficiaries] = useState(r?.beneficiaries != null ? String(r.beneficiaries) : "");
  const [venues, setVenues] = useState((r?.venues ?? []).join(", "));
  const [isPublic, setIsPublic] = useState(r?.isPublic ?? false);
  const [isLegacy, setIsLegacy] = useState(r?.isLegacy ?? false);
  const euros = (cents: number | undefined) => (cents === undefined ? "" : (cents / 100).toFixed(2).replace(/\.00$/, ""));
  const [fig, setFig] = useState({
    received: euros(r?.figures?.received_cents),
    disbursed: euros(r?.figures?.disbursed_cents),
    operations: euros(r?.figures?.operations_cents),
    donors: r?.figures?.donors?.toString() ?? "",
    runners: r?.figures?.runners?.toString() ?? "",
    pages: r?.figures?.pages?.toString() ?? "",
    teams: r?.figures?.teams?.toString() ?? "",
    events: r?.figures?.events?.toString() ?? "",
    supporters: r?.figures?.supporters?.toString() ?? "",
  });
  const [eventsText, setEventsText] = useState((r?.events ?? []).map((e) => [e.name, e.date ?? "", e.venue ?? ""].filter(Boolean).join(" · ")).join("\n"));
  const [supportersText, setSupportersText] = useState((r?.supporters ?? []).join(", "));
  const [beneficiariesText, setBeneficiariesText] = useState((r?.beneficiariesList ?? []).map((b) => (b.amount_cents != null ? `${b.label} · ${euros(b.amount_cents)}` : b.label)).join("\n"));
  const [state, setState] = useState<"idle" | "busy" | "error" | "invalid">("idle");

  const toInt = (text: string) => (text.trim() === "" ? null : Number.parseInt(text, 10));
  const setF = (key: keyof typeof fig, value: string) => setFig((f) => ({ ...f, [key]: value }));
  const cents = (text: string) => (text.trim() === "" ? undefined : (parseEurosToCents(text) ?? undefined));
  const int = (text: string) => (text.trim() === "" ? undefined : Number.parseInt(text, 10));
  const lines = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (state === "busy") return;
    setState("busy");
    const result = await saveYearReport({
      year: row.year,
      headline: headline.trim() || null,
      summaryMd: summary.trim() || null,
      planMd: plan.trim() || null,
      volunteers: toInt(volunteers),
      beneficiaries: toInt(beneficiaries),
      venues: venues.split(",").map((v) => v.trim()).filter(Boolean),
      isPublic,
      isLegacy,
      figures: {
        received_cents: cents(fig.received),
        disbursed_cents: cents(fig.disbursed),
        operations_cents: cents(fig.operations),
        donors: int(fig.donors),
        runners: int(fig.runners),
        pages: int(fig.pages),
        teams: int(fig.teams),
        events: int(fig.events),
        supporters: int(fig.supporters),
      },
      events: lines(eventsText).map((line) => {
        const [name, date, venue] = line.split("·").map((part) => part.trim());
        return { name: name ?? "", date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null, venue: venue || null };
      }),
      supporters: supportersText.split(",").map((v) => v.trim()).filter(Boolean),
      beneficiariesList: lines(beneficiariesText).map((line) => {
        const [label, amount] = line.split("·").map((part) => part.trim());
        return { label: label ?? "", amount_cents: amount ? (parseEurosToCents(amount) ?? null) : null };
      }),
    }).catch(() => ({ ok: false as const, error: "server" as const }));
    if (result.ok) {
      router.refresh();
      onDone();
    } else {
      setState(result.error === "invalid" ? "invalid" : "error");
    }
  };

  return (
    <form id="yearForm" onSubmit={submit} className="space-y-4">
      <p className="text-[14px] leading-relaxed text-black/60">{t("yearFormHint")}</p>
      <div>
        <label htmlFor="yHeadline" className={labelClass}>{t("yearHeadline")}</label>
        <input id="yHeadline" type="text" maxLength={160} value={headline} onChange={(e) => setHeadline(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="ySummary" className={labelClass}>{t("yearSummary")}</label>
        <textarea id="ySummary" rows={6} maxLength={8000} value={summary} onChange={(e) => setSummary(e.target.value)} className={inputClass} />
        <p className="mt-1 text-[13px] text-black/50">{t("yearSummaryHint")}</p>
      </div>
      <div>
        <label htmlFor="yPlan" className={labelClass}>{t("yearPlan")}</label>
        <textarea id="yPlan" rows={6} maxLength={8000} value={plan} onChange={(e) => setPlan(e.target.value)} className={inputClass} />
        <p className="mt-1 text-[13px] text-black/50">{t("yearPlanHint")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="yVolunteers" className={labelClass}>{t("yearVolunteers")}</label>
          <input id="yVolunteers" type="number" min={0} inputMode="numeric" value={volunteers} onChange={(e) => setVolunteers(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="yBeneficiaries" className={labelClass}>{t("yearBeneficiaries")}</label>
          <input id="yBeneficiaries" type="number" min={0} inputMode="numeric" value={beneficiaries} onChange={(e) => setBeneficiaries(e.target.value)} className={inputClass} />
          <p className="mt-1 text-[13px] text-black/50">{t("yearBeneficiariesHint")}</p>
        </div>
      </div>
      <div>
        <label htmlFor="yVenues" className={labelClass}>{t("yearVenues")}</label>
        <input id="yVenues" type="text" value={venues} onChange={(e) => setVenues(e.target.value)} className={inputClass} />
        <p className="mt-1 text-[13px] text-black/50">{t("yearVenuesHint")}</p>
      </div>
      <label className="flex items-start gap-2.5 text-[14.5px]">
        <input type="checkbox" checked={isLegacy} onChange={(e) => setIsLegacy(e.target.checked)} className="mt-0.5 h-4 w-4 accent-red" />
        {t("yearLegacy")}
      </label>
      <fieldset className="rounded-lg bg-paper px-4 py-3">
        <legend className="px-1 text-[13.5px] font-semibold">{t("yearFigures")}</legend>
        <p className="text-[13px] text-black/55">{t("yearFiguresHint")}</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {(
            [
              ["received", "figReceived"],
              ["disbursed", "figDisbursed"],
              ["operations", "figOperations"],
              ["donors", "figDonors"],
              ["runners", "figRunners"],
              ["pages", "figPages"],
              ["teams", "figTeams"],
              ["events", "figEvents"],
              ["supporters", "figSupporters"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label htmlFor={`fig-${key}`} className="text-[13px] font-semibold">{t(label)}</label>
              <input id={`fig-${key}`} type="text" inputMode="decimal" value={fig[key]} onChange={(e) => setF(key, e.target.value)} className={`${inputClass} bg-mist font-mono`} />
            </div>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="yEvents" className={labelClass}>{t("yearEventsList")}</label>
        <textarea id="yEvents" rows={3} value={eventsText} onChange={(e) => setEventsText(e.target.value)} className={`${inputClass} font-mono text-[14px]`} />
        <p className="mt-1 text-[13px] text-black/50">{t("yearEventsHint")}</p>
      </div>
      <div>
        <label htmlFor="ySupporters" className={labelClass}>{t("yearSupportersList")}</label>
        <input id="ySupporters" type="text" value={supportersText} onChange={(e) => setSupportersText(e.target.value)} className={inputClass} />
        <p className="mt-1 text-[13px] text-black/50">{t("yearSupportersHint")}</p>
      </div>
      <div>
        <label htmlFor="yBeneficiariesList" className={labelClass}>{t("yearBeneficiariesList")}</label>
        <textarea id="yBeneficiariesList" rows={3} value={beneficiariesText} onChange={(e) => setBeneficiariesText(e.target.value)} className={`${inputClass} font-mono text-[14px]`} />
        <p className="mt-1 text-[13px] text-black/50">{t("yearBeneficiariesListHint")}</p>
      </div>
      <label className="flex items-center gap-2 text-[14.5px]">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-4 w-4 accent-red" />
        {t("yearPublic")}
      </label>
      {state === "error" ? <p role="alert" className="text-[14px] font-semibold text-red-dark">{t("actionError")}</p> : null}
      {state === "invalid" ? <p role="alert" className="text-[14px] font-semibold text-red-dark">{t("evInvalid")}</p> : null}
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={state === "busy"} className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60">
          {t("evSave")}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg bg-paper px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:bg-mist-2">
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
