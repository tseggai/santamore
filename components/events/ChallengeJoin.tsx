"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { SignInForm } from "@/components/admin/SignInForm";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export interface ChallengeJoinState {
  signedIn: boolean;
  stravaConnected: boolean;
}

/**
 * Joining a challenge is not a registration: it is an account and a
 * Strava connection. Signed out → sign in on the spot; signed in without
 * Strava → connect it; connected → you are in, go watch your progress.
 */
export function ChallengeJoin({ eventSlug, eventName, state, className }: { eventSlug: string; eventName: string; state: ChallengeJoinState; className: string }) {
  const t = useTranslations("events");
  const tPerks = useTranslations("perks");
  const locale = useLocale() as Locale;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (state.signedIn && state.stravaConnected) {
    return (
      <div className="rounded-lg bg-paper px-4 py-3">
        <p className="text-[15px] font-bold text-sea">{t("joinedNote")}</p>
        <Link href="/dashboard/strava" className="mt-1 inline-block text-[14px] font-semibold text-sea underline underline-offset-2 hover:text-sea-2">
          {t("joinProgress")} →
        </Link>
      </div>
    );
  }

  if (state.signedIn) {
    return (
      <Link href="/dashboard/strava" className={className}>
        {tPerks("connectCta")}
      </Link>
    );
  }

  return (
    <>
      <a
        href={`/${locale}/dashboard/prijava`}
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        className={className}
      >
        {t("joinCta")}
      </a>
      <dialog
        ref={dialogRef}
        aria-label={t("signInTitle")}
        onClose={() => setOpen(false)}
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
        className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none items-end justify-center bg-transparent p-0 backdrop:bg-ink/55 open:flex sm:items-center sm:p-4"
      >
        <div className="relative flex max-h-[100dvh] w-full max-w-[520px] flex-col rounded-t-lg bg-paper shadow-[0_24px_60px_rgba(14,58,70,0.25)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-lg">
          <button type="button" onClick={() => setOpen(false)} aria-label={t("close")} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-mist text-[19px] leading-none text-black/70 transition-colors hover:bg-mist-2 hover:text-sea">
            ×
          </button>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-8 sm:px-7">
            <p className="type-eyebrow text-sea/80">{eventName}</p>
            <h2 className="type-display mt-2 text-3xl">{t("joinSignInTitle")}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-black/65">{t("joinSignInSub")}</p>
            <ol className="mt-4 space-y-1.5 text-[14.5px] text-black/70">
              {(["step1", "step2", "step3"] as const).map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="font-mono text-[12px] text-red">0{index + 1}</span>
                  <span>{tPerks(step)}</span>
                </li>
              ))}
            </ol>
            <div className="mt-5">
              <SignInForm locale={locale} nextPath={`/${locale}/dashboard/strava?event=${eventSlug}`} allowSignup />
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
