"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createFundraiserPage } from "@/app/[locale]/(site)/dashboard/(protected)/actions";

export interface EventChoice {
  slug: string;
  name: string;
  dateLabel: string;
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
}: {
  locale: string;
  defaultName: string;
  events: EventChoice[];
  defaultEventSlug: string | null;
}) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [title, setTitle] = useState(defaultName);
  const [eventSlug, setEventSlug] = useState(
    defaultEventSlug && events.some((event) => event.slug === defaultEventSlug)
      ? defaultEventSlug
      : (events[0]?.slug ?? ""),
  );
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("busy");
    const result = await createFundraiserPage({
      title,
      eventSlug: eventSlug || null,
    }).catch(() => ({ ok: false }));
    if (result.ok) {
      router.push(`/${locale}/dashboard/stranica`);
    } else {
      setState("error");
    }
  };

  const inputClass =
    "mt-1 w-full rounded-[11px] border-[1.5px] border-line bg-paper px-3.5 py-3 text-[15px] outline-none focus:border-sea";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="pageTitle" className="text-[13px] font-semibold">
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
        <p className="mt-1 text-[12.5px] text-ink/55">{t("nameHint")}</p>
      </div>
      {events.length > 1 ? (
        <div>
          <label htmlFor="pageEvent" className="text-[13px] font-semibold">
            {t("eventLabel")}
          </label>
          <select
            id="pageEvent"
            value={eventSlug}
            onChange={(event) => setEventSlug(event.target.value)}
            className={inputClass}
          >
            {events.map((event) => (
              <option key={event.slug} value={event.slug}>
                {event.name} · {event.dateLabel}
              </option>
            ))}
          </select>
        </div>
      ) : events.length === 1 ? (
        <p className="text-[13px] text-ink/65">
          {t("eventSingle", { name: events[0].name, date: events[0].dateLabel })}
        </p>
      ) : null}
      {state === "error" ? (
        <p role="alert" className="text-[13px] font-semibold text-red-dark">
          {t("actionError")}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={state === "busy"}
        className="w-full rounded-xl bg-red px-6 py-3.5 text-[15px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark disabled:opacity-60"
      >
        {t("createSubmit")}
      </button>
    </form>
  );
}
