"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import {
  registerStravaWebhook,
  savePerkChallenge,
  type PerkActionResult,
  type WebhookStatus,
} from "@/app/[locale]/admin/(protected)/izazovi/actions";
import { PerkRule } from "@/components/perks/PerkRule";
import { slugify } from "@/lib/slug";
import { Link } from "@/i18n/navigation";

export interface PerkChallengeAdminRow {
  id: string;
  slug: string;
  partner_name: string;
  title: string;
  description: string | null;
  reward_label: string;
  sport_types: string[];
  min_distance_m: number;
  max_moving_time_s: number | null;
  min_elevation_m: number;
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
  "mt-1 w-full rounded-[10px] border-[1.5px] border-line bg-paper px-3 py-2.5 text-[14px] outline-none focus:border-sea";
const labelClass = "text-[12.5px] font-semibold";

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}
function fromDateInput(value: string, endOfDay: boolean): string | null {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}+02:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function ChallengeForm({
  challenge,
  onDone,
}: {
  challenge: PerkChallengeAdminRow | null;
  onDone: () => void;
}) {
  const t = useTranslations("admin");
  const tPerks = useTranslations("perks");
  const router = useRouter();
  const [partner, setPartner] = useState(challenge?.partner_name ?? "");
  const [title, setTitle] = useState(challenge?.title ?? "");
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
  const preview = {
    sport_types: sports,
    min_distance_m: Number.isFinite(minDistanceM) ? minDistanceM : 0,
    max_moving_time_s: maxMin.trim() ? Number(maxMin) * 60 : null,
    min_elevation_m: Number(minElev) || 0,
    per_user_daily_cap: Number(perUser) || 1,
    daily_cap: dailyCap.trim() ? Number(dailyCap) : null,
    valid_days: Number(validDays) || 7,
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!Number.isFinite(minDistanceM) || sports.length === 0) {
      setState("invalid");
      return;
    }
    setState("busy");
    const result = await savePerkChallenge({
      id: challenge?.id,
      slug: slug || slugify(title),
      partnerName: partner,
      title,
      description: description.trim() || null,
      rewardLabel: reward,
      sportTypes: sports,
      minDistanceM,
      maxMovingTimeS: preview.max_moving_time_s,
      minElevationM: preview.min_elevation_m,
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
    <form onSubmit={submit} className="rounded-brand border-[1.5px] border-line bg-mist/40 p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pkPartner" className={labelClass}>{t("perkPartner")}</label>
          <input id="pkPartner" type="text" required value={partner} onChange={(e) => setPartner(e.target.value)} className={inputClass} />
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
                className={`cursor-pointer rounded-full border-[1.5px] px-3 py-1 text-[12.5px] font-semibold ${
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
          <p className="mt-1 text-[12px] text-ink/55">{t("perkPinHint")}</p>
        </div>
        <div className="space-y-2 pt-1">
          <label className="flex items-center gap-2 text-[13.5px]">
            <input type="checkbox" checked={allowManual} onChange={(e) => setAllowManual(e.target.checked)} className="h-4 w-4 accent-red" />
            {t("perkAllowManual")}
          </label>
          <label className="flex items-center gap-2 text-[13.5px]">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-red" />
            {t("perkActive")}
          </label>
        </div>
      </div>

      <p className="mt-4 rounded-[11px] bg-paper px-4 py-3 text-[13px] leading-relaxed text-ink/75">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/50">{t("perkRulePreview")}</span>
        <br />
        <PerkRule challenge={preview} />
      </p>

      {state === "error" ? <p role="alert" className="mt-3 text-[13px] font-semibold text-red-dark">{t("actionError")}</p> : null}
      {state === "slug" ? <p role="alert" className="mt-3 text-[13px] font-semibold text-red-dark">{t("evSlugTaken")}</p> : null}
      {state === "invalid" ? <p role="alert" className="mt-3 text-[13px] font-semibold text-red-dark">{t("perkInvalid")}</p> : null}

      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={state === "busy"} className="rounded-xl bg-ink px-5 py-2.5 text-[13.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60">
          {challenge ? t("evSave") : t("perkCreate")}
        </button>
        <button type="button" onClick={onDone} className="rounded-xl border-[1.5px] border-line px-4 py-2.5 text-[13.5px] font-semibold transition-colors hover:border-sea hover:text-sea">
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}

export function PerkChallengesManager({
  challenges,
  webhook,
}: {
  challenges: PerkChallengeAdminRow[];
  webhook: WebhookStatus;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [open, setOpen] = useState<"" | "new" | string>("");
  const [hookBusy, setHookBusy] = useState(false);
  const [hookNotice, setHookNotice] = useState("");

  const registered = webhook.subscriptions.some((s) => s.callback_url === webhook.expectedCallback);

  const register = async () => {
    setHookBusy(true);
    setHookNotice("");
    const result = await registerStravaWebhook().catch(
      (): PerkActionResult => ({ ok: false, error: "server" }),
    );
    setHookBusy(false);
    setHookNotice(result.ok ? t("webhookRegistered") : `${t("actionError")} ${result.message ?? ""}`.trim());
    router.refresh();
  };

  return (
    <div className="mt-5 space-y-6">
      {/* Strava wiring */}
      <div className="rounded-brand border-[1.5px] border-line-soft bg-mist/50 px-4 py-3.5">
        <p className="text-[13.5px] font-bold">{t("webhookHeading")}</p>
        {!webhook.configured ? (
          <p className="mt-1 text-[13px] text-ink/65">{t("webhookUnconfigured")}</p>
        ) : (
          <>
            <p className="mt-1 text-[13px] text-ink/65">
              {registered ? t("webhookOk") : t("webhookMissing")}{" "}
              <span className="font-mono text-[12px]">{webhook.expectedCallback}</span>
              {webhook.error ? <span className="block text-red-dark">{webhook.error}</span> : null}
            </p>
            {!registered ? (
              <button type="button" disabled={hookBusy} onClick={register} className="mt-2 rounded-lg border-[1.5px] border-line bg-paper px-3 py-1.5 text-[12.5px] font-semibold hover:border-sea hover:text-sea disabled:opacity-50">
                {hookBusy ? "…" : t("webhookRegister")}
              </button>
            ) : null}
            {hookNotice ? <p className="mt-2 text-[12.5px] font-semibold text-sea">{hookNotice}</p> : null}
          </>
        )}
      </div>

      {open === "new" ? (
        <ChallengeForm challenge={null} onDone={() => setOpen("")} />
      ) : (
        <button type="button" onClick={() => setOpen("new")} className="rounded-xl bg-red px-4 py-2.5 text-[13.5px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark">
          + {t("perkNew")}
        </button>
      )}

      {challenges.length === 0 ? (
        <p className="text-[13.5px] text-ink/60">{t("perkEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {challenges.map((challenge) => (
            <li key={challenge.id} className="rounded-brand border-[1.5px] border-line px-4 py-3.5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-bold">
                    {challenge.is_active ? (
                      <Link href={`/izazovi/${challenge.slug}`} className="hover:underline">{challenge.title}</Link>
                    ) : (
                      challenge.title
                    )}
                    <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${challenge.is_active ? "bg-sea text-paper" : "border border-line text-ink/60"}`}>
                      {challenge.is_active ? t("perkActiveBadge") : t("postDraft")}
                    </span>
                    {!challenge.has_pin ? (
                      <span className="rounded-full border border-red px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-red-dark">{t("perkNoPin")}</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-ink/60">
                    {challenge.partner_name} · {challenge.reward_label}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-ink/60">
                    <PerkRule challenge={challenge} />
                  </p>
                  <p className="mt-0.5 font-mono text-[12px] tabular-nums text-ink/60">
                    {t("perkStats", { today: challenge.issued_today, issued: challenge.issued, redeemed: challenge.redeemed })}
                  </p>
                </div>
                <button type="button" onClick={() => setOpen(open === challenge.id ? "" : challenge.id)} className="rounded-lg border-[1.5px] border-line px-2.5 py-1 text-[12px] font-semibold hover:border-sea hover:text-sea">
                  {t("evEdit")}
                </button>
              </div>
              {open === challenge.id ? (
                <div className="mt-3">
                  <ChallengeForm challenge={challenge} onDone={() => setOpen("")} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
