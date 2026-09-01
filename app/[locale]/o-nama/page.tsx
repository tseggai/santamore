import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { aboutContent } from "@/content/site/about";
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
  const content = aboutContent[locale as Locale];
  return { title: `${content.heroEyebrow} — Santamore`, description: content.heroLead };
}

const eyebrowClass = "font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const content = aboutContent[locale as Locale];

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className={eyebrowClass}>{content.heroEyebrow}</p>
      <h1 className="type-display mt-3 text-4xl leading-[1.1] sm:text-5xl">
        {content.heroTitle}
      </h1>
      <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-ink/70">
        {content.heroLead}
      </p>

      <section className="mt-12 border-t border-line-soft pt-10">
        <p className={eyebrowClass}>{content.storyHeading}</p>
        <div className="mt-4 space-y-4">
          {content.story.map((paragraph) => (
            <p key={paragraph} className="text-[15px] leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-12 border-t border-line-soft pt-10">
        <p className={eyebrowClass}>{content.nameHeading}</p>
        <div className="mt-4 space-y-4">
          {content.name.map((paragraph) => (
            <p key={paragraph} className="text-[15px] leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-12 border-t border-line-soft pt-10">
        <p className={eyebrowClass}>{content.structureHeading}</p>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed">
          {content.structureLead}
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {content.roles.map((role) => (
            <div key={role.name} className="rounded-brand border-[1.5px] border-line px-5 py-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-red">
                {role.name}
              </p>
              <p className="type-display mt-1 text-xl">{role.who}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink/65">{role.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-brand bg-sea px-6 py-6 text-paper">
        <h2 className="type-display text-2xl">{content.committeeHeading}</h2>
        <div className="mt-3 space-y-3">
          {content.committee.map((paragraph) => (
            <p key={paragraph} className="text-[14px] leading-relaxed text-paper/85">
              {paragraph}
            </p>
          ))}
        </div>
        <Link
          href="/kako-radimo"
          className="mt-5 inline-block rounded-xl bg-red px-5 py-3 text-[14px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark"
        >
          {howContent[locale as Locale].heroEyebrow} →
        </Link>
      </section>

      <p className="mt-10 max-w-xl rounded-brand border-[1.5px] border-dashed border-sea bg-mist px-4 py-3 text-[12px] text-sea">
        {content.peopleNote}
      </p>
    </div>
  );
}
