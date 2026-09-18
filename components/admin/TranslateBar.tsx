"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { translateFields } from "@/app/[locale]/admin/(protected)/translate-actions";
import { routing, type Locale } from "@/i18n/routing";

/**
 * "Written in <language> · translate into the others": takes the form's
 * fields in the language currently open and fills the other languages
 * with a draft. The drafts land in the form; saving is still the human's.
 */
export function TranslateBar({
  source,
  getFields,
  apply,
  className = "",
}: {
  /** The language the text was written in: the tab currently open. */
  source: Locale;
  /** The fields to translate, as they stand in the source language. */
  getFields: () => Record<string, string>;
  /** Receives one translated language at a time. */
  apply: (locale: Locale, fields: Record<string, string>) => void;
  className?: string;
}) {
  const t = useTranslations("admin");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [note, setNote] = useState<string | null>(null);
  const targets = routing.locales.filter((loc) => loc !== source) as Locale[];

  const run = async () => {
    const fields = getFields();
    if (Object.values(fields).every((v) => !v.trim())) {
      setState("error");
      setNote(t("translateEmpty"));
      return;
    }
    setState("busy");
    setNote(null);
    const results = await Promise.all(
      targets.map(async (to) => ({ to, result: await translateFields({ from: source, to, fields }).catch(() => ({ ok: false as const, error: "server" as const })) })),
    );
    const failed = results.filter((r) => !r.result.ok);
    for (const { to, result } of results) if (result.ok) apply(to, result.fields);
    if (failed.length === 0) {
      setState("done");
      setNote(t("translateDone", { languages: targets.map((l) => l.toUpperCase()).join(", ") }));
    } else {
      const first = failed[0].result as { error: string; detail?: string };
      setState("error");
      setNote(first.error === "unconfigured" ? t("translateUnconfigured") : `${t("translateFailed")}${first.detail ? ` (${first.detail})` : ""}`);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-paper px-3.5 py-2.5 text-[13.5px] ${className}`}>
      <span className="text-black/60">{t("translateWrittenIn", { language: t(`languageName.${source}`) })}</span>
      <button
        type="button"
        onClick={run}
        disabled={state === "busy"}
        className="rounded-lg bg-ink px-3 py-1.5 text-[13.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {state === "busy" ? t("translateBusy") : t("translateInto", { languages: targets.map((l) => l.toUpperCase()).join(" · ") })}
      </button>
      {note ? <span className={`${state === "error" ? "text-red-dark" : "text-sea"} font-semibold`} role="status">{note}</span> : null}
      <span className="basis-full text-[12.5px] text-black/45">{t("translateReview")}</span>
    </div>
  );
}
