"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { proposeCause } from "@/app/[locale]/(site)/kampanje/predlozi/actions";
import { parseEurosToCents } from "@/lib/money";
import { allAnswered, failedCriteria } from "@/lib/proposals";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export interface PublicCriterion {
  id: string;
  question: string;
  disqualify_on: boolean;
  reason: string;
}

/**
 * Screening first — yes/no, judged as you go so a proposal we cannot take
 * on is turned down kindly before anyone writes three paragraphs — then
 * the proposal itself. The server judges again against the live criteria.
 */
export function ProposeForm({ criteria }: { criteria: PublicCriterion[] }) {
  const t = useTranslations("proposals");
  const tDonate = useTranslations("donate");
  const locale = useLocale() as Locale;
  const [answers, setAnswers] = useState<Record<string, boolean | undefined>>({});
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [location, setLocation] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [amount, setAmount] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "error" | "done" | "rejected">("idle");
  const [reasons, setReasons] = useState<string[]>([]);

  const answered = allAnswered(criteria, answers);
  const failed = failedCriteria(criteria, answers);
  const screenedOut = answered && failed.length > 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!answered || screenedOut) return;
    const amountCents = amount.trim() === "" ? null : parseEurosToCents(amount);
    if (amount.trim() !== "" && amountCents === null) {
      setState("error");
      return;
    }
    setState("busy");
    const result = await proposeCause({
      title,
      summary,
      location: location.trim() || null,
      beneficiary: beneficiary.trim() || null,
      amountCents,
      answers: Object.fromEntries(criteria.map((criterion) => [criterion.id, answers[criterion.id] === true])),
      locale,
    }).catch(() => ({ ok: false as const, error: "server" as const }));
    if (result.ok && result.rejected) {
      setReasons(result.rejected);
      setState("rejected");
    } else if (result.ok) {
      setState("done");
    } else {
      setState("error");
    }
  };

  const reset = () => {
    setAnswers({});
    setReasons([]);
    setState("idle");
  };

  const fieldClass = "mt-1 w-full rounded-lg border-[1.5px] border-line bg-paper px-3.5 py-3 text-[16px] outline-none focus:border-sea";
  const labelClass = "text-[14px] font-semibold";
  const choice = (active: boolean) =>
    `rounded-lg px-4 py-2 text-[14.5px] font-semibold transition-colors ${active ? "bg-ink text-paper" : "bg-paper hover:bg-mist-2"}`;

  if (state === "done") {
    return (
      <div className="rounded-lg bg-mist px-5 py-6">
        <h2 className="type-display text-2xl">{t("submitted")}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-black/70">{t("submittedSub")}</p>
        <Link href="/kampanje#prijedlozi" className="mt-4 inline-flex h-11 items-center rounded-lg bg-red px-6 text-[15.5px] font-bold text-paper hover:bg-red-dark">
          {t("viewList")}
        </Link>
      </div>
    );
  }

  if (state === "rejected" || screenedOut) {
    const shown = state === "rejected" ? reasons : failed.map((criterion) => criterion.reason);
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-mist px-5 py-6">
          <h2 className="type-display text-2xl">{t("notForUs")}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-black/70">{t("notForUsSub")}</p>
          <ul className="mt-4 space-y-2">
            {shown.map((reason) => (
              <li key={reason} className="flex gap-3 rounded-lg bg-paper px-4 py-3 text-[14.5px] leading-relaxed">
                <span className="font-mono text-[12px] text-red">•</span>
                {reason}
              </li>
            ))}
          </ul>
          <button type="button" onClick={reset} className="mt-5 rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper hover:opacity-90">
            {t("tryAnother")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="rounded-lg bg-mist px-5 py-5">
        <h2 className="text-[16px] font-bold">{t("screeningHeading")}</h2>
        <p className="mt-1 text-[14px] leading-relaxed text-black/60">{t("screeningSub")}</p>
        <ol className="mt-4 space-y-4">
          {criteria.map((criterion, index) => (
            <li key={criterion.id}>
              <p className="text-[15px] leading-relaxed">
                <span className="mr-2 font-mono text-[12px] text-red">{String(index + 1).padStart(2, "0")}</span>
                {criterion.question}
              </p>
              <div role="group" aria-label={criterion.question} className="mt-2 flex gap-1.5">
                <button type="button" aria-pressed={answers[criterion.id] === true} onClick={() => setAnswers((a) => ({ ...a, [criterion.id]: true }))} className={choice(answers[criterion.id] === true)}>
                  {t("yes")}
                </button>
                <button type="button" aria-pressed={answers[criterion.id] === false} onClick={() => setAnswers((a) => ({ ...a, [criterion.id]: false }))} className={choice(answers[criterion.id] === false)}>
                  {t("no")}
                </button>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={answered ? "" : "opacity-50"}>
        <h2 className="text-[16px] font-bold">{t("detailsHeading")}</h2>
        <div className="mt-3 space-y-4">
          <div>
            <label htmlFor="prTitle" className={labelClass}>{t("titleLabel")}</label>
            <input id="prTitle" type="text" required minLength={4} maxLength={120} disabled={!answered} value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="prSummary" className={labelClass}>{t("summaryLabel")}</label>
            <textarea id="prSummary" required minLength={40} maxLength={2000} rows={5} disabled={!answered} value={summary} onChange={(e) => setSummary(e.target.value)} className={fieldClass} />
            <p className="mt-1 text-[13px] text-black/55">{t("summaryHint")}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="prLocation" className={labelClass}>{t("locationLabel")}</label>
              <input id="prLocation" type="text" maxLength={120} disabled={!answered} value={location} onChange={(e) => setLocation(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="prBeneficiary" className={labelClass}>{t("beneficiaryLabel")}</label>
              <input id="prBeneficiary" type="text" maxLength={200} disabled={!answered} value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} className={fieldClass} />
            </div>
          </div>
          <div>
            <label htmlFor="prAmount" className={labelClass}>{t("amountLabel")}</label>
            <input id="prAmount" type="text" inputMode="decimal" disabled={!answered} value={amount} onChange={(e) => setAmount(e.target.value)} className={`${fieldClass} font-mono sm:max-w-xs`} />
            <p className="mt-1 text-[13px] text-black/55">{t("amountHint")}</p>
          </div>
        </div>
      </section>

      {state === "error" ? <p role="alert" className="text-[14px] font-semibold text-red-dark">{tDonate("errServer")}</p> : null}
      <button type="submit" disabled={!answered || state === "busy"} className="w-full rounded-lg bg-red px-6 py-3.5 text-[16px] font-bold text-paper transition-colors hover:bg-red-dark disabled:opacity-60 sm:w-auto">
        {t("submit")}
      </button>
    </form>
  );
}
