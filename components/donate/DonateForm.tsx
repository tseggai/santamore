"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";

import { createSepaPledge } from "@/app/[locale]/podrzi/actions";
import { SepaPanel } from "@/components/donate/SepaPanel";
import { formatCents, parseEurosToCents, type Cents } from "@/lib/money";
import { hasBankDetails, type OrgBankDetails } from "@/lib/org";
import {
  donationFormSchema,
  type DonationFormValues,
} from "@/lib/schemas/donation";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export interface SuggestedAmount {
  amountCents: Cents;
  impactKey?: string;
  isDefault?: boolean;
}

export interface SuggestedSets {
  oneoff: SuggestedAmount[];
  monthly: SuggestedAmount[];
}

export interface DonateCampaign {
  slug: string;
  title: string;
  description: string | null;
  goalCents: Cents;
  paymentReference: string;
}

function defaultAmount(set: SuggestedAmount[]): Cents {
  return (set.find((s) => s.isDefault) ?? set[0])?.amountCents ?? 2500;
}

/**
 * The single-screen donate flow, field order per brief §9 and the
 * prototype — amount, monthly, (fee), anonymity, rail, identity last.
 * Selection state is carried on aria-pressed, as in the prototype.
 */
export function DonateForm({
  locale,
  campaign,
  suggested,
  bank,
  cardRailEnabled,
}: {
  locale: Locale;
  campaign: DonateCampaign;
  suggested: SuggestedSets;
  bank: OrgBankDetails;
  cardRailEnabled: boolean;
}) {
  const t = useTranslations("donate");
  const tNav = useTranslations("nav");

  const {
    register,
    handleSubmit,
    setValue,
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
  const totalCents = amountCents;

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
      campaignSlug: campaign.slug,
      locale,
      rail: "sepa",
    });
    if (result.ok && result.reference) {
      setConfirmed({ reference: result.reference, amountCents: values.amountCents });
      window.scrollTo({ top: 0 });
    } else {
      setServerError(true);
    }
  });

  const share = async () => {
    const url = window.location.href;
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

  const money = (cents: Cents) => formatCents(cents, locale, { trimWholeCents: true });

  const chipClass = (selected: boolean) =>
    `rounded-[11px] border-[1.5px] px-1.5 py-3 text-center transition-colors ${
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
        <span className="block text-[14.5px] font-semibold">{title}</span>
        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink/60">{desc}</span>
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

  if (confirmed) {
    return (
      <div className="mx-auto max-w-xl px-5 py-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
          {campaign.title}
        </p>
        <h1 className="type-display mt-3 text-3xl sm:text-4xl">
          {t("confTitle", { name: donorName })}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink/70">
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
          <button
            type="button"
            onClick={share}
            className="rounded-xl bg-red px-6 py-3.5 text-[15px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark"
          >
            {t("confShare")}
          </button>
          <Link
            href="/prikupljaci"
            className="rounded-xl border-[1.5px] border-line px-5 py-3 text-[14px] font-semibold transition-colors hover:border-sea hover:text-sea"
          >
            {t("confStartOwn")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto max-w-xl px-5 py-14">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
        {tNav("donate")}
      </p>
      <h1 className="type-display mt-3 text-3xl sm:text-4xl">{campaign.title}</h1>
      <p className="mt-3 text-[14.5px] leading-relaxed text-ink/70">
        {campaign.description} {t("goal", { amount: money(campaign.goalCents) })}
      </p>

      {/* 1 — amount chips with impact lines, middle pre-selected */}
      <div role="group" className="mt-6 grid grid-cols-3 gap-2">
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
              <span className="block font-mono text-[17px] font-medium tabular-nums">
                {money(chip.amountCents)}
              </span>
              <span
                className={`mt-0.5 block text-[11.5px] leading-tight ${
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

      {/* custom amount */}
      <label className="mt-3 flex items-center gap-2 rounded-[11px] border-[1.5px] border-line px-3.5 py-3 focus-within:border-sea">
        <span aria-hidden className="font-mono text-[15px] text-ink/50">
          €
        </span>
        <span className="sr-only">{t("customAmount")}</span>
        <input
          type="text"
          inputMode="decimal"
          placeholder={t("customAmount")}
          value={customText}
          onChange={(event) => onCustomInput(event.target.value)}
          className="w-full bg-transparent font-mono text-[15px] tabular-nums outline-none placeholder:font-sans placeholder:text-ink/40"
        />
      </label>
      {errors.amountCents ? (
        <p role="alert" className="mt-1.5 text-[12.5px] font-semibold text-red-dark">
          {t("errAmount")}
        </p>
      ) : null}

      {/* 2 — monthly, 4 — anonymity (3, the fee toggle, joins with the card rail in Task 4) */}
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

      {/* 5 — rail choice */}
      <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
        {t("paymentMethod")}
      </p>
      <div className={`mt-3 grid gap-2 ${cardRailEnabled ? "grid-cols-2" : ""}`}>
        {cardRailEnabled ? (
          <button
            type="button"
            aria-pressed={false}
            disabled
            className="rounded-[11px] border-[1.5px] border-line px-3 py-3 text-left opacity-50"
          >
            <span className="block text-[14.5px] font-semibold">{t("railCard")}</span>
            <span className="block text-[12px] text-ink/60">{t("railCardSub")}</span>
          </button>
        ) : null}
        <button
          type="button"
          aria-pressed
          className="rounded-[11px] border-2 border-ink bg-ink px-3 py-3 text-left text-paper"
        >
          <span className="block text-[14.5px] font-semibold">{t("railSepa")}</span>
          <span className="block text-[12px] text-paper/70">{t("railSepaSub")}</span>
        </button>
      </div>

      {/* SEPA panel: IBAN, reference, live EPC QR, copy buttons */}
      <div className="mt-3">
        <SepaPanel
          locale={locale}
          bank={bank}
          reference={campaign.paymentReference}
          amountCents={amountCents > 0 ? amountCents : 0}
          monthly={monthly}
        />
      </div>

      {/* 6 — identity last, 7 — optional public message */}
      <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
        {t("identityTitle")}
      </p>
      <div className="mt-3 space-y-3">
        <div>
          <label htmlFor="donorName" className="text-[13px] font-semibold">
            {t("nameLabel")}
          </label>
          <input
            id="donorName"
            type="text"
            autoComplete="name"
            aria-invalid={errors.name ? true : undefined}
            {...register("name")}
            className="mt-1 w-full rounded-[11px] border-[1.5px] border-line px-3.5 py-3 text-[15px] outline-none focus:border-sea"
          />
          {errors.name ? (
            <p role="alert" className="mt-1 text-[12.5px] font-semibold text-red-dark">
              {t("errName")}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="donorEmail" className="text-[13px] font-semibold">
            {t("emailLabel")}
          </label>
          <input
            id="donorEmail"
            type="email"
            autoComplete="email"
            aria-invalid={errors.email ? true : undefined}
            {...register("email")}
            className="mt-1 w-full rounded-[11px] border-[1.5px] border-line px-3.5 py-3 text-[15px] outline-none focus:border-sea"
          />
          {errors.email ? (
            <p role="alert" className="mt-1 text-[12.5px] font-semibold text-red-dark">
              {t("errEmail")}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="donorMessage" className="text-[13px] font-semibold">
            {t("messageLabel")}
          </label>
          <textarea
            id="donorMessage"
            rows={3}
            aria-invalid={errors.message ? true : undefined}
            {...register("message")}
            className="mt-1 w-full rounded-[11px] border-[1.5px] border-line px-3.5 py-3 text-[15px] outline-none focus:border-sea"
          />
          {errors.message ? (
            <p role="alert" className="mt-1 text-[12.5px] font-semibold text-red-dark">
              {t("errMessage")}
            </p>
          ) : null}
        </div>
      </div>

      {/* total + submit */}
      <div className="mt-7 flex items-baseline justify-between border-t-[1.5px] border-ink pt-4">
        <span className="text-[13.5px] font-semibold">{t("totalToday")}</span>
        <span className="font-mono text-[19px] font-medium tabular-nums">
          {formatCents(totalCents > 0 ? totalCents : 0, locale)}
          {monthly ? t("perMonth") : null}
        </span>
      </div>
      {serverError ? (
        <p role="alert" className="mt-3 text-[13px] font-semibold text-red-dark">
          {t("errServer")}
        </p>
      ) : null}
      {/* No pledges before the real bank details exist — the panel above
          explains why (bankDetailsPending). */}
      <button
        type="submit"
        disabled={isSubmitting || !hasBankDetails(bank)}
        className="mt-4 w-full rounded-xl bg-red px-6 py-4 text-[16px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark disabled:opacity-60"
      >
        {isSubmitting
          ? t("sending")
          : `${t("payVerb")} ${formatCents(totalCents > 0 ? totalCents : 0, locale, { trimWholeCents: true })}${monthly ? t("perMonth") : ""}`}
      </button>
      <p className="mt-3 text-center text-[12px] leading-relaxed text-ink/55">
        {t("secureNote")}
      </p>
    </form>
  );
}
