"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { GiftDialog } from "@/components/ledger/GiftDialog";
import { formatCents } from "@/lib/money";
import type { DonorEntry } from "@/lib/sponsors";
import type { Locale } from "@/i18n/routing";

/**
 * The donor wall of a year: one chip per name with the total given; a chip
 * opens the detail of each gift and where the year's money went.
 */
export function DonorWall({ donors, wentTo }: { donors: DonorEntry[]; wentTo: string[] }) {
  const t = useTranslations("years");
  const locale = useLocale() as Locale;
  const [selected, setSelected] = useState<DonorEntry | null>(null);
  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });

  return (
    <>
      <ul className="mt-2 flex flex-wrap gap-2">
        {donors.map((donor) => (
          <li key={donor.name}>
            <button
              type="button"
              onClick={() => setSelected(donor)}
              aria-haspopup="dialog"
              className="inline-flex items-baseline gap-2 rounded-lg bg-mist px-3 py-2 text-[14px] transition-colors hover:bg-mist-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea"
            >
              <span className="font-semibold">{donor.name}</span>
              {donor.total_cents != null ? <span className="font-mono text-[13px] tabular-nums text-black/60">{money(donor.total_cents)}</span> : null}
              {donor.gifts.length > 1 ? <span className="text-[12.5px] text-black/45">×{donor.gifts.length}</span> : null}
            </button>
          </li>
        ))}
      </ul>

      <GiftDialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
        eyebrow={t("donorEyebrow")}
        gifts={selected?.gifts ?? []}
        note={t("giftDonationNote")}
        extra={
          wentTo.length > 0 ? (
            <p className="mt-2 text-[13.5px] leading-relaxed text-black/60">
              <span className="font-semibold text-black/70">{t("wentTo")}:</span> {wentTo.join(" · ")}
            </p>
          ) : null
        }
      />
    </>
  );
}
