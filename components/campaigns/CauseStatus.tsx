import { useLocale, useTranslations } from "next-intl";

import { causeState, type CauseFigures } from "@/lib/cause-status";
import { formatCents } from "@/lib/money";
import type { Locale } from "@/i18n/routing";

/**
 * Where a cause stands, read from its records: completed once its end
 * date has passed or everything raised was handed over, goal reached
 * from the figures, and the hand-over total when there is one.
 * Renders nothing for an open cause that has nothing to report.
 */
export function CauseStatus({ cause, className = "" }: { cause: CauseFigures; className?: string }) {
  const t = useTranslations("campaigns");
  const locale = useLocale() as Locale;
  const state = causeState(cause);
  if (!state.completed && !state.goalReached && state.handedOver === 0) return null;
  const chip = "inline-flex h-7 items-center rounded-lg px-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.12em]";
  return (
    <span className={`flex flex-wrap items-center gap-2 ${className}`}>
      {state.completed ? <span className={`${chip} bg-sea text-paper`}>{t("statusCompleted")}</span> : null}
      {state.goalReached ? <span className={`${chip} bg-mist-2 text-sea`}>{t("statusGoalReached")}</span> : null}
      {state.goalMet === false ? (
        <span className={`${chip} bg-mist-2 text-red-dark`}>{t("statusGoalMissed")}</span>
      ) : null}
      {state.goalMet === false && cause.goal_cents ? (
        <span className="text-[13.5px] text-black/70">
          {t("statusRaisedOf", { raised: formatCents(cause.raised_cents, locale, { trimWholeCents: true }), goal: formatCents(cause.goal_cents, locale, { trimWholeCents: true }) })}
        </span>
      ) : null}
      {state.handedOver > 0 ? (
        <span className="text-[13.5px] text-black/70">
          {t.rich("statusHandedOver", {
            amount: () => <span className="font-mono font-semibold tabular-nums">{formatCents(state.handedOver, locale, { trimWholeCents: true })}</span>,
          })}
        </span>
      ) : null}
    </span>
  );
}
