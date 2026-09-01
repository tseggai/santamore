"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  deleteActivity,
  logActivity,
} from "@/app/[locale]/dashboard/(protected)/actions";
import { formatMetricValue, type ChallengeMetric } from "@/lib/metrics";
import type { Locale } from "@/i18n/routing";

export interface ActivityEntry {
  id: string;
  started_at: string;
  distance_m: number;
  moving_time_s: number;
  source: string;
}

/** Manual activity logging for challenge events, plus the running total. */
export function ActivityLog({
  metric,
  activities,
}: {
  metric: ChallengeMetric;
  activities: ActivityEntry[];
}) {
  const t = useTranslations("dashboard");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [km, setKm] = useState("");
  const [minutes, setMinutes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");

  const totals = {
    distance_m: activities.reduce((sum, a) => sum + a.distance_m, 0),
    moving_time_s: activities.reduce((sum, a) => sum + a.moving_time_s, 0),
    activity_count: activities.length,
    elevation_m: 0,
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("busy");
    const result = await logActivity({ km, minutes, date }).catch(() => ({
      ok: false,
    }));
    if (result.ok) {
      setKm("");
      setMinutes("");
      setState("idle");
      router.refresh();
    } else {
      setState("error");
    }
  };

  const remove = async (id: string) => {
    await deleteActivity({ id }).catch(() => null);
    router.refresh();
  };

  const inputClass =
    "mt-1 w-full rounded-[11px] border-[1.5px] border-line px-3 py-2.5 font-mono text-[14px] tabular-nums outline-none focus:border-sea";

  return (
    <div className="mt-6 rounded-brand border-[1.5px] border-line px-4 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[14px] font-bold">{t("activityHeading")}</p>
        <p className="font-mono text-[15px] font-medium tabular-nums text-sea">
          {formatMetricValue(totals[metric], metric, locale)}
        </p>
      </div>
      <p className="mt-1 text-[12.5px] text-ink/60">{t("activitySub")}</p>

      <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-2">
        <label className="w-24 text-[12px] font-semibold">
          {t("activityKm")}
          <input
            type="text"
            inputMode="decimal"
            value={km}
            onChange={(event) => setKm(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="w-24 text-[12px] font-semibold">
          {t("activityMinutes")}
          <input
            type="text"
            inputMode="numeric"
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="text-[12px] font-semibold">
          {t("activityDate")}
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={state === "busy" || (km.trim() === "" && minutes.trim() === "")}
          className="rounded-xl bg-sea px-4 py-2.5 text-[13px] font-bold text-paper transition-colors hover:bg-sea-2 disabled:opacity-60"
        >
          {t("activitySubmit")}
        </button>
      </form>
      {state === "error" ? (
        <p role="alert" className="mt-2 text-[12.5px] font-semibold text-red-dark">
          {t("actionError")}
        </p>
      ) : null}

      {activities.length > 0 ? (
        <ul className="mt-3">
          {activities.slice(0, 8).map((activity) => (
            <li
              key={activity.id}
              className="flex items-baseline justify-between gap-3 border-t border-line-soft py-2 text-[12.5px]"
            >
              <span className="font-mono tabular-nums text-ink/60">
                {activity.started_at.slice(0, 10)}
              </span>
              <span className="flex-1 font-mono tabular-nums">
                {activity.distance_m > 0
                  ? formatMetricValue(activity.distance_m, "distance_m", locale)
                  : null}
                {activity.distance_m > 0 && activity.moving_time_s > 0 ? " · " : null}
                {activity.moving_time_s > 0
                  ? formatMetricValue(activity.moving_time_s, "moving_time_s", locale)
                  : null}
              </span>
              {activity.source === "manual" ? (
                <button
                  type="button"
                  onClick={() => remove(activity.id)}
                  className="text-[11.5px] font-semibold text-ink/50 transition-colors hover:text-red-dark"
                >
                  {t("activityDelete")}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
