"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { fetchRegistrationState, type RegistrationState } from "@/app/[locale]/(site)/dogadjaji/actions";
import { SignInForm } from "@/components/admin/SignInForm";
import { SepaPanel } from "@/components/donate/SepaPanel";
import { RegistrationForm, type TierOption } from "@/components/events/RegistrationForm";
import { formatCents } from "@/lib/money";
import type { Locale } from "@/i18n/routing";

export interface RegisterEvent {
  slug: string;
  name: string;
  kind: "race" | "challenge" | "social";
  distances: string[];
  tiers: TierOption[];
  offersShirts: boolean;
  hosting?: "own" | "external";
  externalUrl?: string | null;
  bibsLeft?: number | null;
  maxGuests?: number;
}

type Phase = "closed" | "loading" | "signin" | "form" | "list";

/**
 * Registration on top of the event page: sign in if needed, the form,
 * then the summary with the transfer details — all without leaving the
 * page. A plain link to /prijava stays as the no-script fallback.
 */
export function RegisterDialog({ event, label, className }: { event: RegisterEvent; label: string; className: string }) {
  const t = useTranslations("events");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const params = useSearchParams();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [phase, setPhase] = useState<Phase>("closed");
  const [state, setState] = useState<RegistrationState | null>(null);
  const [another, setAnother] = useState(false);

  const load = useCallback(async () => {
    setPhase("loading");
    const next = await fetchRegistrationState(event.slug).catch(() => null);
    if (!next) {
      setPhase("closed");
      return;
    }
    setState(next);
    setPhase(!next.signedIn ? "signin" : next.registrations.length > 0 ? "list" : "form");
  }, [event.slug]);

  const open = () => {
    setAnother(false);
    void load();
  };
  const close = () => setPhase("closed");

  // Coming back from the magic link with ?prijava=1 reopens the overlay.
  useEffect(() => {
    if (params.get("prijava") === "1") void load();
  }, [params, load]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const isOpen = phase !== "closed";
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [phase]);

  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });
  // Guests hang under the registration that pays for them.
  const registrations = (state?.registrations ?? []).filter((r) => !r.party_of);
  const guestsOf = (id: string) => (state?.registrations ?? []).filter((r) => r.party_of === id);

  return (
    <>
      <a
        href={`/${locale}/dogadjaji/${event.slug}/prijava`}
        onClick={(e) => {
          e.preventDefault();
          open();
        }}
        className={className}
      >
        {label}
      </a>
      <dialog
        ref={dialogRef}
        aria-label={t("registerTitle")}
        onClose={close}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none items-end justify-center bg-transparent p-0 backdrop:bg-ink/55 open:flex sm:items-center sm:p-4"
      >
        <div className="relative flex max-h-[100dvh] w-full max-w-[600px] flex-col rounded-t-lg bg-paper shadow-[0_24px_60px_rgba(14,58,70,0.25)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-lg">
          <button type="button" onClick={close} aria-label={t("close")} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-mist text-[19px] leading-none text-black/70 transition-colors hover:bg-mist-2 hover:text-sea">
            ×
          </button>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-8 sm:px-7">
            <p className="type-eyebrow text-sea/80">{event.name}</p>
            {phase === "loading" ? (
              <div aria-busy className="mt-4 space-y-3">
                <div className="h-8 w-2/3 animate-pulse rounded-md bg-mist motion-reduce:animate-none" />
                <div className="h-24 animate-pulse rounded-lg bg-mist motion-reduce:animate-none" />
              </div>
            ) : null}

            {phase === "signin" ? (
              <>
                <h2 className="type-display mt-2 text-3xl">{t("signInTitle")}</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-black/65">{t("signInSub")}</p>
                <div className="mt-5">
                  <SignInForm locale={locale} nextPath={`/${locale}/dogadjaji/${event.slug}?prijava=1`} allowSignup />
                </div>
              </>
            ) : null}

            {phase === "form" && state ? (
              <>
                <h2 className="type-display mt-2 text-3xl">{another ? t("registerAnother") : t("registerTitle")}</h2>
                <div className="mt-5">
                  <RegistrationForm
                    eventSlug={event.slug}
                    kind={event.kind}
                    distances={event.distances}
                    tiers={event.tiers}
                    offersShirts={event.offersShirts}
                    hosting={event.hosting ?? "own"}
                    bibsLeft={event.bibsLeft ?? null}
                    maxGuests={event.maxGuests ?? 0}
                    defaultName={another ? "" : state.fullName}
                    defaultEmail={another ? "" : state.email}
                    onDone={() => {
                      router.refresh();
                      void load();
                    }}
                  />
                </div>
              </>
            ) : null}

            {phase === "list" && state ? (
              <>
                <h2 className="type-display mt-2 text-3xl">
                  {registrations.every((r) => r.status === "confirmed") ? t("confirmedTitle") : t("registeredTitle")}
                </h2>
                <ul className="mt-5 space-y-3">
                  {registrations.map((registration) => {
                    const due = registration.amount_due_cents ?? 0;
                    const pendingPayment = registration.status === "pending" && due > 0;
                    return (
                      <li key={registration.id} className="rounded-lg bg-mist p-4">
                        <p className="text-[16px] font-bold">{registration.participant_name ?? state.fullName ?? state.email}</p>
                        <p className="mt-0.5 text-[14.5px] text-black/65">
                          {[registration.distance, registration.tier_label, registration.shirt_size, registration.needs_bib ? t("needBib") : null].filter(Boolean).join(" · ")}
                          {due > 0 ? ` · ${money(due)}` : ""}
                        </p>
                        {guestsOf(registration.id).length > 0 ? (
                          <ul className="mt-1.5 space-y-0.5 text-[14px] text-black/70">
                            {guestsOf(registration.id).map((guest) => (
                              <li key={guest.id}>
                                + {guest.participant_name}
                                {guest.tier_label ? <span className="text-black/50"> · {guest.tier_label}</span> : null}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {pendingPayment ? (
                          <>
                            <p className="mt-3 text-[14.5px] leading-relaxed text-black/70">{t("payInstructions")}</p>
                            <div className="mt-3">
                              <SepaPanel locale={locale} bank={state.bank} reference={registration.payment_reference ?? ""} amountCents={due} monthly={false} />
                            </div>
                          </>
                        ) : (
                          <p className="mt-3 rounded-lg bg-paper px-4 py-3 text-[14.5px] text-sea">
                            {registration.status === "confirmed" ? t("paidNote") : t("noFeeNote")}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {event.hosting === "external" ? (
                  event.externalUrl ? (
                    <a href={event.externalUrl} target="_blank" rel="noopener" className="mt-4 inline-block text-[14.5px] font-semibold text-sea underline underline-offset-2 hover:text-sea-2">
                      {t("organizerLink")} ↗
                    </a>
                  ) : null
                ) : (
                  <p className="mt-4 text-[13.5px] leading-relaxed text-black/60">{t("opsNote")}</p>
                )}
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAnother(true);
                      setPhase("form");
                    }}
                    className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90"
                  >
                    {t("registerAnother")}
                  </button>
                  <button type="button" onClick={close} className="rounded-lg bg-mist px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:bg-mist-2">
                    {t("close")}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </dialog>
    </>
  );
}
