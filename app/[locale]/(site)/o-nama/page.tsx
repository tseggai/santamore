import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { aboutContent, type AboutContent } from "@/content/site/about";
import { howContent } from "@/content/site/how";
import { loadSitePage } from "@/lib/site-pages-server";
import { teamPhotoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

// Staff edit this page from the admin; the team comes from members' profiles.
export const dynamic = "force-dynamic";

interface TeamRow {
  id: string;
  kind: "officer" | "staff" | "board" | "committee" | "volunteer";
  full_name: string;
  title: string | null;
  quote: string | null;
  photo_path: string | null;
  years: number[];
  sort_order: number;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const content = await loadSitePage("about", locale as Locale, aboutContent[locale as Locale]);
  return { title: `${content.heroEyebrow} — Santamore`, description: content.heroLead };
}

const eyebrowClass = "font-mono text-[12px] uppercase tracking-[0.16em] text-sea/80";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const content: AboutContent = await loadSitePage("about", locale as Locale, aboutContent[locale as Locale]);
  const tNav = await getTranslations("nav");
  // The team: members who agreed to appear, else the shipped names and words.
  let people: TeamRow[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("v_public_team").select("id, kind, full_name, title, quote, photo_path, years, sort_order").order("sort_order").order("full_name");
    people = (data ?? []) as TeamRow[];
  } catch {
    people = [];
  }
  // Officers, staff and the bodies in the grid; volunteers by name below it.
  const team = people.filter((member) => member.kind !== "volunteer");
  const volunteers = people.filter((member) => member.kind === "volunteer");

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className={eyebrowClass}>{content.heroEyebrow}</p>
      <h1 className="type-display mt-3 text-4xl leading-[1.1] sm:text-5xl">
        {content.heroTitle}
      </h1>
      <p className="mt-5 max-w-2xl text-[16.5px] leading-relaxed text-black/70">
        {content.heroLead}
      </p>

      <section className="mt-12 border-t-[0.5px] border-line pt-10">
        <p className={eyebrowClass}>{content.storyHeading}</p>
        <div className="mt-4 space-y-4">
          {content.story.map((paragraph) => (
            <p key={paragraph} className="text-[16px] leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-12 border-t-[0.5px] border-line pt-10">
        <p className={eyebrowClass}>{content.nameHeading}</p>
        <div className="mt-4 space-y-4">
          {content.name.map((paragraph) => (
            <p key={paragraph} className="text-[16px] leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-12 border-t-[0.5px] border-line pt-10">
        <p className={eyebrowClass}>{content.structureHeading}</p>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed">
          {content.structureLead}
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {content.roles.map((role) => (
            <div key={role.name} className="rounded-brand bg-mist px-5 py-4">
              <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-red">
                {role.name}
              </p>
              <p className="type-display mt-1 text-xl">{role.who}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-black/65">{role.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 border-t-[0.5px] border-line pt-10">
        <p className={eyebrowClass}>{content.planHeading}</p>
        <div className="mt-4 space-y-4">
          {content.plan.map((paragraph) => (
            <p key={paragraph} className="text-[16px] leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
        <Link
          href="/transparentnost"
          className="mt-5 inline-flex h-11 items-center rounded-lg bg-mist px-5 text-[15px] font-semibold transition-colors hover:bg-mist-2 hover:text-sea"
        >
          {tNav("ledger")} →
        </Link>
      </section>

      <section className="mt-12 rounded-brand bg-sea px-6 py-6 text-paper">
        <h2 className="type-display text-2xl">{content.committeeHeading}</h2>
        <div className="mt-3 space-y-3">
          {content.committee.map((paragraph) => (
            <p key={paragraph} className="text-[15px] leading-relaxed text-paper/85">
              {paragraph}
            </p>
          ))}
        </div>
        <Link
          href="/kako-radimo"
          className="mt-5 inline-block rounded-lg bg-red px-5 py-3 text-[15px] font-bold text-paper transition-colors hover:bg-red-dark"
        >
          {howContent[locale as Locale].heroEyebrow} →
        </Link>
      </section>

      <section className="mt-12 border-t-[0.5px] border-line pt-10">
        <p className={eyebrowClass}>{content.teamHeading}</p>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed">{content.teamLead}</p>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {team.length > 0
            ? team.map((member) => {
                const photo = teamPhotoUrl(member.photo_path);
                return (
                  <li key={member.id} className="flex gap-4 rounded-brand bg-mist px-5 py-4">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- public bucket, arbitrary sizes
                      <img src={photo} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                    ) : null}
                    <div className="min-w-0">
                      <p className="type-display text-xl">{member.full_name}</p>
                      {member.title ? <p className="mt-0.5 text-[14px] text-black/60">{member.title}</p> : null}
                      {member.quote ? <p className="mt-2 text-[14.5px] leading-relaxed text-black/70">“{member.quote}”</p> : null}
                    </div>
                  </li>
                );
              })
            : content.team.map((member) => (
                <li key={member.name} className="rounded-brand bg-mist px-5 py-4">
                  <p className="type-display text-xl">{member.name}</p>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-black/70">“{member.quote}”</p>
                </li>
              ))}
        </ul>
        {volunteers.length > 0 ? (
          <div className="mt-6">
            <p className={eyebrowClass}>{tNav("aboutMenu.volunteer")}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {volunteers.map((member) => (
                <li key={member.id} className="rounded-lg bg-mist px-3 py-2 text-[14px] font-semibold">
                  {member.full_name}
                  {member.years.length > 0 ? <span className="ml-1.5 font-mono text-[12.5px] font-medium tabular-nums text-black/50">{member.years.join(", ")}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <p className="mt-10 max-w-xl rounded-brand bg-mist px-4 py-3 text-[13px] text-sea">
        {content.peopleNote}
      </p>
    </div>
  );
}
