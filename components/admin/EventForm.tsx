"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent, type ReactNode } from "react";

import { Link } from "@/i18n/navigation";
import { createChapter, saveEvent } from "@/app/[locale]/admin/(protected)/dogadjaji/actions";
import { parseDistances, type EventDistance } from "@/lib/events";
import { DateTimeField } from "@/components/admin/DateTimeField";
import { CoverField } from "@/components/admin/CoverField";
import { GalleryManager, type GalleryAdminItem } from "@/components/admin/GalleryManager";
import { OfferForm, OffersPanel, type OfferDraft, type PerkChallengeAdminRow } from "@/components/admin/OffersPanel";
import { savePerkChallenge } from "@/app/[locale]/admin/(protected)/izazovi/actions";
import { PreviewFrame } from "@/components/admin/PreviewFrame";
import { EventPageView } from "@/components/events/EventPageView";
import { slugify } from "@/lib/slug";

export type EventKind = "race" | "challenge" | "social";

export interface EventFormValues {
  id?: string;
  name: string;
  slug: string;
  kind: EventKind;
  challenge_metric: string | null;
  chapter_id: string;
  campaign_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  venue: string | null;
  capacity: number | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  distances: unknown;
  price_tiers: unknown;
  is_published: boolean;
  description: string | null;
  offers_shirts: boolean;
  cover_path?: string | null;
  hosting?: "own" | "external";
  external_url?: string | null;
  /** External race: people register with the organiser, or we register the team here. */
  registration_mode?: "organizer" | "here";
  organizer_name?: string | null;
  bib_policy?: "none" | "we_buy";
  bib_capacity?: number | null;
  max_guests?: number;
}

export interface Option {
  id: string;
  name: string;
}

interface TierRow {
  label: string;
  euros: string;
  /** YYYY-MM-DD or empty: the last day this price is offered. */
  until: string;
  /** The distance this price is for, or empty for every distance. */
  distance: string;
}

interface DistanceRow {
  name: string;
  /** Places on this distance, or empty for no limit of its own. */
  capacity: string;
}

const KINDS: EventKind[] = ["race", "challenge", "social"];
const METRICS = ["distance_m", "moving_time_s", "activity_count", "elevation_m"] as const;

/** ISO → the browser-local "YYYY-MM-DDTHH:mm" the picker works in. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(local: string): string | null {
  if (!local) return null;
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** "15", "15.50", "15,5" → cents; anything else → null. Never a float. */
function eurosToCents(text: string): number | null {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(text.replace(/\s|€/g, ""));
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

function tiersFromValue(value: unknown): TierRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((tier) =>
    typeof tier?.label === "string" && typeof tier?.amount_cents === "number"
      ? [{ label: tier.label, euros: (tier.amount_cents / 100).toFixed(2).replace(/\.00$/, ""), until: typeof tier.until === "string" ? tier.until : "", distance: typeof tier.distance === "string" ? tier.distance : "" }]
      : [],
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border-[1.5px] border-line bg-paper px-3 py-2.5 text-[15px] outline-none focus:border-sea";
const labelClass = "text-[14.5px] font-semibold";

/**
 * One form for every kind of event. The kind comes first because it
 * decides the rest: a race has distances and shirts, a challenge a metric
 * and a period, a gathering neither — just a date, a place and, if
 * ticketed, tiers.
 */
export function EventForm({
  event,
  chapters: initialChapters,
  campaigns: initialCampaigns,
  supporters = [],
  offers = [],
  gallery = [],
  onDone,
  onCreated,
  extra = null,
}: {
  event: EventFormValues | null;
  /** Admin-only buttons for an existing event: the test flag and Delete, at the end of the footer. */
  extra?: ReactNode;
  chapters: Option[];
  campaigns: Option[];
  supporters?: Option[];
  /** Offers already on this challenge (edit mode). */
  offers?: PerkChallengeAdminRow[];
  /** Photos of this event (edit mode). */
  gallery?: GalleryAdminItem[];
  onDone?: () => void;
  /** After a create: the manager keeps the new event open for offers. */
  onCreated?: (id: string) => void;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [kind, setKind] = useState<EventKind>(event?.kind ?? "race");
  const [name, setName] = useState(event?.name ?? "");
  const [slug, setSlug] = useState(event?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(event));
  const [description, setDescription] = useState(event?.description ?? "");
  const [metric, setMetric] = useState(event?.challenge_metric ?? "distance_m");
  const [chapters, setChapters] = useState(initialChapters);
  const [chapterId, setChapterId] = useState(event?.chapter_id ?? initialChapters[0]?.id ?? "");
  const [newChapter, setNewChapter] = useState<string | null>(null);
  const [chapterBusy, setChapterBusy] = useState(false);
  const campaigns = initialCampaigns;
  const [campaignId, setCampaignId] = useState(event?.campaign_id ?? "");
  const [startsAt, setStartsAt] = useState(toLocalInput(event?.starts_at ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(event?.ends_at ?? null));
  const [venue, setVenue] = useState(event?.venue ?? "");
  const [capacity, setCapacity] = useState(event?.capacity?.toString() ?? "");
  const [regOpens, setRegOpens] = useState(toLocalInput(event?.registration_opens_at ?? null));
  const [regCloses, setRegCloses] = useState(toLocalInput(event?.registration_closes_at ?? null));
  const [distances, setDistances] = useState<DistanceRow[]>(() =>
    parseDistances(event?.distances).map((d) => ({ name: d.name, capacity: d.capacity == null ? "" : String(d.capacity) })),
  );
  const [tiers, setTiers] = useState<TierRow[]>(tiersFromValue(event?.price_tiers));
  const [offersShirts, setOffersShirts] = useState(event?.offers_shirts ?? false);
  const [hosting, setHosting] = useState<"own" | "external">(event?.hosting ?? "own");
  const [externalUrl, setExternalUrl] = useState(event?.external_url ?? "");
  const [registrationMode, setRegistrationMode] = useState<"organizer" | "here">(event?.registration_mode ?? "organizer");
  const [organizerName, setOrganizerName] = useState(event?.organizer_name ?? "");
  const [weBuyBibs, setWeBuyBibs] = useState((event?.bib_policy ?? "none") === "we_buy");
  const [bibCapacity, setBibCapacity] = useState(event?.bib_capacity != null ? String(event.bib_capacity) : "");
  const [maxGuests, setMaxGuests] = useState(String(event?.max_guests ?? 0));
  const [published, setPublished] = useState(event?.is_published ?? false);
  const [coverPath, setCoverPath] = useState<string | null>(event?.cover_path ?? null);
  const [coverFolder] = useState(() => `covers/events/${event?.id ?? `new-${crypto.randomUUID()}`}`);
  // Offers added while the challenge is still being created; saved right after it.
  const [pendingOffers, setPendingOffers] = useState<OfferDraft[]>([]);
  const [offerFormOpen, setOfferFormOpen] = useState(false);
  const [formId] = useState(() => `ev-${Math.random().toString(36).slice(2, 8)}`);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error" | "slug" | "invalid">("idle");

  const parsedTiers = tiers
    .filter((tier) => tier.label.trim() !== "" || tier.euros.trim() !== "")
    .map((tier) => {
      const cents = eurosToCents(tier.euros);
      return tier.label.trim() && cents !== null
        ? { label: tier.label.trim(), amount_cents: cents, ...(tier.until ? { until: tier.until } : {}), ...(tier.distance ? { distance: tier.distance } : {}) }
        : null;
    });
  const tiersValid = parsedTiers.every((tier) => tier !== null);
  const cleanTiers = parsedTiers.filter((tier): tier is { label: string; amount_cents: number; until?: string; distance?: string } => tier !== null);
  const distanceList: EventDistance[] = kind === "race"
    ? distances.filter((d) => d.name.trim()).map((d) => ({ name: d.name.trim(), capacity: /^\d+$/.test(d.capacity.trim()) ? Number(d.capacity.trim()) : null }))
    : [];
  const distanceNamesNow = distanceList.map((d) => d.name);
  const withDistances = kind === "race" && distanceNamesNow.length > 0;
  const tierCols = withDistances ? "sm:grid-cols-[minmax(0,1fr)_10rem_7rem_13rem_2.5rem]" : "sm:grid-cols-[minmax(0,1fr)_7rem_13rem_2.5rem]";

  const previewEvent = {
    slug: slug || slugify(name) || "dogadjaj",
    name,
    kind,
    starts_at: toIso(startsAt),
    ends_at: toIso(endsAt),
    venue: venue.trim() || null,
    registration_opens_at: toIso(regOpens),
    registration_closes_at: toIso(regCloses),
    distances: distanceList,
    tiers: cleanTiers,
    description: description.trim() || null,
    cover_path: coverPath,
    campaign_slug: campaignId ? "cause" : null,
  };

  const addChapter = async () => {
    const chapterName = (newChapter ?? "").trim();
    if (chapterName.length < 2) return;
    setChapterBusy(true);
    const result = await createChapter({ name: chapterName }).catch(() => ({ ok: false as const }));
    setChapterBusy(false);
    if (result.ok && "chapter" in result && result.chapter) {
      setChapters((list) => [...list, result.chapter!]);
      setChapterId(result.chapter.id);
      setNewChapter(null);
    } else {
      setState("error");
    }
  };

  const submit = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    const startsIso = toIso(startsAt);
    if (!tiersValid || !startsIso || !chapterId) {
      setState("invalid");
      return;
    }
    setState("busy");
    const result = await saveEvent({
      id: event?.id,
      name,
      slug: slug || slugify(name),
      kind,
      challengeMetric: kind === "challenge" ? metric : null,
      chapterId,
      campaignId: campaignId || null,
      startsAt: startsIso,
      endsAt: toIso(endsAt),
      venue: venue.trim() || null,
      capacity: capacity.trim() === "" ? null : Number(capacity),
      registrationOpensAt: toIso(regOpens),
      registrationClosesAt: toIso(regCloses),
      distances: distanceList,
      priceTiers: cleanTiers.map((tier) => ({ ...tier, distance: tier.distance && distanceNamesNow.includes(tier.distance) ? tier.distance : null })),
      isPublished: published,
      description: description.trim() || null,
      offersShirts: kind === "social" ? false : offersShirts,
      coverPath,
      hosting,
      externalUrl: externalUrl.trim() || null,
      registrationMode,
      organizerName: organizerName.trim() || null,
      bibPolicy: weBuyBibs ? "we_buy" : "none",
      bibCapacity: bibCapacity.trim() === "" ? null : Number(bibCapacity),
      maxGuests: maxGuests.trim() === "" ? 0 : Number(maxGuests),
    }).catch(() => ({ ok: false as const, error: "server" as const }));
    if (result.ok) {
      let offersFailed = false;
      if (!event && result.id && kind === "challenge") {
        const eventId = result.id;
        const saved = await Promise.all(
          pendingOffers.map((draft) => {
            const { supporterName, ...values } = draft;
            void supporterName;
            return savePerkChallenge({ ...values, eventId }).then((r) => r.ok).catch(() => false);
          }),
        );
        offersFailed = saved.some((ok) => !ok);
      }
      setState(offersFailed ? "error" : "saved");
      router.refresh();
      if (!event && result.id && kind === "challenge" && onCreated) onCreated(result.id);
      else onDone?.();
    } else {
      setState(result.error === "slug" ? "slug" : result.error === "invalid" ? "invalid" : "error");
    }
  };

  const section = "mt-6 border-t-[0.5px] border-line pt-5";

  return (
    <div>
    <form id={formId} onSubmit={submit}>
      {/* 1 — what kind of event; everything below follows from it */}
      <p className={labelClass}>{t("evKind")}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t("evKind")}>
        {KINDS.map((candidate) => (
          <button
            key={candidate}
            type="button"
            role="radio"
            aria-checked={kind === candidate}
            onClick={() => setKind(candidate)}
            className={`rounded-lg px-4 py-3 text-left transition-colors ${
              kind === candidate ? "bg-ink text-paper" : "bg-paper hover:bg-mist-2"
            }`}
          >
            <span className="block text-[15px] font-bold">{t(`evKind_${candidate}`)}</span>
            <span className={`mt-0.5 block text-[13px] ${kind === candidate ? "text-paper/70" : "text-black/60"}`}>
              {t(`evKindHint_${candidate}`)}
            </span>
          </button>
        ))}
      </div>

      {/* 2 — identity */}
      <div className={`${section} grid gap-4 sm:grid-cols-2`}>
        <div className="sm:col-span-2">
          <label htmlFor="evName" className={labelClass}>{t("evName")}</label>
          <input
            id="evName"
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="evSlug" className={labelClass}>{t("evSlug")}</label>
          <input
            id="evSlug"
            type="text"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className={`${inputClass} font-mono`}
          />
        </div>
        {kind === "challenge" ? (
          <div>
            <label htmlFor="evMetric" className={labelClass}>{t("evMetric")}</label>
            <select id="evMetric" value={metric} onChange={(e) => setMetric(e.target.value)} className={inputClass}>
              {METRICS.map((candidate) => (
                <option key={candidate} value={candidate}>{t(`evMetricValue.${candidate}`)}</option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <label htmlFor="evDescription" className={labelClass}>{t("evDescription")}</label>
          <textarea
            id="evDescription"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("evDescriptionHint")}
            className={inputClass}
          />
        </div>
      </div>

      {/* 3 — where it belongs */}
      <div className={`${section} grid gap-4 sm:grid-cols-2`}>
        <div>
          <label htmlFor="evChapter" className={labelClass}>{t("disbChapter")}</label>
          {newChapter === null ? (
            <>
              <select id="evChapter" required value={chapterId} onChange={(e) => setChapterId(e.target.value)} className={inputClass}>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>{chapter.name}</option>
                ))}
              </select>
              <button type="button" onClick={() => setNewChapter("")} className="mt-1.5 text-[13.5px] font-semibold text-sea underline underline-offset-2">
                {t("evNewChapter")}
              </button>
            </>
          ) : (
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={newChapter}
                onChange={(e) => setNewChapter(e.target.value)}
                placeholder={t("evChapterName")}
                aria-label={t("evChapterName")}
                className={`${inputClass} mt-0`}
              />
              <button type="button" disabled={chapterBusy} onClick={addChapter} className="shrink-0 rounded-lg bg-ink px-3 py-2 text-[14px] font-bold text-paper disabled:opacity-60">
                {t("evChapterCreate")}
              </button>
              <button type="button" onClick={() => setNewChapter(null)} className="shrink-0 rounded-lg bg-paper px-3 py-2 text-[14px] font-semibold">
                {t("cancel")}
              </button>
            </div>
          )}
        </div>
        <div>
          <label htmlFor="evCampaign" className={labelClass}>{t("evCampaign")}</label>
          <select id="evCampaign" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className={inputClass}>
            <option value="">{t("evCauseNone")}</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
            ))}
          </select>
          <p className="mt-1 text-[13px] text-black/55">{t("evCauseHint")}</p>
          <Link href="/admin/kampanje" className="mt-1.5 inline-block text-[13.5px] font-semibold text-sea underline underline-offset-2">
            {t("evNewCause")} →
          </Link>
          <p className="mt-1 text-[13px] text-black/55">{t("evCampaignHint")}</p>
        </div>
      </div>

      {/* 4 — when and where */}
      <div className={`${section} grid gap-4 sm:grid-cols-2`}>
        <DateTimeField id="evStarts" label={t("evStarts")} value={startsAt} onChange={setStartsAt} required />
        <DateTimeField id="evEnds" label={kind === "challenge" ? t("evEndsChallenge") : t("evEnds")} value={endsAt} onChange={setEndsAt} />
        <div>
          <label htmlFor="evVenue" className={labelClass}>{t("evVenue")}</label>
          <input id="evVenue" type="text" value={venue} onChange={(e) => setVenue(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="evCapacity" className={labelClass}>{t("evCapacity")}</label>
          <input id="evCapacity" type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} className={`${inputClass} font-mono`} />
        </div>
      </div>

      {/* 5 — taking part */}
      <div className={`${section} grid gap-4 sm:grid-cols-2`}>
        <DateTimeField id="evRegOpens" label={t("evRegOpens")} value={regOpens} onChange={setRegOpens} />
        <DateTimeField id="evRegCloses" label={t("evRegCloses")} value={regCloses} onChange={setRegCloses} />
        {kind === "race" ? (
          <>
            <div>
              <label htmlFor="evHosting" className={labelClass}>{t("evHosting")}</label>
              <select id="evHosting" value={hosting} onChange={(e) => setHosting(e.target.value as "own" | "external")} className={inputClass}>
                <option value="own">{t("evHostingOwn")}</option>
                <option value="external">{t("evHostingExternal")}</option>
              </select>
            </div>
            {hosting === "external" ? (
              <>
                <div>
                  <label htmlFor="evOrganizer" className={labelClass}>{t("evOrganizerName")}</label>
                  <input id="evOrganizer" value={organizerName} onChange={(e) => setOrganizerName(e.target.value)} maxLength={120} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="evExternalUrl" className={labelClass}>{t("evExternalUrl")}</label>
                  <input id="evExternalUrl" type="url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://" className={inputClass} />
                </div>
                <div>
                  <label htmlFor="evRegMode" className={labelClass}>{t("evRegMode")}</label>
                  <select id="evRegMode" value={registrationMode} onChange={(e) => setRegistrationMode(e.target.value as "organizer" | "here")} className={inputClass}>
                    <option value="organizer">{t("evRegModeOrganizer")}</option>
                    <option value="here">{t("evRegModeHere")}</option>
                  </select>
                  <p className="mt-1 text-[13px] text-black/55">{registrationMode === "here" ? t("evRegModeHereHint") : t("evRegModeOrganizerHint")}</p>
                </div>
                {registrationMode === "here" ? (
                <label className="flex items-start gap-2.5 text-[14.5px]">
                  <input type="checkbox" checked={weBuyBibs} onChange={(e) => setWeBuyBibs(e.target.checked)} className="mt-0.5 h-4 w-4 accent-red" />
                  <span>
                    <span className="font-semibold">{t("evBibs")}</span>
                    <span className="block text-[13px] text-black/55">{t("evBibsHint")}</span>
                  </span>
                </label>
                ) : null}
                {registrationMode === "here" && weBuyBibs ? (
                  <div>
                    <label htmlFor="evBibCapacity" className={labelClass}>{t("evBibCapacity")}</label>
                    <input id="evBibCapacity" type="number" min={0} value={bibCapacity} onChange={(e) => setBibCapacity(e.target.value)} className={`${inputClass} font-mono`} />
                  </div>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
        {kind === "social" ? (
          <div>
            <label htmlFor="evMaxGuests" className={labelClass}>{t("evMaxGuests")}</label>
            <input id="evMaxGuests" type="number" min={0} max={20} value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} className={`${inputClass} font-mono`} />
            <p className="mt-1 text-[13px] text-black/55">{t("evMaxGuestsHint")}</p>
          </div>
        ) : null}
        {kind === "race" ? (
          <div className="sm:col-span-2">
            <p className={labelClass}>{t("evDistances")}</p>
            <p className="text-[13px] text-black/55">{t("evDistancesHint")}</p>
            <div className="mt-2 space-y-2">
              {distances.length > 0 ? (
                <div className="hidden gap-2 text-[13px] font-semibold text-black/60 sm:grid sm:grid-cols-[minmax(0,1fr)_7rem_2.5rem]">
                  <span>{t("evDistanceName")}</span>
                  <span>{t("evDistancePlaces")}</span>
                  <span />
                </div>
              ) : null}
              {distances.map((row, index) => (
                <div key={index} className="grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_2.5rem]">
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => {
                      const next = e.target.value;
                      const previous = row.name;
                      setDistances((rows) => rows.map((r, i) => (i === index ? { ...r, name: next } : r)));
                      // A price tied to this distance follows its new name.
                      setTiers((rows) => rows.map((r) => (r.distance === previous && previous !== "" ? { ...r, distance: next } : r)));
                    }}
                    placeholder={t("evDistanceName")}
                    aria-label={t("evDistanceName")}
                    className={`${inputClass} mt-0 min-w-0`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setDistances((rows) => rows.filter((_, i) => i !== index));
                      setTiers((rows) => rows.map((r) => (r.distance === row.name ? { ...r, distance: "" } : r)));
                    }}
                    aria-label={t("evRemoveDistance")}
                    title={t("evRemoveDistance")}
                    className="h-10 w-10 shrink-0 rounded-lg bg-paper text-[18px] leading-none hover:bg-mist-2 hover:text-red-dark sm:order-last"
                  >
                    ×
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={row.capacity}
                    onChange={(e) => setDistances((rows) => rows.map((r, i) => (i === index ? { ...r, capacity: e.target.value } : r)))}
                    placeholder="—"
                    aria-label={t("evDistancePlaces")}
                    className={`${inputClass} mt-0 min-w-0 font-mono`}
                  />
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setDistances((rows) => [...rows, { name: "", capacity: "" }])} className="mt-2 rounded-lg bg-paper px-3.5 py-2 text-[14px] font-semibold hover:bg-mist-2">
              {t("evAddDistance")}
            </button>
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <p className={labelClass}>{kind === "social" ? t("evTiersTickets") : t("evTiers")}</p>
          <p className="text-[13px] text-black/55">{t("evTiersHint")}</p>
          <div className="mt-2 space-y-2">
            {tiers.length > 0 ? (
              <div className={`hidden gap-2 text-[13px] font-semibold text-black/60 sm:grid ${tierCols}`}>
                <span>{t("evTierLabel")}</span>
                {withDistances ? <span>{t("evTierDistance")}</span> : null}
                <span>{t("evTierPrice")}</span>
                <span>{t("evTierUntil")}</span>
                <span />
              </div>
            ) : null}
            {tiers.map((tier, index) => (
              <div key={index} className={`grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-2 sm:grid ${tierCols}`}>
                <input
                  type="text"
                  value={tier.label}
                  onChange={(e) => setTiers((rows) => rows.map((r, i) => (i === index ? { ...r, label: e.target.value } : r)))}
                  placeholder={t("evTierLabel")}
                  aria-label={t("evTierLabel")}
                  className={`${inputClass} mt-0 min-w-0`}
                />
                <button
                  type="button"
                  onClick={() => setTiers((rows) => rows.filter((_, i) => i !== index))}
                  aria-label={t("evRemoveTier")}
                  title={t("evRemoveTier")}
                  className="h-10 w-10 shrink-0 rounded-lg bg-paper text-[18px] leading-none hover:bg-mist-2 hover:text-red-dark sm:order-last"
                >
                  ×
                </button>
                {withDistances ? (
                  <select
                    value={distanceNamesNow.includes(tier.distance) ? tier.distance : ""}
                    onChange={(e) => setTiers((rows) => rows.map((r, i) => (i === index ? { ...r, distance: e.target.value } : r)))}
                    aria-label={t("evTierDistance")}
                    className={`${inputClass} mt-0 min-w-0`}
                  >
                    <option value="">{t("evTierAllDistances")}</option>
                    {distanceNamesNow.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                ) : null}
                <span className="flex items-center gap-1">
                  <span aria-hidden className="text-black/50">€</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={tier.euros}
                    onChange={(e) => setTiers((rows) => rows.map((r, i) => (i === index ? { ...r, euros: e.target.value } : r)))}
                    placeholder="0"
                    aria-label={t("evTierPrice")}
                    className={`${inputClass} mt-0 min-w-0 font-mono`}
                  />
                </span>
                <DateTimeField
                  id={`${formId}-tier-${index}`}
                  mode="date"
                  hideLabel
                  label={t("evTierUntil")}
                  value={tier.until}
                  onChange={(next) => setTiers((rows) => rows.map((r, i) => (i === index ? { ...r, until: next } : r)))}
                />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setTiers((rows) => [...rows, { label: "", euros: "", until: "", distance: "" }])} className="mt-2 rounded-lg bg-paper px-3.5 py-2 text-[14px] font-semibold hover:bg-mist-2">
            {t("evAddTier")}
          </button>
        </div>
        {kind !== "social" ? (
          <label className="flex items-start gap-2.5 text-[14.5px] sm:col-span-2">
            <input type="checkbox" checked={offersShirts} onChange={(e) => setOffersShirts(e.target.checked)} className="mt-0.5 h-4 w-4 accent-red" />
            <span>
              <span className="font-semibold">{t("evShirts")}</span>
              <span className="block text-[13px] text-black/55">{t("evShirtsHint")}</span>
            </span>
          </label>
        ) : null}
      </div>

      <div className={section}>
        <CoverField value={coverPath} onChange={setCoverPath} folder={coverFolder} />
      </div>

      <label className={`${section} flex items-center gap-2 text-[14.5px]`}>
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4 accent-red" />
        {t("evPublished")}
      </label>

      {state === "error" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("actionError")}</p> : null}
      {state === "slug" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("evSlugTaken")}</p> : null}
      {state === "invalid" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("evInvalid")}</p> : null}
      {state === "saved" ? <p className="mt-3 text-[14px] font-semibold text-sea">{t("postSaved")}</p> : null}

      <PreviewFrame liveHref={event?.is_published ? `/dogadjaji/${event.slug}` : null}>
        <EventPageView event={previewEvent} preview />
      </PreviewFrame>
    </form>

    {/* Sections with their own forms live beside the main form, never inside it. */}
    {kind === "challenge" ? (
      <div className={section}>
        <p className={labelClass}>{t("evOffersHeading")}</p>
        <p className="text-[13px] text-black/55">{t("evOffersHint")}</p>
        <div className="mt-3">
          {event?.id ? (
            <OffersPanel eventId={event.id} eventName={event.name} challenges={offers} supporters={supporters} />
          ) : (
            <div className="space-y-2">
              {pendingOffers.length > 0 ? (
                <ul className="space-y-1.5">
                  {pendingOffers.map((draft, index) => (
                    <li key={`${draft.slug}-${index}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-paper px-3.5 py-2.5 text-[14px]">
                      <span className="font-semibold">{draft.title}</span>
                      <span className="text-black/60">{draft.supporterName} · {draft.rewardLabel}</span>
                      <span className="rounded-full bg-mist px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-black/60">{t("evOfferPending")}</span>
                      <button type="button" onClick={() => setPendingOffers((list) => list.filter((_, i) => i !== index))} className="ml-auto text-[13px] font-semibold text-red-dark underline underline-offset-2">
                        {t("evRemoveTier")}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {offerFormOpen ? (
                <OfferForm
                  eventId=""
                  eventName={name}
                  challenge={null}
                  supporters={supporters}
                  onDone={() => setOfferFormOpen(false)}
                  onQueue={(draft) => setPendingOffers((list) => [...list, draft])}
                />
              ) : (
                <button type="button" onClick={() => setOfferFormOpen(true)} className="rounded-lg bg-paper px-3.5 py-2 text-[14px] font-semibold hover:bg-mist-2">
                  + {t("offerNew")}
                </button>
              )}
              <p className="text-[13px] text-black/55">{t("evOffersQueuedHint")}</p>
            </div>
          )}
        </div>
      </div>
    ) : null}

    {event?.id ? (
      <div className={section}>
        <p className={labelClass}>{t("galleryHeading")}</p>
        <p className="text-[13px] text-black/55">{t("galleryHint")}</p>
        <div className="mt-3">
          <GalleryManager items={gallery} scope={{ eventId: event.id }} inline />
        </div>
      </div>
    ) : null}

    <div className="sticky bottom-0 -mx-5 mt-6 flex gap-2 border-t-[0.5px] border-black/25 bg-mist px-5 py-3 sm:-mx-6 sm:px-6">
      <button type="submit" form={formId} disabled={state === "busy"} className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60">
        {event ? t("evSave") : t("evCreate")}
      </button>
      {onDone ? (
        <button type="button" onClick={onDone} className="rounded-lg bg-paper px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:bg-mist-2">
          {t("cancel")}
        </button>
      ) : null}
      {extra ? <span className="ml-auto flex flex-wrap items-center gap-2">{extra}</span> : null}
    </div>
    </div>
  );
}
