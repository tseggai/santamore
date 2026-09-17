import type { ReactNode } from "react";

import { formatCents } from "@/lib/money";
import { sortSponsors, type PublicSponsor } from "@/lib/sponsors";
import { supporterLogoUrl } from "@/lib/storage";
import type { Locale } from "@/i18n/routing";

export type { PublicSponsor } from "@/lib/sponsors";

/**
 * Sponsor tiles: logo, name, tier and the figure. Server-renderable; every
 * page that lists supporters (landing, Partners, a year on Transparency)
 * uses this so sponsors look the same everywhere.
 */
export function SponsorGrid({
  sponsors,
  locale,
  inKindLabel,
  size = "md",
  footer,
}: {
  sponsors: PublicSponsor[];
  locale: Locale;
  inKindLabel: string;
  size?: "md" | "lg";
  /** Extra line under a tile, e.g. challenge offer links on the Partners page. */
  footer?: (sponsor: PublicSponsor) => ReactNode;
}) {
  const lg = size === "lg";
  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });
  return (
    <ul className={`grid gap-3 ${lg ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"}`}>
      {sortSponsors(sponsors).map((su) => {
        const logo = supporterLogoUrl(su.logo_path);
        const figure = su.cash_cents > 0 ? money(su.cash_cents) : su.in_kind ? inKindLabel : null;
        const name = su.website ? (
          <a href={su.website} target="_blank" rel="noopener" className="hover:text-sea">{su.name}</a>
        ) : (
          su.name
        );
        return (
          <li key={su.id} className="flex flex-col rounded-lg bg-mist p-3 text-center">
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
            <p className={`mt-3 ${lg ? "text-[15.5px]" : "text-[14.5px]"} font-bold leading-snug`}>{name}</p>
            {su.tiers.length > 0 ? (
              <p className="mt-0.5 text-[14px] capitalize text-black/60">{su.tiers.join(" · ")}</p>
            ) : null}
            {figure ? (
              <p className={`mt-1 ${su.cash_cents > 0 ? "font-mono tabular-nums font-bold text-sea" : "text-black/60"} text-[14px]`}>
                {figure}
              </p>
            ) : null}
            {footer ? footer(su) : null}
          </li>
        );
      })}
    </ul>
  );
}
