"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createFundraiserPage } from "@/app/[locale]/dashboard/(protected)/actions";

export interface EventChoice {
  slug: string;
  name: string;
  dateLabel: string;
  /** The runner already has a page for this cause: shown, not selectable. */
  taken?: boolean;
}

/**
 * First step of the fundraiser flow: your name (the page is you — it's
 * what donors and the leaderboard see) and, when more than one event is
 * open, which event you're raising for. Photo, story and goal follow in
 * the editor.
 */
export function CreatePageForm({
  locale,
  defaultName,
  events,
  defaultEventSlug,
  joinTeamId = null,
  onCreated,
}: {
  locale: string;
  defaultName: string;
  events: EventChoice[];
  defaultEventSlug: string | null;
  /** Open the new page's editor with this team preselected. */
  joinTeamId?: string | null;
  /** Hub mode: hand the new slug back instead of navigating. */
  onCreated?: (slug: string) => void;
}) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [title, setTitle] = useState(defaultName);
  const open = events.filter((event) => !event.taken);
  // Preselect only what the runner arrived with; otherwise they choose.
  const [eventSlug, setEventSlug] = useState(
    defaultEventSlug && open.some((event) => event.slug === defaultEventSlug) ? defaultEventSlug : "",
  );
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const blocked = events.length === 0 ? "none" : open.length === 0 ? "taken" : "";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("busy");
    const result = await createFundraiserPage({
      title,
      causeSlug: eventSlug || null,
    }).catch(() => ({ ok: false as const, slug: undefined }));
    if (result.ok && result.slug) {
      if (onCreated && !joinTeamId) {
        onCreated(result.slug);
        return;
      }
      router.push(
        `/${locale}/dashboard/stranice/${result.slug}${joinTeamId ? `?team=${joinTeamId}` : ""}`,
      );
    } else {
      setState("error");
    }
  };

  const inputClass =
    "mt-1 w-full rounded-lg border-[1.5px] border-line bg-paper px-3.5 py-3 text-[16px] outline-none focus:border-sea";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="pageTitle" className="text-[14px] font-semibold">
          {t("nameLabel")}
        </label>
        <input
          id="pageTitle"
          type="text"
          required
          minLength={2}
          maxLength={80}
          autoComplete="name"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-[13.5px] text-black/55">{t("nameHint")}</p>
      </div>
      <div>
        <label htmlFor="pageEvent" className="text-[14px] font-semibold">
          {t("causeLabel")}
        </label>
        <select
          id="pageEvent"
          required
          value={eventSlug}
          disabled={blocked !== ""}
          onChange={(event) => setEventSlug(event.target.value)}
          className={`${inputClass} disabled:opacity-60`}
        >
          <option value="">{t("causeChoose")}</option>
          {events.map((event) => (
            <option key={event.slug} value={event.slug} disabled={event.taken}>
              {event.name}
              {event.dateLabel ? ` · ${event.dateLabel}` : ""}
              {event.taken ? ` — ${t("causeTaken")}` : ""}
            </option>
          ))}
        </select>
        {blocked ? (
          <p className="mt-2 text-[14px] font-semibold text-black/65">
            {blocked === "none" ? t("createNoEvents") : t("createAllTaken")}
          </p>
        ) : null}
      </div>
      {state === "error" ? (
        <p role="alert" className="text-[14px] font-semibold text-red-dark">
          {t("actionError")}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={state === "busy" || blocked !== "" || eventSlug === ""}
        className="w-full rounded-lg bg-red px-6 py-3.5 text-[16px] font-bold text-paper transition-colors hover:bg-red-dark disabled:opacity-60"
      >
        {t("createSubmit")}
      </button>
    </form>
  );
}
