import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { BeneficiaryStories, type PublicBeneficiary } from "@/components/beneficiaries/BeneficiaryStories";
import { PeopleStrip, type PublicPerson } from "@/components/people/PeopleStrip";
import { PageSections, loadAssetPools } from "@/components/site/PageSections";
import { aboutContent, type AboutContent } from "@/content/site/about";
import { pickIds, pickPeople, type IdPick, type PeoplePick } from "@/lib/site-pages";
import { supporterLogoUrl } from "@/lib/storage";
import { howContent } from "@/content/site/how";
import { loadSitePage } from "@/lib/site-pages-server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

// Staff edit this page from the admin; the team comes from members' profiles.
export const dynamic = "force-dynamic";

type TeamRow = PublicPerson;
type AboutWithPicks = AboutContent & {
  boardPeople?: PeoplePick;
  committeePeople?: PeoplePick;
  teamPeople?: PeoplePick;
  volunteerPeople?: PeoplePick;
  featuredBeneficiaries?: IdPick;
  featuredSupporters?: IdPick;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const { sections, content } = await loadSitePage("about", locale as Locale, aboutContent[locale as Locale]);
  const hero = sections?.find((s) => s.type === "hero")?.text;
  const title = (hero && typeof hero.eyebrow === "string" && hero.eyebrow) || content.heroEyebrow;
  const description = (hero && typeof hero.lead === "string" && hero.lead) || content.heroLead;
  return { title: `${title} — Santamore`, description };
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
  const loaded = await loadSitePage("about", locale as Locale, aboutContent[locale as Locale]);
  const content: AboutWithPicks = loaded.content;
  const [tNav, tBeneficiaries] = await Promise.all([getTranslations("nav"), getTranslations("beneficiaries")]);
  // Saved as sections: the page is whatever staff composed.
  if (loaded.sections) {
    const pools = await loadAssetPools(loaded.sections);
    return (
      <div className="mx-auto max-w-3xl px-5 py-14">
        <PageSections sections={loaded.sections} pools={pools} locale={locale as Locale} labels={{ more: tBeneficiaries("more"), cause: tBeneficiaries("cause") }} />
      </div>
    );
  }
  // The team: members who agreed to appear, else the shipped names and words.
  let people: TeamRow[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("v_public_team").select("id, kind, full_name, title, quote, photo_path, years, sort_order").order("sort_order").order("full_name");
    people = (data ?? []) as TeamRow[];
  } catch {
    people = [];
  }
  // What each section shows: the people, supporters and beneficiaries attached
  // to it in the admin, else the sensible default from the team records.
  const picked = (pick: PeoplePick | undefined, fallback: () => TeamRow[]) => {
    const rows = pickPeople(pick, people);
    return rows.length > 0 ? rows : fallback();
  };
  const board = pickPeople(content.boardPeople, people);
  const committee = pickPeople(content.committeePeople, people);
  const team = picked(content.teamPeople, () => people.filter((member) => member.kind !== "volunteer"));
  const volunteers = picked(content.volunteerPeople, () => people.filter((member) => member.kind === "volunteer"));
  let featuredBeneficiaries: PublicBeneficiary[] = [];
  let featuredSupporters: { id: string; name: string; logo_path: string | null; website: string | null }[] = [];
  try {
    const supabase = await createClient();
    const wantBeneficiaries = content.featuredBeneficiaries?.ids ?? [];
    const wantSupporters = content.featuredSupporters?.ids ?? [];
    const [b, s] = await Promise.all([
      wantBeneficiaries.length > 0
        ? supabase.from("v_public_beneficiaries").select("id, slug, name, website, photo_path, story, campaign_slug, campaign_title").in("id", wantBeneficiaries)
        : Promise.resolve({ data: [] as PublicBeneficiary[] }),
      wantSupporters.length > 0
        ? supabase.from("v_public_supporters").select("id, name, logo_path, website").in("id", wantSupporters)
        : Promise.resolve({ data: [] as { id: string; name: string; logo_path: string | null; website: string | null }[] }),
    ]);
    featuredBeneficiaries = pickIds(content.featuredBeneficiaries, (b.data ?? []) as PublicBeneficiary[]);
    featuredSupporters = pickIds(content.featuredSupporters, (s.data ?? []) as typeof featuredSupporters);
  } catch {
    featuredBeneficiaries = [];
    featuredSupporters = [];
  }

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
        {board.length > 0 ? (
          <div className="mt-5">
            <PeopleStrip people={board} />
          </div>
        ) : null}
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
        {committee.length > 0 ? (
          <div className="mt-4">
            <PeopleStrip people={committee} dark />
          </div>
        ) : null}
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
        <div className="mt-5">
          {team.length > 0 ? (
            <PeopleStrip people={team} cards />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {content.team.map((member) => (
                <li key={member.name} className="rounded-brand bg-mist px-5 py-4">
                  <p className="type-display text-xl">{member.name}</p>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-black/70">“{member.quote}”</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        {volunteers.length > 0 ? (
          <div className="mt-6">
            <p className={eyebrowClass}>{tNav("aboutMenu.volunteer")}</p>
            <div className="mt-2">
              <PeopleStrip people={volunteers} showYears />
            </div>
          </div>
        ) : null}
      </section>

      {featuredBeneficiaries.length > 0 ? (
        <section className="mt-12 border-t-[0.5px] border-line pt-10">
          <p className={eyebrowClass}>{tBeneficiaries("eyebrow")}</p>
          <h2 className="type-display mt-3 text-2xl">{tBeneficiaries("title")}</h2>
          <div className="mt-6">
            <BeneficiaryStories rows={featuredBeneficiaries} locale={locale as Locale} labels={{ more: tBeneficiaries("more"), cause: tBeneficiaries("cause") }} />
          </div>
        </section>
      ) : null}

      {featuredSupporters.length > 0 ? (
        <section className="mt-12 border-t-[0.5px] border-line pt-10">
          <p className={eyebrowClass}>{tNav("aboutMenu.partners")}</p>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {featuredSupporters.map((su) => {
              const logo = supporterLogoUrl(su.logo_path);
              const inner = (
                <>
                  <span className="flex h-16 items-center justify-center rounded-lg bg-paper px-3">
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- public bucket, arbitrary sizes
                      <img src={logo} alt="" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span aria-hidden className="type-display text-[22px] text-sea">{su.name.charAt(0).toUpperCase()}</span>
                    )}
                  </span>
                  <span className="mt-2 block text-[14px] font-bold">{su.name}</span>
                </>
              );
              return (
                <li key={su.id} className="rounded-lg bg-mist p-3 text-center">
                  {su.website ? <a href={su.website} target="_blank" rel="noopener" className="block hover:text-sea">{inner}</a> : inner}
                </li>
              );
            })}
          </ul>
          <Link href="/partneri" className="mt-5 inline-flex h-11 items-center rounded-lg bg-mist px-5 text-[15px] font-semibold transition-colors hover:bg-mist-2 hover:text-sea">
            {tNav("aboutMenu.partners")} →
          </Link>
        </section>
      ) : null}

      <p className="mt-10 max-w-xl rounded-brand bg-mist px-4 py-3 text-[13px] text-sea">
        {content.peopleNote}
      </p>
    </div>
  );
}
