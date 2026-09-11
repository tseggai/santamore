"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { saveEvent } from "@/app/[locale]/admin/(protected)/dogadjaji/actions";
import { PreviewFrame } from "@/components/admin/PreviewFrame";
import { EventPageView } from "@/components/events/EventPageView";
import { slugify } from "@/lib/slug";

export interface EventFormValues {
  id?: string;
  name: string;
  slug: string;
  kind: "race" | "challenge";
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
}

export interface Option {
  id: string;
  name: string;
}

const METRICS = ["distance_m", "moving_time_s", "activity_count", "elevation_m"] as const;

/** ISO → the browser-local "YYYY-MM-DDTHH:mm" a datetime-local input wants. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function toIso(local: string): string | null {
  if (!local) return null;
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** "label | 15" per line → [{label, amount_cents}]; euros to cents, no floats. */
function parseTiers(text: string): { label: string; amount_cents: number }[] | null {
  const tiers: { label: string; amount_cents: number }[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const [label, amount] = line.split("|").map((part) => part.trim());
    if (!label || amount === undefined) return null;
    const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(amount.replace(/\s|€/g, ""));
    if (!match) return null;
    const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
    tiers.push({ label, amount_cents: cents });
  }
  return tiers;
}

function tiersToText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((tier) =>
      typeof tier?.label === "string" && typeof tier?.amount_cents === "number"
        ? `${tier.label} | ${(tier.amount_cents / 100).toFixed(2).replace(/\.00$/, "")}`
        : null,
    )
    .filter(Boolean)
    .join("\n");
}

const inputClass =
  "mt-1 w-full rounded-[10px] border-[1.5px] border-line bg-paper px-3 py-2.5 text-[15px] outline-none focus:border-sea";
const labelClass = "text-[13.5px] font-semibold";

export function EventForm({
  event,
  chapters,
  campaigns,
  onDone,
}: {
  event: EventFormValues | null;
  chapters: Option[];
  campaigns: Option[];
  onDone?: () => void;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [name, setName] = useState(event?.name ?? "");
  const [slug, setSlug] = useState(event?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(event));
  const [kind, setKind] = useState<"race" | "challenge">(event?.kind ?? "race");
  const [metric, setMetric] = useState(event?.challenge_metric ?? "distance_m");
  const [chapterId, setChapterId] = useState(event?.chapter_id ?? chapters[0]?.id ?? "");
  const [campaignId, setCampaignId] = useState(event?.campaign_id ?? "");
  const [startsAt, setStartsAt] = useState(toLocalInput(event?.starts_at ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(event?.ends_at ?? null));
  const [venue, setVenue] = useState(event?.venue ?? "");
  const [capacity, setCapacity] = useState(event?.capacity?.toString() ?? "");
  const [regOpens, setRegOpens] = useState(toLocalInput(event?.registration_opens_at ?? null));
  const [regCloses, setRegCloses] = useState(
    toLocalInput(event?.registration_closes_at ?? null),
  );
  const [distances, setDistances] = useState(
    Array.isArray(event?.distances) ? (event!.distances as string[]).join(", ") : "",
  );
  const [tiers, setTiers] = useState(tiersToText(event?.price_tiers));
  const [published, setPublished] = useState(event?.is_published ?? false);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error" | "slug" | "invalid">(
    "idle",
  );

  const previewEvent = {
    slug: slug || slugify(name) || "dogadjaj",
    name,
    kind,
    starts_at: toIso(startsAt),
    ends_at: toIso(endsAt),
    venue: venue.trim() || null,
    registration_opens_at: toIso(regOpens),
    registration_closes_at: toIso(regCloses),
    distances: distances
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
    tiers: parseTiers(tiers) ?? [],
  };

  const submit = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    const parsedTiers = parseTiers(tiers);
    const startsIso = toIso(startsAt);
    if (!parsedTiers || !startsIso) {
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
      distances: distances
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
      priceTiers: parsedTiers,
      isPublished: published,
    }).catch(() => ({ ok: false as const, error: "server" as const }));
    if (result.ok) {
      setState("saved");
      router.refresh();
      onDone?.();
    } else {
      setState(result.error === "slug" ? "slug" : result.error === "invalid" ? "invalid" : "error");
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-brand border-[1.5px] border-line bg-mist/40 p-4 sm:p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="evName" className={labelClass}>
            {t("evName")}
          </label>
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
          <label htmlFor="evSlug" className={labelClass}>
            {t("evSlug")}
          </label>
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
        <div>
          <label htmlFor="evKind" className={labelClass}>
            {t("evKind")}
          </label>
          <select
            id="evKind"
            value={kind}
            onChange={(e) => setKind(e.target.value as "race" | "challenge")}
            className={inputClass}
          >
            <option value="race">{t("evKindRace")}</option>
            <option value="challenge">{t("evKindChallenge")}</option>
          </select>
        </div>
        {kind === "challenge" ? (
          <div>
            <label htmlFor="evMetric" className={labelClass}>
              {t("evMetric")}
            </label>
            <select
              id="evMetric"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className={inputClass}
            >
              {METRICS.map((candidate) => (
                <option key={candidate} value={candidate}>
                  {t(`evMetricValue.${candidate}`)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div>
          <label htmlFor="evChapter" className={labelClass}>
            {t("disbChapter")}
          </label>
          <select
            id="evChapter"
            required
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
            className={inputClass}
          >
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="evCampaign" className={labelClass}>
            {t("evCampaign")}
          </label>
          <select
            id="evCampaign"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className={inputClass}
          >
            <option value="">—</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="evStarts" className={labelClass}>
            {t("evStarts")}
          </label>
          <input
            id="evStarts"
            type="datetime-local"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="evEnds" className={labelClass}>
            {t("evEnds")}
          </label>
          <input
            id="evEnds"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="evVenue" className={labelClass}>
            {t("evVenue")}
          </label>
          <input
            id="evVenue"
            type="text"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="evCapacity" className={labelClass}>
            {t("evCapacity")}
          </label>
          <input
            id="evCapacity"
            type="number"
            min={0}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className={`${inputClass} font-mono`}
          />
        </div>
        <div>
          <label htmlFor="evRegOpens" className={labelClass}>
            {t("evRegOpens")}
          </label>
          <input
            id="evRegOpens"
            type="datetime-local"
            value={regOpens}
            onChange={(e) => setRegOpens(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="evRegCloses" className={labelClass}>
            {t("evRegCloses")}
          </label>
          <input
            id="evRegCloses"
            type="datetime-local"
            value={regCloses}
            onChange={(e) => setRegCloses(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="evDistances" className={labelClass}>
            {t("evDistances")}
          </label>
          <input
            id="evDistances"
            type="text"
            value={distances}
            onChange={(e) => setDistances(e.target.value)}
            placeholder="5 km, 10 km"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="evTiers" className={labelClass}>
            {t("evTiers")}
          </label>
          <textarea
            id="evTiers"
            rows={3}
            value={tiers}
            onChange={(e) => setTiers(e.target.value)}
            placeholder={t("evTiersHint")}
            className={`${inputClass} font-mono`}
          />
        </div>
        <label className="flex items-center gap-2 text-[14.5px] sm:col-span-2">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="h-4 w-4 accent-red"
          />
          {t("evPublished")}
        </label>
      </div>

      {state === "error" ? (
        <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">
          {t("actionError")}
        </p>
      ) : null}
      {state === "slug" ? (
        <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">
          {t("evSlugTaken")}
        </p>
      ) : null}
      {state === "invalid" ? (
        <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">
          {t("evInvalid")}
        </p>
      ) : null}
      {state === "saved" ? (
        <p className="mt-3 text-[14px] font-semibold text-sea">{t("postSaved")}</p>
      ) : null}

      <PreviewFrame liveHref={event?.is_published ? `/dogadjaji/${event.slug}` : null}>
        <EventPageView event={previewEvent} preview />
      </PreviewFrame>

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={state === "busy"}
          className="rounded-xl bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {event ? t("evSave") : t("evCreate")}
        </button>
        {onDone ? (
          <button
            type="button"
            onClick={onDone}
            className="rounded-xl border-[1.5px] border-line px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:border-sea hover:text-sea"
          >
            {t("cancel")}
          </button>
        ) : null}
      </div>
    </form>
  );
}
