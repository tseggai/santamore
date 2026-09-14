"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { registerForEvent } from "@/app/[locale]/(site)/dogadjaji/actions";
import { formatCents, type Cents } from "@/lib/money";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export interface TierOption {
  label: string;
  amountCents: Cents;
}

/**
 * Who is taking part (the account holder by default, or anyone they
 * register), what they chose, and — for races and challenges — the
 * waiver. Shirt size appears only when the event hands out shirts.
 */
export function RegistrationForm({
  eventSlug,
  kind,
  distances,
  tiers,
  offersShirts,
  defaultName,
  defaultEmail,
  onDone,
}: {
  eventSlug: string;
  kind: "race" | "challenge" | "social";
  distances: string[];
  tiers: TierOption[];
  offersShirts: boolean;
  defaultName: string;
  defaultEmail: string;
  /** Overlay mode: called after a successful registration instead of navigating. */
  onDone?: () => void;
}) {
  const t = useTranslations("events");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const needsWaiver = kind !== "social";

  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState("");
  const [distance, setDistance] = useState(distances[0] ?? "");
  const [shirtSize, setShirtSize] = useState<(typeof SIZES)[number]>("M");
  const [tierLabel, setTierLabel] = useState(tiers[0]?.label ?? "");
  const [accepted, setAccepted] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "error" | "closed" | "full">("idle");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!accepted) return;
    setState("busy");
    const result = await registerForEvent({
      eventSlug,
      distance: distance || null,
      shirtSize: offersShirts ? shirtSize : null,
      tierLabel,
      waiverAccepted: accepted,
      participantName: name,
      participantEmail: email,
      participantPhone: phone,
      locale,
    }).catch(() => ({ ok: false as const, error: "server" as const }));
    if (result.ok) {
      if (onDone) {
        onDone();
        return;
      }
      // Back to the list of registrations, which now includes this one.
      router.push(`/${locale}/dogadjaji/${eventSlug}/prijava`);
      router.refresh();
    } else {
      setState("error" in result && (result.error === "closed" || result.error === "full") ? result.error : "error");
    }
  };

  const fieldClass =
    "mt-1 w-full rounded-lg border-[1.5px] border-line bg-paper px-3.5 py-3 text-[16px] outline-none focus:border-sea";
  const labelClass = "text-[14px] font-semibold";

  return (
    <form onSubmit={submit} className="max-w-lg space-y-4">
      <div>
        <label htmlFor="regName" className={labelClass}>{t("participantName")}</label>
        <input id="regName" type="text" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="regEmail" className={labelClass}>{t("participantEmail")}</label>
          <input id="regEmail" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="regPhone" className={labelClass}>{t("participantPhone")}</label>
          <input id="regPhone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} />
        </div>
      </div>

      {distances.length > 0 ? (
        <div>
          <label htmlFor="regDistance" className={labelClass}>{t("distanceLabel")}</label>
          <select id="regDistance" value={distance} onChange={(event) => setDistance(event.target.value)} className={fieldClass}>
            {distances.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
      ) : null}

      {tiers.length > 0 ? (
        <div>
          <label htmlFor="regTier" className={labelClass}>{t("tierLabel")}</label>
          <select id="regTier" value={tierLabel} onChange={(event) => setTierLabel(event.target.value)} className={fieldClass}>
            {tiers.map((tier) => (
              <option key={tier.label} value={tier.label}>
                {tier.label} — {formatCents(tier.amountCents, locale, { trimWholeCents: true })}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {offersShirts ? (
        <div>
          <label htmlFor="regSize" className={labelClass}>{t("sizeLabel")}</label>
          <select id="regSize" value={shirtSize} onChange={(event) => setShirtSize(event.target.value as (typeof SIZES)[number])} className={fieldClass}>
            {SIZES.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      ) : null}

      {needsWaiver ? (
        <div className="max-h-44 space-y-2 overflow-y-auto rounded-lg bg-sand px-4 py-3 text-[14.5px] leading-relaxed text-black/75">
          <p>{t("waiver1")}</p>
          <p>{t("waiver2")}</p>
          <p>{t("waiver3")}</p>
          <p>
            <Link href="/uslovi-ucesca" className="font-semibold text-sea underline underline-offset-2" target="_blank">
              {t("waiverFull")}
            </Link>
          </p>
        </div>
      ) : null}
      <label className="flex items-start gap-2.5 text-[14.5px] font-semibold">
        <input type="checkbox" required checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-0.5 h-4 w-4 accent-sea" />
        {needsWaiver ? t("waiverAccept") : t("termsAccept")}
      </label>

      {state === "error" ? <p role="alert" className="text-[14px] font-semibold text-red-dark">{t("error")}</p> : null}
      {state === "closed" ? <p role="alert" className="text-[14px] font-semibold text-red-dark">{t("registrationClosed")}</p> : null}
      {state === "full" ? <p role="alert" className="text-[14px] font-semibold text-red-dark">{t("registrationFull")}</p> : null}

      <button type="submit" disabled={state === "busy" || !accepted} className="w-full rounded-lg bg-red px-6 py-3.5 text-[16px] font-bold text-paper transition-colors hover:bg-red-dark disabled:opacity-60">
        {t("submit")}
      </button>
    </form>
  );
}
