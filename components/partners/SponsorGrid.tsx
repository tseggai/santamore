"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { GiftDialog } from "@/components/ledger/GiftDialog";
import { formatCents } from "@/lib/money";
import { sortSponsors, type PublicSponsor } from "@/lib/sponsors";
import { supporterLogoUrl } from "@/lib/storage";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export type { PublicSponsor } from "@/lib/sponsors";

/**
 * Sponsor tiles: logo, name, tier and the figure. Every page that lists
 * sponsors (landing, Partners, a year on Transparency) uses this so they
 * look the same everywhere. A tile whose row carries its gifts opens the
 * detail of each gift; otherwise the name links to the website.
 */
export function SponsorGrid({
  sponsors,
  inKindLabel,
  size = "md",
  showAmounts = true,
}: {
  sponsors: PublicSponsor[];
  inKindLabel: string;
  size?: "md" | "lg";
  /** The landing page shows who, not how much; the partners and money pages show both. */
  showAmounts?: boolean;
}) {
  const t = useTranslations("years");
  const locale = useLocale() as Locale;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = sponsors.find((su) => su.id === selectedId) ?? null;
  const lg = size === "lg";
  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });

  return (
    <>
      <ul className={`grid gap-3 ${lg ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"}`}>
        {sortSponsors(sponsors).map((su) => {
          const logo = supporterLogoUrl(su.logo_path);
          const figure = !showAmounts ? null : su.cash_cents > 0 ? money(su.cash_cents) : su.in_kind ? inKindLabel : null;
          const clickable = Boolean(su.gifts && su.gifts.length > 0);
          const body = (
            <>
              <div className={`flex ${lg ? "h-24" : "h-20"} items-center justify-center rounded-lg bg-paper px-3`}>
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- public bucket, arbitrary sizes
                  <img src={logo} alt="" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span aria-hidden className={`type-display ${lg ? "text-[30px]" : "text-[24px]"} text-sea`}>
                    {su.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <p className={`mt-3 ${lg ? "text-[15.5px]" : "text-[14.5px]"} font-bold leading-snug`}>
                {!clickable && su.website ? (
                  <a href={su.website} target="_blank" rel="noopener" className="hover:text-sea">{su.name}</a>
                ) : (
                  su.name
                )}
              </p>
              {su.tiers.length > 0 ? <p className="mt-0.5 text-[14px] capitalize text-black/60">{su.tiers.join(" · ")}</p> : null}
              {figure ? (
                <p className={`mt-1 ${su.cash_cents > 0 ? "font-mono tabular-nums font-bold text-sea" : "text-black/60"} text-[14px]`}>{figure}</p>
              ) : null}
            </>
          );
          return (
            <li key={su.id} className="flex">
              {clickable ? (
                <button
                  type="button"
                  onClick={() => setSelectedId(su.id)}
                  aria-haspopup="dialog"
                  className="flex w-full flex-col rounded-lg bg-mist p-3 text-center transition-colors hover:bg-mist-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea"
                >
                  {body}
                </button>
              ) : (
                <div className="flex w-full flex-col rounded-lg bg-mist p-3 text-center">{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      <GiftDialog
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        title={selected?.name ?? ""}
        eyebrow={selected?.kind === "donor" ? t("donorEyebrow") : t("sponsorEyebrow")}
        logo={supporterLogoUrl(selected?.logo_path ?? null)}
        website={selected?.website}
        gifts={selected?.gifts ?? []}
        note={selected?.kind === "donor" ? t("giftDonationNote") : t("giftSponsorNote")}
        extra={
          selected && selected.offerLinks && selected.offerLinks.length > 0 ? (
            <ul className="mt-3 space-y-1 text-[14px]">
              {selected.offerLinks.map((offer) => (
                <li key={offer.href}>
                  <span className="text-black/55">{t("offerLabel")}: </span>
                  <Link href={offer.href} className="font-semibold text-sea underline underline-offset-2">{offer.label}</Link>
                </li>
              ))}
            </ul>
          ) : null
        }
      />
    </>
  );
}
