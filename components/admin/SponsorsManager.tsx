"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { saveSponsor } from "@/app/[locale]/admin/(protected)/partneri/actions";
import type { Option } from "@/components/admin/EventForm";
import { formatCents, parseEurosToCents } from "@/lib/money";
import type { Locale } from "@/i18n/routing";

export interface SponsorRow {
  id: string;
  name: string;
  tier: string | null;
  chapter_id: string | null;
  campaign_id: string | null;
  event_id: string | null;
  amount_cents: number | null;
  is_in_kind: boolean;
  website: string | null;
  status: "prospect" | "negotiating" | "signed" | "active" | "ended";
}

const STATUSES = ["prospect", "negotiating", "signed", "active", "ended"] as const;

const inputClass =
  "mt-1 w-full rounded-lg border-[1.5px] border-line bg-paper px-3 py-2.5 text-[15px] outline-none focus:border-sea";
const labelClass = "text-[13.5px] font-semibold";

function SponsorForm({
  sponsor,
  chapters,
  campaigns,
  events,
  onDone,
}: {
  sponsor: SponsorRow | null;
  chapters: Option[];
  campaigns: Option[];
  events: Option[];
  onDone: () => void;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [name, setName] = useState(sponsor?.name ?? "");
  const [tier, setTier] = useState(sponsor?.tier ?? "");
  const [chapterId, setChapterId] = useState(sponsor?.chapter_id ?? "");
  const [campaignId, setCampaignId] = useState(sponsor?.campaign_id ?? "");
  const [eventId, setEventId] = useState(sponsor?.event_id ?? "");
  const [amount, setAmount] = useState(sponsor?.amount_cents ? String(sponsor.amount_cents / 100) : "");
  const [inKind, setInKind] = useState(sponsor?.is_in_kind ?? false);
  const [website, setWebsite] = useState(sponsor?.website ?? "");
  const [status, setStatus] = useState<SponsorRow["status"]>(sponsor?.status ?? "prospect");
  const [state, setState] = useState<"idle" | "busy" | "error" | "invalid">("idle");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amountCents = amount.trim() === "" ? null : parseEurosToCents(amount);
    if (amount.trim() !== "" && amountCents === null) {
      setState("invalid");
      return;
    }
    setState("busy");
    const result = await saveSponsor({
      id: sponsor?.id,
      name,
      tier: tier.trim() || null,
      chapterId: chapterId || null,
      campaignId: campaignId || null,
      eventId: eventId || null,
      amountCents,
      isInKind: inKind,
      website: website.trim() || null,
      status,
    }).catch(() => ({ ok: false as const, error: "server" as const }));
    if (result.ok) {
      router.refresh();
      onDone();
    } else {
      setState(result.error === "invalid" ? "invalid" : "error");
    }
  };

  return (
    <form onSubmit={submit} className="rounded-brand border-[1.5px] border-line bg-mist/40 p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="spName" className={labelClass}>{t("spName")}</label>
          <input id="spName" type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="spTier" className={labelClass}>{t("spTier")}</label>
          <input id="spTier" type="text" value={tier} onChange={(e) => setTier(e.target.value)} placeholder={t("spTierHint")} className={inputClass} />
        </div>
        <div>
          <label htmlFor="spCampaign" className={labelClass}>{t("spCampaign")}</label>
          <select id="spCampaign" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className={inputClass}>
            <option value="">—</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="spEvent" className={labelClass}>{t("spEvent")}</label>
          <select id="spEvent" value={eventId} onChange={(e) => setEventId(e.target.value)} className={inputClass}>
            <option value="">—</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="spChapter" className={labelClass}>{t("disbChapter")}</label>
          <select id="spChapter" value={chapterId} onChange={(e) => setChapterId(e.target.value)} className={inputClass}>
            <option value="">—</option>
            {chapters.map((ch) => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="spStatus" className={labelClass}>{t("spStatus")}</label>
          <select id="spStatus" value={status} onChange={(e) => setStatus(e.target.value as SponsorRow["status"])} className={inputClass}>
            {STATUSES.map((s) => <option key={s} value={s}>{t(`spStatusValue.${s}`)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="spAmount" className={labelClass}>{t("spAmount")}</label>
          <input id="spAmount" type="text" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputClass} font-mono`} />
        </div>
        <div>
          <label htmlFor="spWebsite" className={labelClass}>{t("spWebsite")}</label>
          <input id="spWebsite" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" className={inputClass} />
        </div>
        <label className="flex items-center gap-2 text-[14.5px] sm:col-span-2">
          <input type="checkbox" checked={inKind} onChange={(e) => setInKind(e.target.checked)} className="h-4 w-4 accent-red" />
          {t("spInKind")}
        </label>
      </div>
      <p className="mt-2 text-[13px] text-ink/55">{t("spOpsNote")}</p>
      {state === "error" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("actionError")}</p> : null}
      {state === "invalid" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("goalInvalidAdmin")}</p> : null}
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={state === "busy"} className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60">
          {sponsor ? t("evSave") : t("spCreate")}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border-[1.5px] border-line px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:border-sea hover:text-sea">
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}

export function SponsorsManager({
  locale,
  sponsors,
  chapters,
  campaigns,
  events,
}: {
  locale: Locale;
  sponsors: SponsorRow[];
  chapters: Option[];
  campaigns: Option[];
  events: Option[];
}) {
  const t = useTranslations("admin");
  const [open, setOpen] = useState<"" | "new" | string>("");
  const campaignName = new Map(campaigns.map((c) => [c.id, c.name]));
  const eventName = new Map(events.map((e) => [e.id, e.name]));

  return (
    <div className="mt-5 space-y-4">
      {open === "new" ? (
        <SponsorForm sponsor={null} chapters={chapters} campaigns={campaigns} events={events} onDone={() => setOpen("")} />
      ) : (
        <button type="button" onClick={() => setOpen("new")} className="rounded-lg bg-red px-4 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-red-dark">
          + {t("spNew")}
        </button>
      )}
      {sponsors.length === 0 ? (
        <p className="text-[14.5px] text-ink/60">{t("spEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {sponsors.map((sponsor) => (
            <li key={sponsor.id} className="rounded-brand border-[1.5px] border-line px-4 py-3.5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[15.5px] font-bold">
                    {sponsor.name}
                    <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${
                      sponsor.status === "active" || sponsor.status === "signed" ? "bg-sea text-paper" : "border border-line text-ink/60"
                    }`}>
                      {t(`spStatusValue.${sponsor.status}`)}
                    </span>
                    {sponsor.tier ? <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/60">{sponsor.tier}</span> : null}
                  </p>
                  <p className="mt-0.5 text-[13.5px] text-ink/60">
                    {sponsor.amount_cents ? (
                      <span className="font-mono tabular-nums">
                        {formatCents(sponsor.amount_cents, locale, { trimWholeCents: true })}
                        {sponsor.is_in_kind ? ` · ${t("spInKindShort")}` : ""}
                      </span>
                    ) : null}
                    {sponsor.campaign_id ? <> · {campaignName.get(sponsor.campaign_id) ?? "—"}</> : null}
                    {sponsor.event_id ? <> · {eventName.get(sponsor.event_id) ?? "—"}</> : null}
                  </p>
                </div>
                <button type="button" onClick={() => setOpen(open === sponsor.id ? "" : sponsor.id)} className="rounded-lg border-[1.5px] border-line px-2.5 py-1 text-[13px] font-semibold hover:border-sea hover:text-sea">
                  {t("evEdit")}
                </button>
              </div>
              {open === sponsor.id ? (
                <div className="mt-3">
                  <SponsorForm sponsor={sponsor} chapters={chapters} campaigns={campaigns} events={events} onDone={() => setOpen("")} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
