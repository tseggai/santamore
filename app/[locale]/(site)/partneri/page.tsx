import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { SponsorsByYear } from "@/components/partners/SponsorsByYear";
import { TierSheet } from "@/components/partners/TierSheet";
import type { PublicSponsor } from "@/components/partners/SponsorGrid";
import { partnersContent } from "@/content/site/partners";
import { createClient } from "@/lib/supabase/server";
import { routing, type Locale } from "@/i18n/routing";

// Live supporters on every request.
export const dynamic = "force-dynamic";

interface SupporterRow {
  id: string;
  name: string;
  slug: string;
  kind: "sponsor" | "donor";
  logo_path: string | null;
  website: string | null;
}

interface SponsorshipRow {
  supporter_slug: string | null;
  tier: string | null;
  is_in_kind: boolean;
  fund: "operations" | "impact";
  amount_cents: number | null;
  campaign_title: string | null;
  event_name: string | null;
  starts_at: string | null;
  year: number | null;
}

interface OfferRow {
  slug: string;
  supporter_slug: string | null;
  reward_label: string;
  title: string;
}

async function loadSupporters() {
  try {
    const supabase = await createClient();
    const [{ data: supporters }, { data: sponsorships }, { data: offers }] = await Promise.all([
      supabase.from("v_public_supporters").select("id, name, slug, kind, logo_path, website").eq("kind", "sponsor").order("name"),
      supabase.from("v_public_sponsors").select("supporter_slug, tier, is_in_kind, fund, amount_cents, campaign_title, event_name, starts_at, year"),
      supabase.from("v_public_perk_challenges").select("slug, supporter_slug, reward_label, title"),
    ]);
    return {
      supporters: (supporters ?? []) as SupporterRow[],
      sponsorships: (sponsorships ?? []) as SponsorshipRow[],
      offers: (offers ?? []) as OfferRow[],
    };
  } catch {
    return { supporters: [], sponsorships: [], offers: [] };
  }
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const content = partnersContent[locale as Locale];
  return { title: `${content.heroTitle} — Santamore`, description: content.heroLead };
}

const eyebrowClass = "font-mono text-[12px] uppercase tracking-[0.16em] text-sea/80";

export default async function PartnersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const content = partnersContent[locale as Locale];
  const { supporters, sponsorships, offers } = await loadSupporters();
  const currentYear = new Date().getFullYear();

  // One tile per supporter and year, from the deals of that year; a live offer puts a supporter in the current year.
  const byYear: Record<string, PublicSponsor[]> = {};
  const years = new Set<number>([currentYear, ...sponsorships.map((d) => d.year).filter((y): y is number => y != null)]);
  for (const year of years) {
    const tiles = supporters.flatMap((su) => {
      const deals = sponsorships.filter((d) => d.supporter_slug === su.slug && d.year === year);
      const live = year === currentYear ? offers.filter((o) => o.supporter_slug === su.slug) : [];
      if (deals.length === 0 && live.length === 0) return [];
      return [{
        ...su,
        cash_cents: deals.reduce((sum, d) => sum + (d.is_in_kind ? 0 : (d.amount_cents ?? 0)), 0),
        in_kind: deals.some((d) => d.is_in_kind),
        tiers: [...new Set(deals.map((d) => d.tier).filter((tier): tier is string => Boolean(tier)))],
        offers: live.length,
        gifts: deals.map((d) => ({ amount_cents: d.is_in_kind ? null : d.amount_cents, in_kind: d.is_in_kind, tier: d.tier, target: d.event_name ?? d.campaign_title, date: d.starts_at, fund: d.fund })),
        offerLinks: live.map((o) => ({ href: `/izazovi/${o.slug}`, label: o.reward_label })),
      }];
    });
    byYear[String(year)] = tiles;
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className={eyebrowClass}>{content.heroEyebrow}</p>
      <h1 className="type-display mt-3 max-w-2xl text-4xl leading-[1.1] sm:text-5xl">{content.heroTitle}</h1>
      <p className="mt-5 max-w-2xl text-[16.5px] leading-relaxed text-black/70">{content.heroLead}</p>
      {/* the 3.5% allowance, one line */}
      <p className="mt-4 max-w-2xl text-[15.5px] italic leading-relaxed text-black/70">{content.taxNote}</p>

      {/* tier sheet: every tier opens the pledge */}
      <section id="nivoi" className="mt-12 scroll-mt-24 border-t-[0.5px] border-line pt-10">
        <p className={eyebrowClass}>{content.tiersHeading}</p>
        <div className="mt-5">
          <TierSheet tiers={content.tiers} copy={content} />
        </div>
      </section>

      {/* sponsors, one year at a time */}
      <section id="sponzori" className="mt-12 scroll-mt-24 border-t-[0.5px] border-line pt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={eyebrowClass}>{content.sponsorsHeading}</p>
            <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-black/70">{content.sponsorsLead}</p>
          </div>
        </div>
        <div className="mt-5">
          <SponsorsByYear byYear={byYear} currentYear={currentYear} labels={{ year: content.yearLabel, current: content.currentLabel, empty: content.sponsorsEmpty, inKind: content.inKindLabel }} />
        </div>
      </section>

      {/* what a sponsor actually gets */}
      <section className="mt-12 border-t-[0.5px] border-line pt-10">
        <p className={eyebrowClass}>{content.deliverHeading}</p>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed">{content.deliverLead}</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {content.deliver.map((item, index) => (
            <div key={item.title}>
              <span className="font-mono text-[12px] text-red">0{index + 1}</span>
              <p className="mt-0.5 text-[15.5px] font-semibold">{item.title}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-black/65">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
