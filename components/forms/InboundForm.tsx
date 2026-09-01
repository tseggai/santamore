"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { submitInbound } from "@/lib/inbound/actions";
import type { Locale } from "@/i18n/routing";

type InboundKind = "contact" | "volunteer" | "partner" | "newsletter";

/**
 * The one form behind /kontakt, /volontiraj, the partner enquiry and the
 * newsletter signup — fields vary by kind, everything lands in
 * inbound_messages. Includes the honeypot field (visually hidden, tempting
 * to bots).
 */
export function InboundForm({
  kind,
  compact = false,
}: {
  kind: InboundKind;
  /** Newsletter-style single-row layout. */
  compact?: boolean;
}) {
  const t = useTranslations("forms");
  const locale = useLocale() as Locale;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const showName = kind !== "newsletter";
  const showPhone = kind === "contact" || kind === "volunteer";
  const showMessage = kind === "contact" || kind === "partner";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("busy");
    const result = await submitInbound({
      kind,
      name: name || undefined,
      email,
      phone: phone || undefined,
      message: message || undefined,
      locale,
      website,
    }).catch(() => ({ ok: false }));
    setState(result.ok ? "done" : "error");
  };

  const inputClass =
    "w-full rounded-[11px] border-[1.5px] border-line bg-paper px-3.5 py-3 text-[15px] outline-none focus:border-sea";
  const labelClass = "text-[13px] font-semibold";

  if (state === "done") {
    return (
      <p
        role="status"
        className="rounded-brand border-[1.5px] border-dashed border-sea bg-mist px-5 py-4 text-[14px] text-sea"
      >
        {t(`success_${kind}`)}
      </p>
    );
  }

  if (compact) {
    return (
      <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
        <label htmlFor={`inb-${kind}-email`} className="sr-only">
          {t("emailLabel")}
        </label>
        <input
          id={`inb-${kind}-email`}
          type="email"
          required
          autoComplete="email"
          placeholder={t("emailLabel")}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={`${inputClass} max-w-xs flex-1`}
        />
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          className="absolute -left-[9999px] h-px w-px opacity-0"
        />
        <button
          type="submit"
          disabled={state === "busy"}
          className="rounded-xl bg-sea px-5 py-3 text-[14px] font-bold text-paper transition-colors hover:bg-sea-2 disabled:opacity-60"
        >
          {t("submit")}
        </button>
        {state === "error" ? (
          <p role="alert" className="w-full text-[13px] font-semibold text-red-dark">
            {t("error")}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-lg space-y-3">
      {showName ? (
        <div>
          <label htmlFor={`inb-${kind}-name`} className={labelClass}>
            {t("nameLabel")}
          </label>
          <input
            id={`inb-${kind}-name`}
            type="text"
            required
            autoComplete="name"
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </div>
      ) : null}
      <div>
        <label htmlFor={`inb-${kind}-email2`} className={labelClass}>
          {t("emailLabel")}
        </label>
        <input
          id={`inb-${kind}-email2`}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={`mt-1 ${inputClass}`}
        />
      </div>
      {showPhone ? (
        <div>
          <label htmlFor={`inb-${kind}-phone`} className={labelClass}>
            {t("phoneLabel")}
          </label>
          <input
            id={`inb-${kind}-phone`}
            type="tel"
            autoComplete="tel"
            maxLength={40}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </div>
      ) : null}
      {showMessage ? (
        <div>
          <label htmlFor={`inb-${kind}-msg`} className={labelClass}>
            {t("messageLabel")}
          </label>
          <textarea
            id={`inb-${kind}-msg`}
            required
            rows={5}
            minLength={5}
            maxLength={2000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </div>
      ) : null}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        className="absolute -left-[9999px] h-px w-px opacity-0"
      />
      {state === "error" ? (
        <p role="alert" className="text-[13px] font-semibold text-red-dark">
          {t("error")}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={state === "busy"}
        className="w-full rounded-xl bg-red px-6 py-3.5 text-[15px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark disabled:opacity-60"
      >
        {state === "busy" ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
