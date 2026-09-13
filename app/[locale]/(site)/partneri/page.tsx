import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { InboundForm } from "@/components/forms/InboundForm";
import { partnersContent } from "@/content/site/partners";
import { supporterLogoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

// Live supporters on every request.
export const dynamic = "force-dynamic";

interface SupporterRow {
  id: string;
  name: string;
  slug: string;
  logo_path: string | null;
  website: string | null;
}

interface SponsorshipRow {
  supporter_slug: string | null;
  tier: string | null;
  is_in_kind: boolean;
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
      supabase.from("v_public_supporters").select("id, name, slug, logo_path, website").order("name"),
      supabase.from("v_public_sponsors").select("supporter_slug, tier, is_in_kind"),
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
  const shown = supporters.filter(
    (su) => sponsorships.some((d) => d.supporter_slug === su.slug) || offers.some((o) => o.supporter_slug === su.slug),
  );

  return (
    <div className="mx-auto max-w-4xl px-5 py-14">
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
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {shown.map((su) => {
              const deals = sponsorships.filter((d) => d.supporter_slug === su.slug);
              const theirOffers = offers.filter((o) => o.supporter_slug === su.slug);
              const logo = supporterLogoUrl(su.logo_path);
              return (
                <li key={su.id} className="flex gap-4 rounded-lg bg-mist p-4">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- public bucket, arbitrary sizes
                    <img src={logo} alt="" className="h-16 w-16 shrink-0 rounded-lg bg-paper object-contain" />
                  ) : (
                    <span aria-hidden className="type-display flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-paper text-[22px] text-sea">
                      {su.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-[16px] font-bold">
                      {su.website ? (
                        <a href={su.website} target="_blank" rel="noopener" className="hover:text-sea">{su.name}</a>
                      ) : (
                        su.name
                      )}
                    </p>
                    {deals.length > 0 ? (
                      <p className="mt-0.5 text-[14px] text-black/65">
                        {content.sponsorLabel}
                        {deals.some((d) => d.tier) ? ` · ${[...new Set(deals.map((d) => d.tier).filter(Boolean))].join(", ")}` : ""}
                        {deals.every((d) => d.is_in_kind) ? ` · ${content.inKindLabel}` : ""}
                      </p>
                    ) : null}
                    {theirOffers.length > 0 ? (
                      <ul className="mt-1 space-y-0.5 text-[14px]">
                        {theirOffers.map((offer) => (
                          <li key={offer.slug}>
                            <span className="text-black/55">{content.offersLabel}: </span>
                            <Link href={`/izazovi/${offer.slug}`} className="font-semibold text-sea underline underline-offset-2">
                              {offer.reward_label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
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
