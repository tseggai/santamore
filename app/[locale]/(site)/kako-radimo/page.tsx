import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { howContent } from "@/content/site/how";
import { Link } from "@/i18n/navigation";
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
  const content = howContent[locale as Locale];
  return { title: `${content.heroEyebrow} — Santamore`, description: content.heroLead };
}

const eyebrowClass = "font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80";

export default async function HowPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const content = howContent[locale as Locale];

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className={eyebrowClass}>{content.heroEyebrow}</p>
      <h1 className="type-display mt-3 text-4xl leading-[1.1] sm:text-5xl">
        {content.heroTitle}
      </h1>
      <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-ink/70">
        {content.heroLead}
      </p>

      {/* the two funds, side by side — the core promise */}
      <section className="mt-12 border-t border-line-soft pt-10">
        <p className={eyebrowClass}>{content.fundsHeading}</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {content.funds.map((fund, index) => (
            <div
              key={fund.name}
              className={
                index === 0
                  ? "rounded-brand border-[1.5px] border-red px-5 py-5"
                  : "rounded-brand border-[1.5px] border-line px-5 py-5"
              }
            >
              <p className="type-display text-2xl">{fund.name}</p>
              <p className="mt-3 text-[13.5px] leading-relaxed">
                <span aria-hidden className="mr-1.5 font-mono text-sea">↓</span>
                {fund.inFlows}
              </p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed">
                <span aria-hidden className="mr-1.5 font-mono text-sea">↑</span>
                {fund.outFlows}
              </p>
              <p
                className={
                  index === 0
                    ? "mt-3 text-[13.5px] font-semibold leading-relaxed text-red"
                    : "mt-3 text-[13.5px] font-semibold leading-relaxed text-sea"
                }
              >
                {fund.rule}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[13.5px] leading-relaxed text-ink/65">{content.fundsNote}</p>
      </section>

      {/* 70 / 20 / 10 */}
      <section className="mt-12 border-t border-line-soft pt-10">
        <p className={eyebrowClass}>{content.splitHeading}</p>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed">{content.splitLead}</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {content.split.map((part) => (
            <div key={part.pct}>
              <p className="type-display text-5xl text-red">{part.pct}</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink/70">{part.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-4">
          {content.splitReasons.map((reason) => (
            <div key={reason.title}>
              <p className="text-[14px] font-semibold">{reason.title}</p>
              <p className="mt-0.5 max-w-2xl text-[13.5px] leading-relaxed text-ink/65">
                {reason.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* the ledger */}
      <section className="mt-12 rounded-brand bg-sea px-6 py-7 text-paper">
        <h2 className="type-display text-2xl">{content.ledgerHeading}</h2>
        <p className="mt-2 text-[13.5px] text-paper/70">{content.ledgerLead}</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {content.ledgerPoints.map((point) => (
            <div key={point.title}>
              <p className="text-[14px] font-semibold">{point.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-paper/75">{point.desc}</p>
            </div>
          ))}
        </div>
        <Link
          href="/transparentnost"
          className="mt-6 inline-block rounded-xl bg-red px-5 py-3 text-[14px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark"
        >
          {content.ledgerCta}
        </Link>
      </section>

      {/* who decides */}
      <section className="mt-12 border-t border-line-soft pt-10">
        <p className={eyebrowClass}>{content.decideHeading}</p>
        <div className="mt-4 space-y-4">
          {content.decide.map((paragraph) => (
            <p key={paragraph} className="max-w-2xl text-[15px] leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
        <Link
          href="/o-nama"
          className="mt-5 inline-block text-[13.5px] font-semibold text-sea underline decoration-line underline-offset-2 hover:text-sea-2"
        >
          {content.decideCta}
        </Link>
      </section>
    </div>
  );
}
