"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { registerForEvent } from "@/app/[locale]/dogadjaji/actions";
import { formatCents, type Cents } from "@/lib/money";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export interface TierOption {
  label: string;
  amountCents: Cents;
}

export function RegistrationForm({
  eventSlug,
  distances,
  tiers,
}: {
  eventSlug: string;
  distances: string[];
  tiers: TierOption[];
}) {
  const t = useTranslations("events");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [distance, setDistance] = useState(distances[0] ?? "");
  const [shirtSize, setShirtSize] = useState<(typeof SIZES)[number]>("M");
  const [tierLabel, setTierLabel] = useState(tiers[0]?.label ?? "");
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "error" | "closed">("idle");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!waiverAccepted) return;
    setState("busy");
    const result = await registerForEvent({
      eventSlug,
      distance: distance || null,
      shirtSize,
      tierLabel,
      waiverAccepted: true,
      locale,
    }).catch(() => ({ ok: false as const, error: "server" as const }));
    if (result.ok) {
      router.refresh(); // the server page now renders the confirmation branch
    } else {
      setState("error" in result && result.error === "closed" ? "closed" : "error");
    }
  };

  const selectClass =
    "mt-1 w-full rounded-[11px] border-[1.5px] border-line bg-paper px-3.5 py-3 text-[15px] outline-none focus:border-sea";
  const labelClass = "text-[13px] font-semibold";

  return (
    <form onSubmit={submit} className="max-w-lg space-y-4">
      {distances.length > 0 ? (
        <div>
          <label htmlFor="regDistance" className={labelClass}>
            {t("distanceLabel")}
          </label>
          <select
            id="regDistance"
            value={distance}
            onChange={(event) => setDistance(event.target.value)}
            className={selectClass}
          >
            {distances.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label htmlFor="regTier" className={labelClass}>
          {t("tierLabel")}
        </label>
        <select
          id="regTier"
          value={tierLabel}
          onChange={(event) => setTierLabel(event.target.value)}
          className={selectClass}
        >
          {tiers.map((tier) => (
            <option key={tier.label} value={tier.label}>
              {tier.label} —{" "}
              {formatCents(tier.amountCents, locale, { trimWholeCents: true })}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="regSize" className={labelClass}>
          {t("sizeLabel")}
        </label>
        <select
          id="regSize"
          value={shirtSize}
          onChange={(event) =>
            setShirtSize(event.target.value as (typeof SIZES)[number])
          }
          className={selectClass}
        >
          {SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      {/* waiver: summary + link to the full terms, acceptance recorded with
          its version */}
      <div className="max-h-44 space-y-2 overflow-y-auto rounded-brand border-[1.5px] border-line bg-sand px-4 py-3 text-[12.5px] leading-relaxed text-ink/75">
        <p>{t("waiver1")}</p>
        <p>{t("waiver2")}</p>
        <p>{t("waiver3")}</p>
        <p>
          <Link
            href="/uslovi-ucesca"
            className="font-semibold text-sea underline underline-offset-2"
            target="_blank"
          >
            {t("waiverFull")}
          </Link>
        </p>
      </div>
      <label className="flex items-start gap-2.5 text-[13.5px] font-semibold">
        <input
          type="checkbox"
          required
          checked={waiverAccepted}
          onChange={(event) => setWaiverAccepted(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-sea"
        />
        {t("waiverAccept")}
      </label>

      {state === "error" ? (
        <p role="alert" className="text-[13px] font-semibold text-red-dark">
          {t("error")}
        </p>
      ) : null}
      {state === "closed" ? (
        <p role="alert" className="text-[13px] font-semibold text-red-dark">
          {t("registrationClosed")}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={state === "busy" || !waiverAccepted}
        className="w-full rounded-xl bg-red px-6 py-3.5 text-[15px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark disabled:opacity-60"
      >
        {t("submit")}
      </button>
    </form>
  );
}
