"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";

import { createSepaPledge } from "@/app/[locale]/(site)/podrzi/actions";
import { SepaPanel } from "@/components/donate/SepaPanel";
import type { DonateTargetData, SuggestedAmount } from "@/lib/donate/types";
import { formatCents, parseEurosToCents, type Cents } from "@/lib/money";
import { hasBankDetails } from "@/lib/org";
import { donationFormSchema, type DonationFormValues } from "@/lib/schemas/donation";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export type { DonateTarget, SuggestedSets } from "@/lib/donate/types";

type Step = 1 | 2 | 3;
const STEPS: Step[] = [1, 2, 3];

function defaultAmount(set: SuggestedAmount[]): Cents {
  return (set.find((s) => s.isDefault) ?? set[0])?.amountCents ?? 2500;
}

/**
 * The three-step donate flow — amount, details, payment — with the
 * thank-you as the final state. One component for both surfaces: the
 * overlay that opens over any page (`variant="dialog"`, given `onClose`)
 * and the standalone /podrzi page for deep links. Field order inside the
 * steps follows brief §9 and the prototype; selection state rides on
 * aria-pressed.
 */
export function DonateFlow({
  locale,
  data,
  variant = "page",
  onClose,
}: {
  locale: Locale;
  data: DonateTargetData;
  variant?: "page" | "dialog";
  onClose?: () => void;
}) {
  const { target: campaign, suggested, bank, cardRailEnabled, backPath, photoUrl } = data;
  const t = useTranslations("donate");
  const tNav = useTranslations("nav");
  const inDialog = variant === "dialog";
  const topRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DonationFormValues>({
    resolver: zodResolver(donationFormSchema),
    mode: "onTouched",
    defaultValues: {
      amountCents: defaultAmount(suggested.oneoff),
      monthly: false,
      coverFee: true,
      anonymous: false,
      name: "",
      email: "",
      message: "",
    },
  });

  const [step, setStep] = useState<Step>(1);
  const [customText, setCustomText] = useState("");
  const [serverError, setServerError] = useState(false);
  const [confirmed, setConfirmed] = useState<{ reference: string; amountCents: Cents } | null>(
    null,
  );

  const amountCents = watch("amountCents");
  const monthly = watch("monthly");
  const anonymous = watch("anonymous");
  const donorName = watch("name");

  const chips = monthly ? suggested.monthly : suggested.oneoff;
  // Card is Task 4: the rail is fixed to SEPA, so no fee applies and the
  // fee-cover toggle stays out of the DOM until the flag turns it on.
  const totalCents = amountCents > 0 ? amountCents : 0;
  const money = (cents: Cents) => formatCents(cents, locale, { trimWholeCents: true });

  const goTo = (next: Step) => {
    setStep(next);
    // Each step starts at its top — in the overlay that is the panel's
    // scroll box, on the page it is the window.
    topRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
  };

  const advance = async () => {
    const valid =
      step === 1 ? await trigger("amountCents") : await trigger(["name", "email", "message"]);
    if (valid && step < 3) goTo((step + 1) as Step);
  };

  const selectAmount = (cents: Cents) => {
    setCustomText("");
    setValue("amountCents", cents, { shouldValidate: true });
  };

  const onCustomInput = (value: string) => {
    setCustomText(value);
    if (value.trim() === "") {
      setValue("amountCents", defaultAmount(chips), { shouldValidate: true });
      return;
    }
    const cents = parseEurosToCents(value);
    setValue("amountCents", cents ?? 0, { shouldValidate: true });
  };

  const toggleMonthly = () => {
    const next = !monthly;
    setValue("monthly", next);
    if (customText.trim() === "") {
      const nextSet = next ? suggested.monthly : suggested.oneoff;
      if (!nextSet.some((s) => s.amountCents === amountCents)) {
        setValue("amountCents", defaultAmount(nextSet), { shouldValidate: true });
      }
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(false);
    const result = await createSepaPledge({
      ...values,
      ...(campaign.kind === "fundraiser"
        ? { fundraiserSlug: campaign.slug }
        : { campaignSlug: campaign.slug }),
      locale,
      rail: "sepa",
    });
    if (result.ok && result.reference) {
      setConfirmed({ reference: result.reference, amountCents: values.amountCents });
      topRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    } else {
      setServerError(true);
    }
  });

  const share = async () => {
    // Share the PAGE, never the checkout URL.
    const url = backPath
      ? `${window.location.origin}/${locale}${backPath}`
      : `${window.location.origin}/${locale}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: campaign.title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // Dismissed the share sheet — nothing to do.
    }
  };

  const avatar =
    campaign.kind === "fundraiser" ? (
      photoUrl ? (
        <Image
          src={photoUrl}
          alt=""
          width={44}
          height={44}
          className="h-[44px] w-[44px] shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="type-display flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-red text-[19px] font-bold text-paper"
        >
          {campaign.title.trim().charAt(0).toUpperCase() || "S"}
        </span>
      )
    ) : null;

  const inputClass =
    "mt-1 w-full rounded-lg border-[1.5px] border-line bg-paper px-3.5 py-3 text-[16px] outline-none focus:border-sea";
  const primaryBtn =
    "rounded-lg bg-red px-6 py-3.5 text-[16px] font-bold text-paper transition-colors hover:bg-red-dark disabled:opacity-60";
  const secondaryBtn =
    "rounded-lg border-[1.5px] border-line px-5 py-3 text-[15px] font-semibold transition-colors hover:border-sea hover:text-sea";
  const chipClass = (selected: boolean) =>
    `rounded-lg border-[1.5px] px-1.5 py-3 text-center transition-colors ${
      selected
        ? "border-red bg-red/[0.07] shadow-[inset_0_0_0_0.5px_var(--color-red)]"
        : "border-line hover:border-sea"
    }`;

  const switchRow = (
    id: string,
    pressed: boolean,
    onToggle: () => void,
    title: ReactNode,
    desc: string,
  ) => (
    <button
      type="button"
      id={id}
      aria-pressed={pressed}
      onClick={onToggle}
      className="flex w-full items-center gap-4 border-t border-line-soft py-3.5 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[15.5px] font-semibold">{title}</span>
        <span className="mt-0.5 block text-[13.5px] leading-relaxed text-ink/60">{desc}</span>
      </span>
      <span
        aria-hidden
        className={`relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors motion-reduce:transition-none ${
          pressed ? "bg-sea" : "bg-ink/15"
        }`}
      >
        <span
          className={`absolute top-[3px] h-5 w-5 rounded-full bg-paper shadow transition-all motion-reduce:transition-none ${
            pressed ? "left-[23px]" : "left-[3px]"
          }`}
        />
      </span>
    </button>
  );

  // The page link at the top: in the overlay the page is right behind us,
  // so closing IS going back.
  const backLink = backPath ? (
    inDialog ? (
      <button
        type="button"
        onClick={onClose}
        className="inline-block text-[13.5px] font-semibold text-sea transition-colors hover:text-sea-2"
      >
        ← {t("backToPage")}
      </button>
    ) : (
      <Link
        href={backPath}
        className="inline-block text-[13.5px] font-semibold text-sea transition-colors hover:text-sea-2"
      >
        ← {t("backToPage")}
      </Link>
    )
  ) : (
    <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-sea/80">
      {tNav("donate")}
    </p>
  );

  const wrapperClass = inDialog ? "px-5 py-5 sm:px-7 sm:py-6" : "mx-auto max-w-xl px-5 py-14";
  const Heading = inDialog ? "h2" : "h1";

  if (confirmed) {
    return (
      <div className={wrapperClass}>
        <div ref={topRef} />
        {backLink}
        <Heading className="type-display mt-3 text-3xl sm:text-4xl">
          {t("confTitle", { name: donorName })}
        </Heading>
        <p className="mt-4 text-[16px] leading-relaxed text-ink/70">
          {t("confEmailNote")} {t("confLedgerNote")}
        </p>
        <div className="mt-6">
          <SepaPanel
            locale={locale}
            bank={bank}
            reference={confirmed.reference}
            amountCents={confirmed.amountCents}
            monthly={monthly}
          />
        </div>
        {/* Never a dead-end thank-you (brief §9.8). */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button type="button" onClick={share} className={primaryBtn}>
            {t("confShare")}
          </button>
          {inDialog ? (
            <button type="button" onClick={onClose} className={secondaryBtn}>
              {t("close")}
            </button>
          ) : backPath ? (
            <Link href={backPath} className={secondaryBtn}>
              {t("backToPage")}
            </Link>
          ) : null}
          <Link href="/prikupljaci" className={secondaryBtn}>
            {t("confStartOwn")}
          </Link>
        </div>
      </div>
    );
  }

  const stepLabels: Record<Step, string> = {
    1: t("stepAmount"),
    2: t("identityTitle"),
    3: t("stepPayment"),
  };

  return (
    <form onSubmit={onSubmit} noValidate className={wrapperClass}>
      <div ref={topRef} />
      {backLink}
      <div className="mt-3 flex items-center gap-3">
        {avatar}
        <Heading className="type-display min-w-0 text-3xl sm:text-4xl">{campaign.title}</Heading>
      </div>
      {step === 1 && campaign.description ? (
        <p className="mt-3 text-[15.5px] leading-relaxed text-ink/70">
          {campaign.description} {t("goal", { amount: money(campaign.goalCents) })}
        </p>
      ) : null}

      {/* Stepper: finished steps are buttons back, the current one is announced. */}
      <ol className="mt-6 flex items-center gap-2" aria-label={t("stepOf", { n: step })}>
        {STEPS.map((n) => {
          const done = n < step;
          const current = n === step;
          const badge = (
            <span
              aria-hidden
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[12px] ${
                current
                  ? "bg-ink text-paper"
                  : done
                    ? "bg-sea text-paper"
                    : "border-[1.5px] border-line text-ink/50"
              }`}
            >
              {done ? "✓" : n}
            </span>
          );
          const label = (
            <span
              className={`hidden text-[13.5px] sm:inline ${
                current ? "font-semibold text-ink" : done ? "text-sea" : "text-ink/50"
              }`}
            >
              {stepLabels[n]}
            </span>
          );
          return (
            <li
              key={n}
              aria-current={current ? "step" : undefined}
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              {done ? (
                <button
                  type="button"
                  onClick={() => goTo(n)}
                  className="flex items-center gap-2 rounded-md hover:underline"
                >
                  {badge}
                  {label}
                </button>
              ) : (
                <span className="flex items-center gap-2">
                  {badge}
                  {label}
                </span>
              )}
              {n < 3 ? <span aria-hidden className="h-px flex-1 bg-line" /> : null}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-[14px] font-semibold sm:sr-only">{stepLabels[step]}</p>

      {step === 1 ? (
        <>
          {/* amount chips with impact lines, middle pre-selected */}
          <div role="group" aria-label={t("stepAmount")} className="mt-5 grid grid-cols-3 gap-2">
            {chips.map((chip) => {
              const selected = customText.trim() === "" && amountCents === chip.amountCents;
              return (
                <button
                  key={chip.amountCents}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectAmount(chip.amountCents)}
                  className={chipClass(selected)}
                >
                  <span className="block font-mono text-[18px] font-medium tabular-nums">
                    {money(chip.amountCents)}
                  </span>
                  <span
                    className={`mt-0.5 block text-[12.5px] leading-tight ${
                      selected ? "text-ink/75" : "text-ink/50"
                    }`}
                  >
                    {monthly
                      ? t("perYear", { amount: money(chip.amountCents * 12) })
                      : chip.impactKey && t.has(chip.impactKey)
                        ? t(chip.impactKey)
                        : null}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="mt-3 flex items-center gap-2 rounded-lg border-[1.5px] border-line px-3.5 py-3 focus-within:border-sea">
            <span aria-hidden className="font-mono text-[16px] text-ink/50">
              €
            </span>
            <span className="sr-only">{t("customAmount")}</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder={t("customAmount")}
              value={customText}
              onChange={(event) => onCustomInput(event.target.value)}
              className="w-full bg-transparent font-mono text-[16px] tabular-nums outline-none placeholder:font-sans placeholder:text-ink/40"
            />
          </label>
          {errors.amountCents ? (
            <p role="alert" className="mt-1.5 text-[13.5px] font-semibold text-red-dark">
              {t("errAmount")}
            </p>
          ) : null}

          {/* monthly, anonymity (the fee toggle joins with the card rail in Task 4) */}
          <div className="mt-6 border-b border-line-soft">
            {switchRow("swMonthly", monthly, toggleMonthly, t("monthlyTitle"), t("monthlyDesc"))}
            {switchRow(
              "swAnon",
              anonymous,
              () => setValue("anonymous", !anonymous),
              t("anonTitle"),
              t("anonDesc"),
            )}
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <div className="mt-5 space-y-3">
          <div>
            <label htmlFor="donorName" className="text-[14px] font-semibold">
              {t("nameLabel")}
            </label>
            <input
              id="donorName"
              type="text"
              autoComplete="name"
              autoFocus
              aria-invalid={errors.name ? true : undefined}
              {...register("name")}
              className={inputClass}
            />
            {errors.name ? (
              <p role="alert" className="mt-1 text-[13.5px] font-semibold text-red-dark">
                {t("errName")}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="donorEmail" className="text-[14px] font-semibold">
              {t("emailLabel")}
            </label>
            <input
              id="donorEmail"
              type="email"
              autoComplete="email"
              aria-invalid={errors.email ? true : undefined}
              {...register("email")}
              className={inputClass}
            />
            {errors.email ? (
              <p role="alert" className="mt-1 text-[13.5px] font-semibold text-red-dark">
                {t("errEmail")}
              </p>
            ) : null}
            <p className="mt-1 text-[13px] text-ink/55">{t("emailHint")}</p>
          </div>
          <div>
            <label htmlFor="donorMessage" className="text-[14px] font-semibold">
              {t("messageLabel")}
            </label>
            <textarea
              id="donorMessage"
              rows={3}
              aria-invalid={errors.message ? true : undefined}
              {...register("message")}
              className={inputClass}
            />
            {errors.message ? (
              <p role="alert" className="mt-1 text-[13.5px] font-semibold text-red-dark">
                {t("errMessage")}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <>
          {/* what they chose, editable by stepping back */}
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 rounded-brand bg-sand px-4 py-3.5 text-[14.5px]">
            <dt className="text-ink/60">{t("summaryGift")}</dt>
            <dd className="text-right font-mono font-medium tabular-nums">
              {money(totalCents)}
              {monthly ? t("perMonth") : null}
            </dd>
            <dt className="text-ink/60">{t("summaryFrom")}</dt>
            <dd className="truncate text-right font-semibold">
              {anonymous ? t("summaryAnonymous", { name: donorName }) : donorName}
            </dd>
          </dl>

          <p className="mt-6 font-mono text-[12px] uppercase tracking-[0.16em] text-sea/80">
            {t("paymentMethod")}
          </p>
          <div className={`mt-3 grid gap-2 ${cardRailEnabled ? "grid-cols-2" : ""}`}>
            {cardRailEnabled ? (
              <button
                type="button"
                aria-pressed={false}
                disabled
                className="rounded-lg border-[1.5px] border-line px-3 py-3 text-left opacity-50"
              >
                <span className="block text-[15.5px] font-semibold">{t("railCard")}</span>
                <span className="block text-[13px] text-ink/60">{t("railCardSub")}</span>
              </button>
            ) : null}
            <button
              type="button"
              aria-pressed
              className="rounded-lg border-2 border-ink bg-ink px-3 py-3 text-left text-paper"
            >
              <span className="block text-[15.5px] font-semibold">{t("railSepa")}</span>
              <span className="block text-[13px] text-paper/70">{t("railSepaSub")}</span>
            </button>
          </div>

          {/* SEPA panel: IBAN, reference, live EPC QR, copy buttons */}
          <div className="mt-3">
            <SepaPanel
              locale={locale}
              bank={bank}
              reference={campaign.paymentReference}
              amountCents={totalCents}
              monthly={monthly}
            />
          </div>

          <div className="mt-6 flex items-baseline justify-between border-t-[1.5px] border-ink pt-4">
            <span className="text-[14.5px] font-semibold">{t("totalToday")}</span>
            <span className="font-mono text-[20px] font-medium tabular-nums">
              {formatCents(totalCents, locale)}
              {monthly ? t("perMonth") : null}
            </span>
          </div>
          {serverError ? (
            <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">
              {t("errServer")}
            </p>
          ) : null}
        </>
      ) : null}

      {/* step footer */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        {step > 1 ? (
          <button type="button" onClick={() => goTo((step - 1) as Step)} className={secondaryBtn}>
            ← {t("back")}
          </button>
        ) : (
          <span className="font-mono text-[14px] tabular-nums text-ink/60">
            {money(totalCents)}
            {monthly ? t("perMonth") : null}
          </span>
        )}
        {step < 3 ? (
          <button type="button" onClick={advance} className={primaryBtn}>
            {t("continue")} →
          </button>
        ) : (
          /* No pledges before the real bank details exist — the panel above
             explains why (bankDetailsPending). */
          <button
            type="submit"
            disabled={isSubmitting || !hasBankDetails(bank)}
            className={primaryBtn}
          >
            {isSubmitting
              ? t("sending")
              : `${t("payVerb")} ${money(totalCents)}${monthly ? t("perMonth") : ""}`}
          </button>
        )}
      </div>
      {step === 3 ? (
        <p className="mt-3 text-center text-[13px] leading-relaxed text-ink/55">
          {t("secureNote")}
        </p>
      ) : null}
    </form>
  );
}
