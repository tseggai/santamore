"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { CreatePageForm, type EventChoice } from "@/components/dashboard/CreatePageForm";

const STEPS = ["fundraiseStep1", "fundraiseStep2", "fundraiseStep3"] as const;

/**
 * Three short screens for a first page — what the page is, how the money
 * moves, how to share it — then the form. A returning runner sees the
 * form straight away.
 */
export function FundraiseWalkthrough({
  locale,
  firstTime,
  defaultName,
  event,
}: {
  locale: string;
  firstTime: boolean;
  defaultName: string;
  event: EventChoice;
}) {
  const t = useTranslations("dashboard");
  const [step, setStep] = useState(firstTime ? 0 : STEPS.length);
  const done = step >= STEPS.length;

  return (
    <div className="mt-4">
      <p className="type-eyebrow text-sea/80">{event.name} · {event.dateLabel}</p>
      {done ? (
        <>
          <h1 className="type-display mt-2 text-3xl">{t("createHeading")}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-black/65">{t("createSub")}</p>
          <div className="mt-6">
            <CreatePageForm locale={locale} defaultName={defaultName} events={[event]} defaultEventSlug={event.slug} />
          </div>
        </>
      ) : (
        <>
          <ol className="mt-4 flex gap-1.5" aria-label={t("fundraiseProgress")}>
            {STEPS.map((key, index) => (
              <li key={key} aria-current={index === step ? "step" : undefined} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-red" : "bg-mist-2"}`} />
            ))}
          </ol>
          <p className="mt-6 font-mono text-[12px] text-red">{String(step + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}</p>
          <h1 className="type-display mt-2 text-3xl">{t(`${STEPS[step]}Title`)}</h1>
          <p className="mt-4 text-[16.5px] leading-relaxed text-black/75">{t(`${STEPS[step]}Body`)}</p>
          <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-black/70">
            {[1, 2, 3].map((n) => (
              <li key={n} className="flex gap-3 rounded-lg bg-mist px-4 py-3">
                <span className="font-mono text-[12px] text-red">•</span>
                {t(`${STEPS[step]}Point${n}`)}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setStep((s) => s + 1)} className="inline-flex h-12 items-center rounded-lg bg-red px-7 text-[16px] font-bold text-paper transition-colors hover:bg-red-dark">
              {step === STEPS.length - 1 ? t("fundraiseStart") : t("fundraiseNext")}
            </button>
            {step > 0 ? (
              <button type="button" onClick={() => setStep((s) => s - 1)} className="inline-flex h-12 items-center rounded-lg bg-mist px-5 text-[15px] font-semibold transition-colors hover:bg-mist-2">
                {t("fundraiseBack")}
              </button>
            ) : null}
            <button type="button" onClick={() => setStep(STEPS.length)} className="ml-auto text-[14px] font-semibold text-black/55 underline underline-offset-2 hover:text-sea">
              {t("fundraiseSkip")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
