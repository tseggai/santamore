import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { InboundForm } from "@/components/forms/InboundForm";
import { SponsorGrid, type PublicSponsor } from "@/components/partners/SponsorGrid";
import { partnersContent } from "@/content/site/partners";
import { formatCents } from "@/lib/money";
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
  amount_cents: number | null;
  campaign_title: string | null;
  event_name: string | null;
  starts_at: string | null;
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
      supabase.from("v_public_sponsors").select("supporter_slug, tier, is_in_kind, amount_cents, campaign_title, event_name, starts_at"),
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const content = partnersContent[locale as Locale];
  return { title: `${content.heroEyebrow} — Santamore`, description: content.heroLead };
}

const eyebrowClass = "font-mono text-[12px] uppercase tracking-[0.16em] text-sea/80";

export default async function PartnersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const content = partnersContent[locale as Locale];
  const { supporters, sponsorships, offers } = await loadSupporters();
  // Only supporters with something public to show: a signed deal or a live offer.
  const shown: PublicSponsor[] = supporters
    .filter((su) => sponsorships.some((d) => d.supporter_slug === su.slug) || offers.some((o) => o.supporter_slug === su.slug))
    .map((su) => {
      const deals = sponsorships.filter((d) => d.supporter_slug === su.slug);
      return {
        ...su,
        cash_cents: deals.reduce((sum, d) => sum + (d.is_in_kind ? 0 : (d.amount_cents ?? 0)), 0),
        in_kind: deals.some((d) => d.is_in_kind),
        tiers: [...new Set(deals.map((d) => d.tier).filter((tier): tier is string => Boolean(tier)))],
        offers: offers.filter((o) => o.supporter_slug === su.slug).length,
        gifts: deals.map((d) => ({
          amount_cents: d.is_in_kind ? null : d.amount_cents,
          in_kind: d.is_in_kind,
          tier: d.tier,
          target: d.event_name ?? d.campaign_title,
          date: d.starts_at,
        })),
        offerLinks: offers.filter((o) => o.supporter_slug === su.slug).map((o) => ({ href: `/izazovi/${o.slug}`, label: o.reward_label })),
      };
    });
  const cashTotal = shown.reduce((sum, su) => sum + su.cash_cents, 0);
  const money = (cents: number) => formatCents(cents, locale as Locale, { trimWholeCents: true });

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className={eyebrowClass}>{content.heroEyebrow}</p>
      <h1 className="type-display mt-3 max-w-2xl text-4xl leading-[1.1] sm:text-5xl">
        {content.heroTitle}
      </h1>
      <p className="mt-5 max-w-2xl text-[16.5px] leading-relaxed text-black/70">
        {content.heroLead}
      </p>

      {/* the 3.5% argument */}
      <section className="mt-10 rounded-brand bg-sand px-6 py-5">
        <p className={eyebrowClass}>{content.taxHeading}</p>
        <div className="mt-3 space-y-3">
          {content.tax.map((paragraph) => (
            <p key={paragraph} className="max-w-2xl text-[15.5px] leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      {/* who is already behind us — from the supporters record */}
      <section className="mt-12 border-t-[0.5px] border-line pt-10">
        <p className={eyebrowClass}>{content.supportersHeading}</p>
        <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-black/70">{content.supportersLead}</p>
        {shown.length === 0 ? (
          <p className="mt-4 text-[15px] text-black/60">{content.supportersEmpty}</p>
        ) : (
          <>
            {cashTotal > 0 ? (
              <p className="mt-4 text-[15px]">
                <span className="font-mono text-[20px] font-extrabold tabular-nums text-sea">{money(cashTotal)}</span>
                <span className="ml-2 text-black/60">{content.cashTotalLabel}</span>
              </p>
            ) : null}
            <div className="mt-6">
              <SponsorGrid sponsors={shown} inKindLabel={content.inKindLabel} size="lg" />
            </div>
          </>
        )}
      </section>

      {/* tier sheet */}
      <section className="mt-12 border-t-[0.5px] border-line pt-10">
        <p className={eyebrowClass}>{content.tiersHeading}</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {content.tiers.map((tier) => (
            <div
              key={tier.name}
              className={
                tier.flagship
                  ? "rounded-lg bg-red/8 px-5 py-5 sm:col-span-2"
                  : "rounded-lg bg-mist px-5 py-5"
              }
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="type-display text-xl">{tier.name}</p>
                <p className="font-mono text-[14px] tabular-nums text-sea">{tier.price}</p>
              </div>
              <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-black/70">
                {tier.desc}
              </p>
            </div>
          ))}
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

      {/* enquiry */}
      <section className="mt-12 border-t-[0.5px] border-line pt-10">
        <p className={eyebrowClass}>{content.formHeading}</p>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-black/70">
          {content.formLead}
        </p>
        <div className="mt-4 max-w-xl">
          <InboundForm kind="partner" />
        </div>
      </section>
    </div>
  );
}
