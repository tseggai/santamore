"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { deleteProposal, proposeCause, updateProposal } from "@/app/[locale]/(site)/kampanje/predlozi/actions";
import { useDialog } from "@/components/console/useDialog";
import { centsToEuros } from "@/lib/money";
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
export interface ProposalDraft {
  id: string;
  title: string;
  summary: string;
  location: string | null;
  beneficiary: string | null;
  amountCents: number | null;
}

export function ProposeForm({
  criteria,
  edit = null,
  onSaved,
  onCancel,
  onDeleted,
}: {
  criteria: PublicCriterion[];
  /** Editing an existing proposal: the screening is behind it, only the wording changes. */
  edit?: ProposalDraft | null;
  onSaved?: () => void;
  onCancel?: () => void;
  /** The proposer withdrew it (same rule as an edit: open, no votes yet). */
  onDeleted?: () => void;
}) {
  const t = useTranslations("proposals");
  const tDonate = useTranslations("donate");
  const locale = useLocale() as Locale;
  const [answers, setAnswers] = useState<Record<string, boolean | undefined>>({});
  const [title, setTitle] = useState(edit?.title ?? "");
  const [summary, setSummary] = useState(edit?.summary ?? "");
  const [location, setLocation] = useState(edit?.location ?? "");
  const [beneficiary, setBeneficiary] = useState(edit?.beneficiary ?? "");
  const [amount, setAmount] = useState(edit?.amountCents != null ? centsToEuros(edit.amountCents).replace(/\.00$/, "") : "");
  const [state, setState] = useState<"idle" | "busy" | "error" | "done" | "rejected" | "locked">("idle");
  const [reasons, setReasons] = useState<string[]>([]);
  // Two screens: the questions, then — only once they pass — the proposal.
  // An edit starts on the second: the questions were answered already.
  const [step, setStep] = useState<1 | 2>(edit ? 2 : 1);
  const dialog = useDialog();

  const withdraw = async () => {
    if (!edit) return;
    if (!(await dialog.confirm(t("deleteConfirm"), { confirmLabel: t("delete") }))) return;
    setState("busy");
    const result = await deleteProposal({ proposalId: edit.id }).catch(() => ({ ok: false as const, error: "server" as const }));
    if (result.ok) {
      onDeleted?.();
      return;
    }
    setState(result.error === "voted" || result.error === "closed" ? "locked" : "error");
  };

  const answered = edit ? true : allAnswered(criteria, answers);
  const failed = edit ? [] : failedCriteria(criteria, answers);
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
    if (edit) {
      const saved = await updateProposal({
        proposalId: edit.id,
        title,
        summary,
        location: location.trim() || null,
        beneficiary: beneficiary.trim() || null,
        amountCents,
      }).catch(() => ({ ok: false as const, error: "server" as const }));
      if (saved.ok) {
        setState("done");
        onSaved?.();
      } else {
        setState(saved.error === "voted" || saved.error === "closed" ? "locked" : "error");
      }
      return;
    }
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
    setStep(1);
  };

  const fieldClass = "mt-1 w-full rounded-lg border-[1.5px] border-line bg-paper px-3.5 py-3 text-[16px] outline-none focus:border-sea";
  const labelClass = "text-[14px] font-semibold";
  const choice = (active: boolean) =>
    `rounded-lg px-4 py-2 text-[14.5px] font-semibold transition-colors ${active ? "bg-ink text-paper" : "bg-mist hover:bg-mist-2"}`;

  if (state === "locked") {
    return <p role="alert" className="rounded-lg bg-mist px-4 py-3 text-[14.5px] font-semibold text-red-dark">{t("editLocked")}</p>;
  }

  if (state === "done" && edit) {
    return <p role="status" className="rounded-lg bg-mist px-4 py-3 text-[14.5px] font-semibold text-sea">{t("editSaved")}</p>;
  }

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

  const stepLine = (
    <p className="font-mono text-[12px] text-red">
      {String(step).padStart(2, "0")} / 02
    </p>
  );

  if (step === 1) {
    return (
      <div className="space-y-5">
        {stepLine}
        <section>
          <h2 className="text-[16px] font-bold">{t("screeningHeading")}</h2>
          <p className="mt-1 text-[14px] leading-relaxed text-black/60">{t("screeningSub")}</p>
          <ol className="mt-4 space-y-4">
            {criteria.map((criterion, index) => (
              <li key={criterion.id} className="rounded-lg bg-paper px-4 py-3">
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
        <button
          type="button"
          disabled={!answered}
          onClick={() => setStep(2)}
          className="w-full rounded-lg bg-red px-6 py-3.5 text-[16px] font-bold text-paper transition-colors hover:bg-red-dark disabled:opacity-60 sm:w-auto"
        >
          {t("continue")} →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {dialog.element}
      {edit ? null : stepLine}
      <section>
        {edit ? <p className="text-[14px] leading-relaxed text-black/60">{t("editUntilVote")}</p> : <h2 className="text-[16px] font-bold">{t("detailsHeading")}</h2>}
        <div className="mt-3 space-y-4">
          <div>
            <label htmlFor="prTitle" className={labelClass}>{t("titleLabel")}</label>
            <input id="prTitle" type="text" required minLength={4} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="prSummary" className={labelClass}>{t("summaryLabel")}</label>
            <textarea id="prSummary" required minLength={40} maxLength={2000} rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} className={fieldClass} />
            <p className="mt-1 text-[13px] text-black/55">{t("summaryHint")}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="prLocation" className={labelClass}>{t("locationLabel")}</label>
              <input id="prLocation" type="text" maxLength={120} value={location} onChange={(e) => setLocation(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="prBeneficiary" className={labelClass}>{t("beneficiaryLabel")}</label>
              <input id="prBeneficiary" type="text" maxLength={200} value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} className={fieldClass} />
            </div>
          </div>
          <div>
            <label htmlFor="prAmount" className={labelClass}>{t("amountLabel")}</label>
            <input id="prAmount" type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${fieldClass} font-mono sm:max-w-xs`} />
            <p className="mt-1 text-[13px] text-black/55">{t("amountHint")}</p>
          </div>
        </div>
      </section>

      {state === "error" ? <p role="alert" className="text-[14px] font-semibold text-red-dark">{tDonate("errServer")}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={state === "busy"} className="rounded-lg bg-red px-6 py-3.5 text-[16px] font-bold text-paper transition-colors hover:bg-red-dark disabled:opacity-60">
          {edit ? t("editSave") : t("submit")}
        </button>
        {edit ? (
          <>
            <button type="button" onClick={onCancel} className="rounded-lg bg-paper px-5 py-3.5 text-[15px] font-semibold transition-colors hover:bg-mist-2">
              {t("editCancel")}
            </button>
            <button type="button" disabled={state === "busy"} onClick={() => void withdraw()} className="ml-auto rounded-lg px-4 py-3.5 text-[15px] font-semibold text-red-dark transition-colors hover:bg-mist-2 disabled:opacity-60">
              {t("delete")}
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setStep(1)} className="rounded-lg bg-paper px-5 py-3.5 text-[15px] font-semibold transition-colors hover:bg-mist-2">
            ← {t("back")}
          </button>
        )}
      </div>
    </form>
  );
}
