"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { SidePanel } from "@/components/console/SidePanel";
import type { PartnerTier, PartnersContent } from "@/content/site/partners";
import { submitInbound } from "@/lib/inbound/actions";
import type { Locale } from "@/i18n/routing";

type Copy = Pick<PartnersContent, "preferredBadge" | "selectTier" | "pledgeTitle" | "pledgeLead" | "tierLabel" | "businessLabel" | "repEmailLabel" | "phoneLabel" | "noteLabel" | "noteHint" | "pledgeButton" | "pledgeSending" | "pledgeDone" | "pledgeDoneSub">;

/**
 * The tier sheet: the preferred tier first and marked, every tier a button
 * that opens the pledge. A pledge is a partner enquiry with the tier on it:
 * business, representative's email, phone, a note; it lands in Messages.
 */
export function TierSheet({ tiers, copy }: { tiers: PartnerTier[]; copy: Copy }) {
  const [selected, setSelected] = useState<PartnerTier | null>(null);
  const ordered = [...tiers].sort((a, b) => Number(Boolean(b.preferred)) - Number(Boolean(a.preferred)));
  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2">
        {ordered.map((tier) => (
          <li key={tier.id} className="flex flex-col rounded-lg bg-mist px-5 py-5">
            {tier.preferred ? <p className="mb-2 inline-block self-start rounded-md bg-sea px-2 py-0.5 text-[12px] font-bold uppercase tracking-[0.08em] text-paper">{copy.preferredBadge}</p> : null}
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="type-display text-xl">{tier.name}</p>
              <p className="font-mono text-[14px] tabular-nums text-sea">{tier.price}</p>
            </div>
            <p className="mt-2 text-[14.5px] leading-relaxed text-black/80">{tier.desc}</p>
            <ul className="mt-3 space-y-1 text-[14px] leading-relaxed text-black/65">
              {tier.perks.map((perk) => (
                <li key={perk} className="flex gap-2"><span aria-hidden className="text-sea">•</span><span>{perk}</span></li>
              ))}
            </ul>
            <div className="mt-auto pt-4">
              <button type="button" onClick={() => setSelected(tier)} aria-haspopup="dialog" className="w-full rounded-lg bg-sea px-4 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-sea-2 sm:w-auto">
                {copy.selectTier}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <SidePanel open={selected !== null} title={copy.pledgeTitle} onClose={() => setSelected(null)}>
        {selected ? <PledgeForm key={selected.id} tier={selected} copy={copy} /> : null}
      </SidePanel>
    </>
  );
}

function PledgeForm({ tier, copy }: { tier: PartnerTier; copy: Copy }) {
  const tForms = useTranslations("forms");
  const locale = useLocale() as Locale;
  const [business, setBusiness] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("busy");
    // The tier rides in the message, so the enquiry reads in full in Messages.
    const message = `${copy.tierLabel}: ${tier.name} (${tier.price})${note.trim() ? `\n\n${note.trim()}` : ""}`;
    const result = await submitInbound({ kind: "partner", name: business, email, phone: phone || undefined, message, locale, website }).catch(() => ({ ok: false }));
    setState(result.ok ? "done" : "error");
  };

  const inputClass = "mt-1 w-full rounded-lg border-[1.5px] border-line bg-paper px-3.5 py-3 text-[16px] outline-none focus:border-sea";
  const labelClass = "text-[14px] font-semibold";

  if (state === "done") {
    return (
      <div role="status" className="rounded-lg bg-paper px-5 py-5">
        <p className="text-[16px] font-bold text-sea">{copy.pledgeDone}</p>
        <p className="mt-1 text-[14.5px] leading-relaxed text-black/65">{copy.pledgeDoneSub}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-[14.5px] leading-relaxed text-black/65">{copy.pledgeLead}</p>
      <div className="rounded-lg bg-paper px-4 py-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-black/55">{copy.tierLabel}</p>
        <p className="mt-0.5 flex flex-wrap items-baseline justify-between gap-2">
          <span className="type-display text-xl">{tier.name}</span>
          <span className="font-mono text-[14px] tabular-nums text-sea">{tier.price}</span>
        </p>
      </div>
      <div>
        <label htmlFor="sp-business" className={labelClass}>{copy.businessLabel}</label>
        <input id="sp-business" type="text" required autoComplete="organization" maxLength={100} value={business} onChange={(e) => setBusiness(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="sp-email" className={labelClass}>{copy.repEmailLabel}</label>
        <input id="sp-email" type="email" required autoComplete="email" maxLength={100} value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="sp-phone" className={labelClass}>{copy.phoneLabel}</label>
        <input id="sp-phone" type="tel" autoComplete="tel" maxLength={40} value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="sp-note" className={labelClass}>{copy.noteLabel}</label>
        <textarea id="sp-note" rows={4} maxLength={1500} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
        <p className="mt-1 text-[13px] text-black/55">{copy.noteHint}</p>
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden value={website} onChange={(e) => setWebsite(e.target.value)} className="absolute -left-[9999px] h-px w-px opacity-0" />
      {state === "error" ? <p role="alert" className="text-[14px] font-semibold text-red-dark">{tForms("error")}</p> : null}
      <button type="submit" disabled={state === "busy"} className="w-full rounded-lg bg-red px-6 py-3.5 text-[16px] font-bold text-paper transition-colors hover:bg-red-dark disabled:opacity-60">
        {state === "busy" ? copy.pledgeSending : copy.pledgeButton}
      </button>
    </form>
  );
}
