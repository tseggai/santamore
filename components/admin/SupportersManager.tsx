"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { saveSponsorship, saveSupporter } from "@/app/[locale]/admin/(protected)/podrska/actions";
import type { Option } from "@/components/admin/EventForm";
import { downscaleToJpeg } from "@/lib/images";
import { formatCents, parseEurosToCents } from "@/lib/money";
import { supporterLogoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export interface SupporterRow {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  is_active: boolean;
  logo_path: string | null;
}

export interface SponsorshipRow {
  id: string;
  supporter_id: string | null;
  tier: string | null;
  chapter_id: string | null;
  campaign_id: string | null;
  event_id: string | null;
  amount_cents: number | null;
  is_in_kind: boolean;
  status: "prospect" | "negotiating" | "signed" | "active" | "ended";
}

interface OfferRow {
  id: string;
  supporter_id: string | null;
  title: string;
  reward_label: string;
  is_active: boolean;
  event_id: string | null;
}

const STATUSES = ["prospect", "negotiating", "signed", "active", "ended"] as const;
const inputClass =
  "mt-1 w-full rounded-lg border-[1.5px] border-line bg-paper px-3 py-2.5 text-[15px] outline-none focus:border-sea";
const labelClass = "text-[13.5px] font-semibold";
const ghost = "rounded-lg bg-paper px-3 py-1.5 text-[13.5px] font-semibold transition-colors hover:bg-mist-2";

/** The organisation itself: name, website, who to call. */
export function SupporterForm({
  supporter,
  onDone,
  onCreated,
}: {
  supporter: SupporterRow | null;
  onDone: () => void;
  onCreated?: (created: { id: string; name: string }) => void;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [name, setName] = useState(supporter?.name ?? "");
  const [website, setWebsite] = useState(supporter?.website ?? "");
  const [contactName, setContactName] = useState(supporter?.contact_name ?? "");
  const [contactEmail, setContactEmail] = useState(supporter?.contact_email ?? "");
  const [contactPhone, setContactPhone] = useState(supporter?.contact_phone ?? "");
  const [notes, setNotes] = useState(supporter?.notes ?? "");
  const [active, setActive] = useState(supporter?.is_active ?? true);
  const [logoPath, setLogoPath] = useState<string | null | undefined>(undefined);
  const [logoBusy, setLogoBusy] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "error" | "invalid">("idle");
  const currentLogo = logoPath === undefined ? (supporter?.logo_path ?? null) : logoPath;

  // Logos go straight to the public bucket under the supporter's id; the
  // path is saved with the form. Only for an existing record (it needs the id).
  const uploadLogo = async (file: File) => {
    if (!supporter) return;
    setLogoBusy(true);
    try {
      const blob = await downscaleToJpeg(file);
      const path = `${supporter.id}/logo-${Date.now()}.jpg`;
      const { error } = await createClient().storage.from("supporter-logos").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      setLogoPath(path);
    } catch {
      setState("error");
    } finally {
      setLogoBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("busy");
    const result = await saveSupporter({
      id: supporter?.id,
      name,
      website: website.trim() || null,
      contactName: contactName.trim() || null,
      contactEmail: contactEmail.trim() || null,
      contactPhone: contactPhone.trim() || null,
      notes: notes.trim() || null,
      isActive: active,
      ...(logoPath !== undefined ? { logoPath } : {}),
    }).catch(() => ({ ok: false as const, error: "server" as const }));
    if (result.ok) {
      router.refresh();
      if (result.supporter && onCreated) onCreated(result.supporter);
      onDone();
    } else {
      setState(result.error === "invalid" ? "invalid" : "error");
    }
  };

  return (
    <form onSubmit={submit} className="rounded-lg bg-mist p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="suName" className={labelClass}>{t("suName")}</label>
          <input id="suName" type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="suWebsite" className={labelClass}>{t("spWebsite")}</label>
          <input id="suWebsite" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" className={inputClass} />
        </div>
        <div>
          <label htmlFor="suContact" className={labelClass}>{t("suContact")}</label>
          <input id="suContact" type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="suEmail" className={labelClass}>{t("suEmail")}</label>
          <input id="suEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="suPhone" className={labelClass}>{t("suPhone")}</label>
          <input id="suPhone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="suNotes" className={labelClass}>{t("suNotes")}</label>
          <textarea id="suNotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </div>
        {supporter ? (
          <div className="flex items-center gap-3 sm:col-span-2">
            {currentLogo ? (
              // eslint-disable-next-line @next/next/no-img-element -- public bucket, arbitrary sizes
              <img src={supporterLogoUrl(currentLogo) ?? ""} alt="" className="h-14 w-14 rounded-lg bg-paper object-contain" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-paper text-[20px] font-bold text-black/40">{name.charAt(0).toUpperCase()}</span>
            )}
            <label className="text-[14px] font-semibold">
              <span className="block">{t("suLogo")}</span>
              <input type="file" accept="image/*" disabled={logoBusy} onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} className="mt-1 block text-[13.5px]" />
              <span className="block text-[13px] font-normal text-black/55">{logoBusy ? t("photoUploading") : t("suLogoHint")}</span>
            </label>
          </div>
        ) : null}
        <label className="flex items-center gap-2 text-[14.5px] sm:col-span-2">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-red" />
          {t("suActive")}
        </label>
      </div>
      {state === "error" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("actionError")}</p> : null}
      {state === "invalid" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("evInvalid")}</p> : null}
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={state === "busy" || logoBusy} className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60">
          {supporter ? t("evSave") : t("suCreate")}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg bg-paper px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:bg-mist-2">
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}

/** One deal: money or in kind, on a cause or an event, with its pipeline status. */
function SponsorshipForm({
  supporterId,
  sponsorship,
  chapters,
  campaigns,
  events,
  onDone,
}: {
  supporterId: string;
  sponsorship: SponsorshipRow | null;
  chapters: Option[];
  campaigns: Option[];
  events: Option[];
  onDone: () => void;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [tier, setTier] = useState(sponsorship?.tier ?? "");
  const [chapterId, setChapterId] = useState(sponsorship?.chapter_id ?? "");
  const [campaignId, setCampaignId] = useState(sponsorship?.campaign_id ?? "");
  const [eventId, setEventId] = useState(sponsorship?.event_id ?? "");
  const [amount, setAmount] = useState(sponsorship?.amount_cents ? String(sponsorship.amount_cents / 100) : "");
  const [inKind, setInKind] = useState(sponsorship?.is_in_kind ?? false);
  const [status, setStatus] = useState<SponsorshipRow["status"]>(sponsorship?.status ?? "prospect");
  const [state, setState] = useState<"idle" | "busy" | "error" | "invalid">("idle");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amountCents = amount.trim() === "" ? null : parseEurosToCents(amount);
    if (amount.trim() !== "" && amountCents === null) {
      setState("invalid");
      return;
    }
    setState("busy");
    const result = await saveSponsorship({
      id: sponsorship?.id,
      supporterId,
      tier: tier.trim() || null,
      chapterId: chapterId || null,
      campaignId: campaignId || null,
      eventId: eventId || null,
      amountCents,
      isInKind: inKind,
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
    <form onSubmit={submit} className="rounded-lg bg-paper p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="spTier" className={labelClass}>{t("spTier")}</label>
          <input id="spTier" type="text" value={tier} onChange={(e) => setTier(e.target.value)} placeholder={t("spTierHint")} className={inputClass} />
        </div>
        <div>
          <label htmlFor="spStatus" className={labelClass}>{t("spStatus")}</label>
          <select id="spStatus" value={status} onChange={(e) => setStatus(e.target.value as SponsorshipRow["status"])} className={inputClass}>
            {STATUSES.map((s) => <option key={s} value={s}>{t(`spStatusValue.${s}`)}</option>)}
          </select>
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
          <label htmlFor="spAmount" className={labelClass}>{t("spAmount")}</label>
          <input id="spAmount" type="text" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputClass} font-mono`} />
        </div>
        <label className="flex items-center gap-2 text-[14.5px] sm:col-span-2">
          <input type="checkbox" checked={inKind} onChange={(e) => setInKind(e.target.checked)} className="h-4 w-4 accent-red" />
          {t("spInKind")}
        </label>
      </div>
      <p className="mt-2 text-[13px] text-black/55">{t("spOpsNote")}</p>
      {state === "error" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("actionError")}</p> : null}
      {state === "invalid" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("goalInvalidAdmin")}</p> : null}
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={state === "busy"} className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60">
          {sponsorship ? t("evSave") : t("spCreate")}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg bg-mist px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:bg-mist-2">
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}

export function SupportersManager({
  locale,
  supporters,
  sponsorships,
  offers,
  chapters,
  campaigns,
  events,
}: {
  locale: Locale;
  supporters: SupporterRow[];
  sponsorships: SponsorshipRow[];
  offers: OfferRow[];
  chapters: Option[];
  campaigns: Option[];
  events: Option[];
}) {
  const t = useTranslations("admin");
  const [open, setOpen] = useState<"" | "new" | string>("");
  const [dealOpen, setDealOpen] = useState<"" | `new:${string}` | string>("");
  const campaignName = new Map(campaigns.map((c) => [c.id, c.name]));
  const eventName = new Map(events.map((e) => [e.id, e.name]));

  return (
    <div className="mt-5 space-y-4">
      {open === "new" ? (
        <SupporterForm supporter={null} onDone={() => setOpen("")} />
      ) : (
        <button type="button" onClick={() => setOpen("new")} className="rounded-lg bg-red px-4 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-red-dark">
          + {t("suNew")}
        </button>
      )}
      {supporters.length === 0 ? (
        <p className="text-[14.5px] text-black/60">{t("suEmpty")}</p>
      ) : (
        <ul className="space-y-3">
          {supporters.map((supporter) => {
            const deals = sponsorships.filter((d) => d.supporter_id === supporter.id);
            const theirOffers = offers.filter((o) => o.supporter_id === supporter.id);
            return (
              <li key={supporter.id} className="rounded-lg bg-mist px-4 py-4">
                <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[16px] font-bold">
                      {supporter.name}
                      {!supporter.is_active ? (
                        <span className="rounded-full bg-paper px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-black/60">{t("suInactive")}</span>
                      ) : null}
                      {deals.length > 0 ? (
                        <span className="rounded-full bg-sea px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-paper">{t("suSponsorChip", { count: deals.length })}</span>
                      ) : null}
                      {theirOffers.length > 0 ? (
                        <span className="rounded-full bg-red px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-paper">{t("suOfferChip", { count: theirOffers.length })}</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[13.5px] text-black/60">
                      {supporter.website ? <a href={supporter.website} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-sea">{supporter.website.replace(/^https?:\/\//, "")}</a> : null}
                      {supporter.contact_name ? <> · {supporter.contact_name}</> : null}
                      {supporter.contact_email ? <> · {supporter.contact_email}</> : null}
                      {supporter.contact_phone ? <> · {supporter.contact_phone}</> : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button type="button" onClick={() => setOpen(open === supporter.id ? "" : supporter.id)} className={ghost}>{t("evEdit")}</button>
                    <button type="button" onClick={() => setDealOpen(dealOpen === `new:${supporter.id}` ? "" : `new:${supporter.id}`)} className={ghost}>+ {t("spNew")}</button>
                  </div>
                </div>

                {open === supporter.id ? (
                  <div className="mt-3"><SupporterForm supporter={supporter} onDone={() => setOpen("")} /></div>
                ) : null}
                {dealOpen === `new:${supporter.id}` ? (
                  <div className="mt-3"><SponsorshipForm supporterId={supporter.id} sponsorship={null} chapters={chapters} campaigns={campaigns} events={events} onDone={() => setDealOpen("")} /></div>
                ) : null}

                {deals.length > 0 ? (
                  <ul className="mt-3 space-y-1.5">
                    {deals.map((deal) => (
                      <li key={deal.id} className="rounded-lg bg-paper px-3.5 py-2.5 text-[14px]">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${
                            deal.status === "active" || deal.status === "signed" ? "bg-sea text-paper" : "bg-mist text-black/60"
                          }`}>
                            {t(`spStatusValue.${deal.status}`)}
                          </span>
                          {deal.tier ? <span className="font-semibold">{deal.tier}</span> : null}
                          {deal.amount_cents ? (
                            <span className="font-mono tabular-nums">
                              {formatCents(deal.amount_cents, locale, { trimWholeCents: true })}
                              {deal.is_in_kind ? ` · ${t("spInKindShort")}` : ""}
                            </span>
                          ) : deal.is_in_kind ? <span>{t("spInKindShort")}</span> : null}
                          <span className="text-black/60">
                            {deal.campaign_id ? campaignName.get(deal.campaign_id) : null}
                            {deal.campaign_id && deal.event_id ? " · " : ""}
                            {deal.event_id ? eventName.get(deal.event_id) : null}
                          </span>
                          <button type="button" onClick={() => setDealOpen(dealOpen === deal.id ? "" : deal.id)} className="ml-auto text-[13px] font-semibold text-sea underline underline-offset-2">
                            {t("evEdit")}
                          </button>
                        </div>
                        {dealOpen === deal.id ? (
                          <div className="mt-2"><SponsorshipForm supporterId={supporter.id} sponsorship={deal} chapters={chapters} campaigns={campaigns} events={events} onDone={() => setDealOpen("")} /></div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {theirOffers.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {theirOffers.map((offer) => (
                      <li key={offer.id} className="flex flex-wrap items-center gap-x-3 rounded-lg bg-paper px-3.5 py-2.5 text-[14px]">
                        <span className="font-semibold">{offer.reward_label}</span>
                        <span className="text-black/60">{offer.title}</span>
                        <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${offer.is_active ? "bg-sea text-paper" : "bg-mist text-black/60"}`}>
                          {offer.is_active ? t("perkActiveBadge") : t("postDraft")}
                        </span>
                        <Link href="/admin/dogadjaji" className="ml-auto text-[13px] font-semibold text-sea underline underline-offset-2">
                          {t("suOfferOnEvent")}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
