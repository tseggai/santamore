import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { faqContent } from "@/content/site/faq";
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
  const content = faqContent[locale as Locale];
  return { title: `${content.heroEyebrow} — Santamore`, description: content.heroLead };
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const content = faqContent[locale as Locale];

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
        {content.heroEyebrow}
      </p>
      <h1 className="type-display mt-3 text-4xl leading-[1.1] sm:text-5xl">
        {content.heroTitle}
      </h1>
      <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-ink/70">
        {content.heroLead}
      </p>

      <div className="mt-10 space-y-3">
        {content.items.map((item) => (
          // Native disclosure: keyboard accessible for free, no JS.
          <details
            key={item.q}
            className="group rounded-brand border-[1.5px] border-line px-5 py-4 open:border-sea"
          >
            <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
              {item.q}
              <span
                aria-hidden
                className="font-mono text-sea transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink/75">
              {item.a}
            </p>
            {item.link ? (
              <Link
                href={item.link.href}
                className="mt-2 inline-block text-[13.5px] font-semibold text-sea underline decoration-line underline-offset-2 hover:text-sea-2"
              >
                {item.link.label} →
              </Link>
            ) : null}
          </details>
        ))}
      </div>
    </div>
  );
}
