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
  /** Last day offered (YYYY-MM-DD) — shown so early birds know the deadline. */
  until?: string | null;
}

interface GuestRow {
  name: string;
  tierLabel: string;
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
  hosting = "own",
  bibsLeft = null,
  maxGuests = 0,
  defaultName,
  defaultEmail,
  onDone,
}: {
  eventSlug: string;
  kind: "race" | "challenge" | "social";
  distances: string[];
  tiers: TierOption[];
  offersShirts: boolean;
  /** A race someone else organises: no waiver of ours, maybe a bib of ours. */
  hosting?: "own" | "external";
  /** How many of our bibs remain; null when we buy none. */
  bibsLeft?: number | null;
  /** A gathering: how many people this member may bring. */
  maxGuests?: number;
  defaultName: string;
  defaultEmail: string;
  /** Overlay mode: called after a successful registration instead of navigating. */
  onDone?: () => void;
}) {
  const t = useTranslations("events");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const needsWaiver = kind !== "social" && hosting !== "external";

  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState("");
  const [distance, setDistance] = useState(distances[0] ?? "");
  const [shirtSize, setShirtSize] = useState<(typeof SIZES)[number]>("M");
  const [tierLabel, setTierLabel] = useState(tiers[0]?.label ?? "");
  const [accepted, setAccepted] = useState(false);
  const [needsBib, setNeedsBib] = useState(false);
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [state, setState] = useState<"idle" | "busy" | "error" | "closed" | "full" | "bibsGone">("idle");
  const tierPrice = (label: string) => tiers.find((tier) => tier.label === label)?.amountCents ?? 0;
  const totalCents = tierPrice(tierLabel) + guests.reduce((sum, guest) => sum + tierPrice(guest.tierLabel), 0);
  const tierText = (tier: TierOption) =>
    `${tier.label} — ${formatCents(tier.amountCents, locale, { trimWholeCents: true })}${tier.until ? ` (${t("tierUntil", { date: tier.until })})` : ""}`;

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
      needsBib: needsBib && bibsLeft !== null && bibsLeft > 0,
      guests: kind === "social" ? guests.filter((guest) => guest.name.trim()) : [],
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
      setState("error" in result && (result.error === "closed" || result.error === "full" || result.error === "bibsGone") ? result.error : "error");
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
                {tierText(tier)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {hosting === "external" && bibsLeft !== null ? (
        bibsLeft > 0 ? (
          <label className="flex items-start gap-2.5 rounded-lg bg-mist px-4 py-3 text-[14.5px]">
            <input type="checkbox" checked={needsBib} onChange={(event) => setNeedsBib(event.target.checked)} className="mt-0.5 h-4 w-4 accent-red" />
            <span>
              <span className="font-semibold">{t("needBib")}</span>
              <span className="block text-[13.5px] text-black/60">{t("bibsLeft", { count: bibsLeft })}</span>
            </span>
          </label>
        ) : (
          <p className="rounded-lg bg-mist px-4 py-3 text-[14px] text-black/65">{t("bibsGone")}</p>
        )
      ) : null}

      {kind === "social" && maxGuests > 0 ? (
        <fieldset className="rounded-lg bg-mist px-4 py-3">
          <legend className="px-1 text-[14px] font-semibold">{t("guestsHeading")}</legend>
          <p className="text-[13.5px] text-black/60">{t("guestsHint", { count: maxGuests })}</p>
          <ul className="mt-2 space-y-2">
            {guests.map((guest, index) => (
              <li key={index} className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  required
                  minLength={2}
                  value={guest.name}
                  onChange={(event) => setGuests((rows) => rows.map((row, i) => (i === index ? { ...row, name: event.target.value } : row)))}
                  placeholder={t("guestName")}
                  aria-label={t("guestName")}
                  className={`${fieldClass} mt-0 min-w-0 flex-1`}
                />
                {tiers.length > 0 ? (
                  <select
                    value={guest.tierLabel}
                    onChange={(event) => setGuests((rows) => rows.map((row, i) => (i === index ? { ...row, tierLabel: event.target.value } : row)))}
                    aria-label={t("tierLabel")}
                    className={`${fieldClass} mt-0 w-auto`}
                  >
                    {tiers.map((tier) => (
                      <option key={tier.label} value={tier.label}>{tierText(tier)}</option>
                    ))}
                  </select>
                ) : null}
                <button
                  type="button"
                  onClick={() => setGuests((rows) => rows.filter((_, i) => i !== index))}
                  aria-label={t("removeGuest")}
                  title={t("removeGuest")}
                  className="h-10 w-10 shrink-0 rounded-lg bg-paper text-[18px] leading-none hover:bg-mist-2 hover:text-red-dark"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          {guests.length < maxGuests ? (
            <button
              type="button"
              onClick={() => setGuests((rows) => [...rows, { name: "", tierLabel: tiers[0]?.label ?? "" }])}
              className="mt-2 rounded-lg bg-paper px-3.5 py-2 text-[14px] font-semibold hover:bg-mist-2"
            >
              + {t("addGuest")}
            </button>
          ) : null}
          {tiers.length > 0 && guests.length > 0 ? (
            <p className="mt-3 text-[14.5px] font-semibold">
              {t("partyTotal", { count: guests.length + 1 })}: <span className="font-mono tabular-nums">{formatCents(totalCents, locale, { trimWholeCents: true })}</span>
            </p>
          ) : null}
        </fieldset>
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
      {state === "bibsGone" ? <p role="alert" className="text-[14px] font-semibold text-red-dark">{t("bibsGone")}</p> : null}

      <button type="submit" disabled={state === "busy" || !accepted} className="w-full rounded-lg bg-red px-6 py-3.5 text-[16px] font-bold text-paper transition-colors hover:bg-red-dark disabled:opacity-60">
        {t("submit")}
      </button>
    </form>
  );
}
