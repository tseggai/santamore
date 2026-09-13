"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { savePerkChallenge, setPerkChallengeActive } from "@/app/[locale]/admin/(protected)/izazovi/actions";
import { saveSupporter } from "@/app/[locale]/admin/(protected)/podrska/actions";
import { PerkRule, formatPace } from "@/components/perks/PerkRule";
import { slugify } from "@/lib/slug";
import { Link } from "@/i18n/navigation";

export interface PerkChallengeAdminRow {
  id: string;
  slug: string;
  partner_name: string;
  supporter_id: string | null;
  event_id: string | null;
  title: string;
  description: string | null;
  reward_label: string;
  sport_types: string[];
  min_distance_m: number;
  max_moving_time_s: number | null;
  min_elevation_m: number;
  max_pace_s_per_km: number | null;
  required_days: number;
  window_days: number | null;
  partner_url: string | null;
  allow_manual: boolean;
  per_user_daily_cap: number;
  daily_cap: number | null;
  valid_days: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  has_pin: boolean;
  issued: number;
  redeemed: number;
  issued_today: number;
}

const SPORTS = ["Run", "TrailRun", "VirtualRun", "Walk", "Hike", "Ride", "Swim"] as const;

const inputClass =
  "mt-1 w-full rounded-lg border-[1.5px] border-line bg-paper px-3 py-2.5 text-[15px] outline-none focus:border-sea";
const labelClass = "text-[13.5px] font-semibold";

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}
function fromDateInput(value: string, endOfDay: boolean): string | null {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}+02:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * One offer on a challenge: which supporter gives what, for which runs,
 * and the PIN they redeem with. Saved as a perk_challenges row bound to
 * the event.
 */
export function OfferForm({
  eventId,
  eventName,
  challenge,
  supporters: initialSupporters,
  onDone,
}: {
  eventId: string;
  eventName: string;
  challenge: PerkChallengeAdminRow | null;
  supporters: { id: string; name: string }[];
  onDone: () => void;
}) {
  const t = useTranslations("admin");
  const tPerks = useTranslations("perks");
  const router = useRouter();
  const [supporters, setSupporters] = useState(initialSupporters);
  const [supporterId, setSupporterId] = useState(challenge?.supporter_id ?? initialSupporters[0]?.id ?? "");
  const [newSupporter, setNewSupporter] = useState<string | null>(null);
  const [title, setTitle] = useState(challenge?.title ?? eventName);
  const [slug, setSlug] = useState(challenge?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(challenge));
  const [description, setDescription] = useState(challenge?.description ?? "");
  const [reward, setReward] = useState(challenge?.reward_label ?? "");
  const [sports, setSports] = useState<string[]>(challenge?.sport_types ?? ["Run", "TrailRun", "VirtualRun"]);
  const [minKm, setMinKm] = useState(challenge ? String(challenge.min_distance_m / 1000) : "5");
  const [maxMin, setMaxMin] = useState(
    challenge?.max_moving_time_s ? String(Math.round(challenge.max_moving_time_s / 60)) : "",
  );
  const [minElev, setMinElev] = useState(String(challenge?.min_elevation_m ?? 0));
  const [pace, setPace] = useState(
    challenge?.max_pace_s_per_km ? formatPace(challenge.max_pace_s_per_km) : "",
  );
  const [requiredDays, setRequiredDays] = useState(String(challenge?.required_days ?? 1));
  const [windowDays, setWindowDays] = useState(
    challenge?.window_days ? String(challenge.window_days) : "7",
  );
  const [partnerUrl, setPartnerUrl] = useState(challenge?.partner_url ?? "");
  const [allowManual, setAllowManual] = useState(challenge?.allow_manual ?? false);
  const [perUser, setPerUser] = useState(String(challenge?.per_user_daily_cap ?? 1));
  const [dailyCap, setDailyCap] = useState(challenge?.daily_cap ? String(challenge.daily_cap) : "5");
  const [validDays, setValidDays] = useState(String(challenge?.valid_days ?? 7));
  const [startsAt, setStartsAt] = useState(toDateInput(challenge?.starts_at ?? null));
  const [endsAt, setEndsAt] = useState(toDateInput(challenge?.ends_at ?? null));
  const [active, setActive] = useState(challenge?.is_active ?? false);
  const [pin, setPin] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "error" | "slug" | "invalid">("idle");

  const minDistanceM = Math.round(Number(minKm.replace(",", ".")) * 1000);
  // "5:00" or "5" → seconds per km; empty → no pace rule; garbage → NaN.
  const paceMatch = /^(\d{1,2})(?::([0-5]\d))?$/.exec(pace.trim());
  const paceS = pace.trim() === "" ? null : paceMatch ? Number(paceMatch[1]) * 60 + Number(paceMatch[2] ?? 0) : NaN;
  const preview = {
    sport_types: sports,
    min_distance_m: Number.isFinite(minDistanceM) ? minDistanceM : 0,
    max_moving_time_s: maxMin.trim() ? Number(maxMin) * 60 : null,
    min_elevation_m: Number(minElev) || 0,
    max_pace_s_per_km: paceS !== null && Number.isFinite(paceS) ? paceS : null,
    required_days: Number(requiredDays) || 1,
    window_days: windowDays.trim() ? Number(windowDays) : null,
    per_user_daily_cap: Number(perUser) || 1,
    daily_cap: dailyCap.trim() ? Number(dailyCap) : null,
    valid_days: Number(validDays) || 7,
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!Number.isFinite(minDistanceM) || sports.length === 0 || Number.isNaN(paceS) || !supporterId) {
      setState("invalid");
      return;
    }
    setState("busy");
    const result = await savePerkChallenge({
      id: challenge?.id,
      slug: slug || slugify(title),
      supporterId,
      eventId,
      title,
      description: description.trim() || null,
      rewardLabel: reward,
      sportTypes: sports,
      minDistanceM,
      maxMovingTimeS: preview.max_moving_time_s,
      minElevationM: preview.min_elevation_m,
      maxPaceSPerKm: preview.max_pace_s_per_km,
      requiredDays: preview.required_days,
      windowDays: preview.window_days,
      partnerUrl: partnerUrl.trim() || null,
      allowManual,
      perUserDailyCap: preview.per_user_daily_cap,
      dailyCap: preview.daily_cap,
      validDays: preview.valid_days,
      startsAt: fromDateInput(startsAt, false),
      endsAt: fromDateInput(endsAt, true),
      isActive: active,
      pin,
    }).catch(() => ({ ok: false as const, error: "server" as const }));
    if (result.ok) {
      router.refresh();
      onDone();
    } else {
      setState(result.error === "slug" ? "slug" : result.error === "invalid" ? "invalid" : "error");
    }
  };

  const toggleSport = (sport: string) =>
    setSports((current) =>
      current.includes(sport) ? current.filter((s) => s !== sport) : [...current, sport],
    );

  return (
    <form onSubmit={submit} className="rounded-lg bg-mist p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pkSupporter" className={labelClass}>{t("perkSupporter")}</label>
          {newSupporter === null ? (
            <>
              <select id="pkSupporter" required value={supporterId} onChange={(e) => setSupporterId(e.target.value)} className={inputClass}>
                <option value="">—</option>
                {supporters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button type="button" onClick={() => setNewSupporter("")} className="mt-1.5 text-[13.5px] font-semibold text-sea underline underline-offset-2">
                {t("suNewInline")}
              </button>
            </>
          ) : (
            <div className="mt-1 flex gap-2">
              <input type="text" value={newSupporter} onChange={(e) => setNewSupporter(e.target.value)} placeholder={t("suName")} aria-label={t("suName")} className={`${inputClass} mt-0`} />
              <button
                type="button"
                onClick={async () => {
                  const name = (newSupporter ?? "").trim();
                  if (name.length < 2) return;
                  const result = await saveSupporter({ name, website: null, contactName: null, contactEmail: null, contactPhone: null, notes: null, isActive: true }).catch(() => ({ ok: false as const }));
                  if (result.ok && "supporter" in result && result.supporter) {
                    setSupporters((list) => [...list, result.supporter!]);
                    setSupporterId(result.supporter.id);
                    setNewSupporter(null);
                  } else {
                    setState("error");
                  }
                }}
                className="shrink-0 rounded-lg bg-ink px-3 py-2 text-[14px] font-bold text-paper"
              >
                {t("evChapterCreate")}
              </button>
              <button type="button" onClick={() => setNewSupporter(null)} className="shrink-0 rounded-lg bg-paper px-3 py-2 text-[14px] font-semibold">{t("cancel")}</button>
            </div>
          )}
        </div>
        <div>
          <label htmlFor="pkReward" className={labelClass}>{t("perkReward")}</label>
          <input id="pkReward" type="text" required value={reward} onChange={(e) => setReward(e.target.value)} placeholder={t("perkRewardHint")} className={inputClass} />
        </div>
        <div>
          <label htmlFor="pkTitle" className={labelClass}>{t("postTitle")}</label>
          <input
            id="pkTitle"
            type="text"
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="pkSlug" className={labelClass}>{t("postSlug")}</label>
          <input
            id="pkSlug"
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
        <div className="sm:col-span-2">
          <label htmlFor="pkDescription" className={labelClass}>{t("campDescription")}</label>
          <textarea id="pkDescription" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
        </div>

        <fieldset className="sm:col-span-2">
          <legend className={labelClass}>{t("perkSports")}</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {SPORTS.map((sport) => (
              <label
                key={sport}
                className={`cursor-pointer rounded-full border-[1.5px] px-3 py-1 text-[13.5px] font-semibold ${
                  sports.includes(sport) ? "border-ink bg-ink text-paper" : "border-line"
                }`}
              >
                <input type="checkbox" className="sr-only" checked={sports.includes(sport)} onChange={() => toggleSport(sport)} />
                {tPerks(`sport.${sport}`)}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="pkMinKm" className={labelClass}>{t("perkMinKm")}</label>
          <input id="pkMinKm" type="text" inputMode="decimal" value={minKm} onChange={(e) => setMinKm(e.target.value)} className={`${inputClass} font-mono`} />
        </div>
        <div>
          <label htmlFor="pkMaxMin" className={labelClass}>{t("perkMaxMin")}</label>
          <input id="pkMaxMin" type="number" min={1} value={maxMin} onChange={(e) => setMaxMin(e.target.value)} placeholder="—" className={`${inputClass} font-mono`} />
        </div>
        <div>
          <label htmlFor="pkPace" className={labelClass}>{t("perkMaxPace")}</label>
          <input id="pkPace" type="text" inputMode="numeric" value={pace} onChange={(e) => setPace(e.target.value)} placeholder="5:00" className={`${inputClass} font-mono`} />
        </div>
        <div>
          <label htmlFor="pkDays" className={labelClass}>{t("perkRequiredDays")}</label>
          <input id="pkDays" type="number" min={1} value={requiredDays} onChange={(e) => setRequiredDays(e.target.value)} className={`${inputClass} font-mono`} />
        </div>
        <div>
          <label htmlFor="pkWindow" className={labelClass}>{t("perkWindowDays")}</label>
          <input id="pkWindow" type="number" min={1} value={windowDays} onChange={(e) => setWindowDays(e.target.value)} disabled={Number(requiredDays) <= 1} placeholder="—" className={`${inputClass} font-mono disabled:opacity-50`} />
          <p className="mt-1 text-[13px] text-black/55">{t("perkWindowHint")}</p>
        </div>
        <div>
          <label htmlFor="pkPartnerUrl" className={labelClass}>{t("perkPartnerUrl")}</label>
          <input id="pkPartnerUrl" type="url" value={partnerUrl} onChange={(e) => setPartnerUrl(e.target.value)} placeholder="https://" className={inputClass} />
        </div>
        <div>
          <label htmlFor="pkElev" className={labelClass}>{t("perkMinElev")}</label>
          <input id="pkElev" type="number" min={0} value={minElev} onChange={(e) => setMinElev(e.target.value)} className={`${inputClass} font-mono`} />
        </div>
        <div>
          <label htmlFor="pkValid" className={labelClass}>{t("perkValidDays")}</label>
          <input id="pkValid" type="number" min={1} value={validDays} onChange={(e) => setValidDays(e.target.value)} className={`${inputClass} font-mono`} />
        </div>
        <div>
          <label htmlFor="pkPerUser" className={labelClass}>{t("perkPerUser")}</label>
          <input id="pkPerUser" type="number" min={1} value={perUser} onChange={(e) => setPerUser(e.target.value)} className={`${inputClass} font-mono`} />
        </div>
        <div>
          <label htmlFor="pkDaily" className={labelClass}>{t("perkDailyCap")}</label>
          <input id="pkDaily" type="number" min={1} value={dailyCap} onChange={(e) => setDailyCap(e.target.value)} placeholder="—" className={`${inputClass} font-mono`} />
        </div>
        <div>
          <label htmlFor="pkStarts" className={labelClass}>{t("campStarts")}</label>
          <input id="pkStarts" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="pkEnds" className={labelClass}>{t("campEnds")}</label>
          <input id="pkEnds" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="pkPin" className={labelClass}>
            {challenge?.has_pin ? t("perkPinReset") : t("perkPin")}
          </label>
          <input
            id="pkPin"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{4,8}"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder={challenge?.has_pin ? "••••" : "4–8"}
            className={`${inputClass} font-mono`}
          />
          <p className="mt-1 text-[13px] text-black/55">{t("perkPinHint")}</p>
        </div>
        <div className="space-y-2 pt-1">
          <label className="flex items-center gap-2 text-[14.5px]">
            <input type="checkbox" checked={allowManual} onChange={(e) => setAllowManual(e.target.checked)} className="h-4 w-4 accent-red" />
            {t("perkAllowManual")}
          </label>
          <label className="flex items-center gap-2 text-[14.5px]">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-red" />
            {t("perkActive")}
          </label>
        </div>
      </div>

      <p className="mt-4 rounded-lg bg-paper px-4 py-3 text-[14px] leading-relaxed text-black/75">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-black/50">{t("perkRulePreview")}</span>
        <br />
        <PerkRule challenge={preview} />
      </p>

      {state === "error" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("actionError")}</p> : null}
      {state === "slug" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("evSlugTaken")}</p> : null}
      {state === "invalid" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("perkInvalid")}</p> : null}

      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={state === "busy"} className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60">
          {challenge ? t("evSave") : t("perkCreate")}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg bg-paper px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:bg-mist-2">
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}

/** The offers on one challenge event: list, pause/resume, edit, add. */
export function OffersPanel({
  eventId,
  eventName,
  challenges,
  supporters,
}: {
  eventId: string;
  eventName: string;
  challenges: PerkChallengeAdminRow[];
  supporters: { id: string; name: string }[];
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [open, setOpen] = useState<"" | "new" | string>("");
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const toggleActive = async (challenge: PerkChallengeAdminRow) => {
    setRowBusy(challenge.id);
    await setPerkChallengeActive({ id: challenge.id, active: !challenge.is_active }).catch(() => null);
    setRowBusy(null);
    router.refresh();
  };

  return (
    <div className="space-y-3">
      {open === "new" ? (
        <OfferForm eventId={eventId} eventName={eventName} challenge={null} supporters={supporters} onDone={() => setOpen("")} />
      ) : (
        <button type="button" onClick={() => setOpen("new")} className="rounded-lg bg-red px-4 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-red-dark">
          + {t("offerNew")}
        </button>
      )}

      {challenges.length === 0 ? (
        <p className="text-[14.5px] text-black/60">{t("offerEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {challenges.map((challenge) => (
            <li key={challenge.id} className="rounded-lg bg-paper px-4 py-3.5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[15.5px] font-bold">
                    {challenge.is_active ? (
                      <Link href={`/izazovi/${challenge.slug}`} className="hover:underline">{challenge.title}</Link>
                    ) : (
                      challenge.title
                    )}
                    <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${challenge.is_active ? "bg-sea text-paper" : "bg-mist text-black/60"}`}>
                      {challenge.is_active ? t("perkActiveBadge") : t("postDraft")}
                    </span>
                    {!challenge.has_pin ? (
                      <span className="rounded-full border border-red px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-red-dark">{t("perkNoPin")}</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[13.5px] text-black/60">
                    {challenge.partner_name} · {challenge.reward_label}
                  </p>
                  <p className="mt-0.5 text-[13.5px] text-black/60">
                    <PerkRule challenge={challenge} />
                  </p>
                  <p className="mt-0.5 font-mono text-[13px] tabular-nums text-black/60">
                    {t("perkStats", { today: challenge.issued_today, issued: challenge.issued, redeemed: challenge.redeemed })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" onClick={() => setOpen(open === challenge.id ? "" : challenge.id)} className="rounded-lg bg-mist px-2.5 py-1 text-[13px] font-semibold hover:bg-mist-2">
                    {t("evEdit")}
                  </button>
                  <button
                    type="button"
                    disabled={rowBusy === challenge.id || (!challenge.is_active && !challenge.has_pin)}
                    title={!challenge.is_active && !challenge.has_pin ? t("perkNoPin") : undefined}
                    onClick={() => toggleActive(challenge)}
                    className="rounded-lg bg-mist px-2.5 py-1 text-[13px] font-semibold hover:bg-mist-2 disabled:opacity-40"
                  >
                    {challenge.is_active ? t("perkPause") : t("perkResume")}
                  </button>
                </div>
              </div>
              {open === challenge.id ? (
                <div className="mt-3">
                  <OfferForm eventId={eventId} eventName={eventName} challenge={challenge} supporters={supporters} onDone={() => setOpen("")} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
