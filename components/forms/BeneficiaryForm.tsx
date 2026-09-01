"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { submitBeneficiaryApplication } from "@/lib/inbound/actions";
import type { Locale } from "@/i18n/routing";

const CATEGORIES = ["family", "children", "business", "organisation"] as const;

export function BeneficiaryForm() {
  const t = useTranslations("apply");
  const locale = useLocale() as Locale;

  const [applicantName, setApplicantName] = useState("");
  const [contact, setContact] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("family");
  const [amountRequested, setAmountRequested] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("busy");
    const result = await submitBeneficiaryApplication({
      applicantName,
      contact,
      category,
      amountRequested: amountRequested || undefined,
      description,
      locale,
      website,
    }).catch(() => ({ ok: false }));
    setState(result.ok ? "done" : "error");
  };

  const inputClass =
    "mt-1 w-full rounded-[11px] border-[1.5px] border-line bg-paper px-3.5 py-3 text-[15px] outline-none focus:border-sea";
  const labelClass = "text-[13px] font-semibold";

  if (state === "done") {
    return (
      <p
        role="status"
        className="rounded-brand border-[1.5px] border-dashed border-sea bg-mist px-5 py-4 text-[14px] text-sea"
      >
        {t("success")}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-lg space-y-3">
      <div>
        <label htmlFor="apName" className={labelClass}>
          {t("nameLabel")}
        </label>
        <input
          id="apName"
          type="text"
          required
          minLength={2}
          maxLength={100}
          value={applicantName}
          onChange={(event) => setApplicantName(event.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="apContact" className={labelClass}>
          {t("contactLabel")}
        </label>
        <input
          id="apContact"
          type="text"
          required
          minLength={5}
          maxLength={200}
          value={contact}
          onChange={(event) => setContact(event.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="apCategory" className={labelClass}>
          {t("categoryLabel")}
        </label>
        <select
          id="apCategory"
          value={category}
          onChange={(event) =>
            setCategory(event.target.value as (typeof CATEGORIES)[number])
          }
          className={inputClass}
        >
          {CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {t(`category_${value}`)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="apAmount" className={labelClass}>
          {t("amountLabel")}
        </label>
        <input
          id="apAmount"
          type="text"
          inputMode="decimal"
          maxLength={20}
          value={amountRequested}
          onChange={(event) => setAmountRequested(event.target.value)}
          className={`${inputClass} font-mono tabular-nums`}
        />
      </div>
      <div>
        <label htmlFor="apDesc" className={labelClass}>
          {t("descriptionLabel")}
        </label>
        <textarea
          id="apDesc"
          required
          rows={6}
          minLength={20}
          maxLength={4000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className={inputClass}
        />
      </div>
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
        {t("submit")}
      </button>
    </form>
  );
}
