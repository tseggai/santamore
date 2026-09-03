import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { InboundForm } from "@/components/forms/InboundForm";
import { partnersContent } from "@/content/site/partners";
import { routing, type Locale } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
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

const eyebrowClass = "font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80";

export default async function PartnersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const content = partnersContent[locale as Locale];

  return (
    <div className="mx-auto max-w-4xl px-5 py-14">
      <p className={eyebrowClass}>{content.heroEyebrow}</p>
      <h1 className="type-display mt-3 max-w-2xl text-4xl leading-[1.1] sm:text-5xl">
        {content.heroTitle}
      </h1>
      <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-ink/70">
        {content.heroLead}
      </p>

      {/* the 3.5% argument */}
      <section className="mt-10 rounded-brand bg-sand px-6 py-5">
        <p className={eyebrowClass}>{content.taxHeading}</p>
        <div className="mt-3 space-y-3">
          {content.tax.map((paragraph) => (
            <p key={paragraph} className="max-w-2xl text-[14.5px] leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      {/* tier sheet */}
      <section className="mt-12 border-t border-line-soft pt-10">
        <p className={eyebrowClass}>{content.tiersHeading}</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {content.tiers.map((tier) => (
            <div
              key={tier.name}
              className={
                tier.flagship
                  ? "rounded-brand border-[1.5px] border-red px-5 py-5 sm:col-span-2"
                  : "rounded-brand border-[1.5px] border-line px-5 py-5"
              }
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="type-display text-xl">{tier.name}</p>
                <p className="font-mono text-[13px] tabular-nums text-sea">{tier.price}</p>
              </div>
              <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink/70">
                {tier.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* what a sponsor actually gets */}
      <section className="mt-12 border-t border-line-soft pt-10">
        <p className={eyebrowClass}>{content.deliverHeading}</p>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed">{content.deliverLead}</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {content.deliver.map((item, index) => (
            <div key={item.title}>
              <span className="font-mono text-[11px] text-red">0{index + 1}</span>
              <p className="mt-0.5 text-[14.5px] font-semibold">{item.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink/65">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* enquiry */}
      <section className="mt-12 border-t border-line-soft pt-10">
        <p className={eyebrowClass}>{content.formHeading}</p>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-ink/70">
          {content.formLead}
        </p>
        <div className="mt-4 max-w-xl">
          <InboundForm kind="partner" />
        </div>
      </section>
    </div>
  );
}
