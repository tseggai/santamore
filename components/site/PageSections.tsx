import { BeneficiaryStories, type PublicBeneficiary } from "@/components/beneficiaries/BeneficiaryStories";
import { PeopleStrip, type PublicPerson } from "@/components/people/PeopleStrip";
import { pickIds, pickPeople } from "@/lib/site-pages";
import type { Section } from "@/lib/site-sections";
import { supporterLogoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export interface PublicSupporterTile {
  id: string;
  name: string;
  logo_path: string | null;
  website: string | null;
}

/** Everything the sections' assets can point to, loaded once per page. */
export interface AssetPools {
  people: PublicPerson[];
  supporters: PublicSupporterTile[];
  beneficiaries: PublicBeneficiary[];
}

/** Loads only the pools the sections use; any trouble leaves a pool empty. */
export async function loadAssetPools(sections: Section[]): Promise<AssetPools> {
  const wantsPeople = sections.some((s) => s.assets?.people && (s.assets.people.kinds.length > 0 || s.assets.people.ids.length > 0));
  const supporterIds = [...new Set(sections.flatMap((s) => s.assets?.supporters?.ids ?? []))];
  const beneficiaryIds = [...new Set(sections.flatMap((s) => s.assets?.beneficiaries?.ids ?? []))];
  const pools: AssetPools = { people: [], supporters: [], beneficiaries: [] };
  try {
    const supabase = await createClient();
    const [people, supporters, beneficiaries] = await Promise.all([
      wantsPeople ? supabase.from("v_public_team").select("id, kind, full_name, title, quote, photo_path, years, sort_order").order("sort_order").order("full_name") : Promise.resolve({ data: [] }),
      supporterIds.length > 0 ? supabase.from("v_public_supporters").select("id, name, logo_path, website").in("id", supporterIds) : Promise.resolve({ data: [] }),
      beneficiaryIds.length > 0
        ? supabase.from("v_public_beneficiaries").select("id, slug, name, website, photo_path, story, campaign_slug, campaign_title").in("id", beneficiaryIds)
        : Promise.resolve({ data: [] }),
    ]);
    pools.people = (people.data ?? []) as PublicPerson[];
    pools.supporters = (supporters.data ?? []) as PublicSupporterTile[];
    pools.beneficiaries = (beneficiaries.data ?? []) as PublicBeneficiary[];
  } catch {
    // leave the pools empty
  }
  return pools;
}

const eyebrowClass = "font-mono text-[12px] uppercase tracking-[0.16em] text-sea/80";
const sectionClass = "mt-12 border-t-[0.5px] border-line pt-10";
const button = "mt-5 inline-flex h-11 items-center rounded-lg bg-mist px-5 text-[15px] font-semibold transition-colors hover:bg-mist-2 hover:text-sea";

const str = (v: unknown) => (typeof v === "string" ? v : "");
const lines = (v: unknown) => (Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === "string") : []);
const records = (v: unknown) => (Array.isArray(v) ? (v as unknown[]).filter((x): x is Record<string, string> => Boolean(x) && typeof x === "object") : []);

/** Renders a page's sections in the site's own shapes, each with its assets. */
export function PageSections({ sections, pools, locale, labels }: { sections: Section[]; pools: AssetPools; locale: Locale; labels: { more: string; cause: string } }) {
  return (
    <>
      {sections.map((section, index) => {
        const t = section.text;
        const dark = section.type === "callout";
        const assets = (
          <SectionAssets section={section} pools={pools} locale={locale} labels={labels} dark={dark} />
        );
        const buttonEl =
          section.href && str(t.buttonLabel) ? (
            <Link href={section.href} className={dark ? "mt-5 inline-block rounded-lg bg-red px-5 py-3 text-[15px] font-bold text-paper transition-colors hover:bg-red-dark" : button}>
              {str(t.buttonLabel)} →
            </Link>
          ) : null;

        switch (section.type) {
          case "hero":
            return (
              <header key={section.id} className={index === 0 ? "" : sectionClass}>
                {str(t.eyebrow) ? <p className={eyebrowClass}>{str(t.eyebrow)}</p> : null}
                {str(t.title) ? <h1 className="type-display mt-3 text-4xl leading-[1.1] sm:text-5xl">{str(t.title)}</h1> : null}
                {str(t.lead) ? <p className="mt-5 max-w-2xl text-[16.5px] leading-relaxed text-black/70">{str(t.lead)}</p> : null}
                {assets}
              </header>
            );
          case "prose":
            return (
              <section key={section.id} className={sectionClass}>
                {str(t.heading) ? <p className={eyebrowClass}>{str(t.heading)}</p> : null}
                {str(t.lead) ? <p className="mt-4 max-w-2xl text-[16px] leading-relaxed">{str(t.lead)}</p> : null}
                {lines(t.paragraphs).length > 0 ? (
                  <div className="mt-4 space-y-4">
                    {lines(t.paragraphs).map((paragraph, i) => (
                      <p key={i} className="max-w-2xl text-[16px] leading-relaxed">{paragraph}</p>
                    ))}
                  </div>
                ) : null}
                {assets}
                {buttonEl}
              </section>
            );
          case "cards":
            return (
              <section key={section.id} className={sectionClass}>
                {str(t.heading) ? <p className={eyebrowClass}>{str(t.heading)}</p> : null}
                {str(t.lead) ? <p className="mt-4 max-w-2xl text-[16px] leading-relaxed">{str(t.lead)}</p> : null}
                <div className={`mt-5 grid gap-4 ${section.columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                  {records(t.items).map((item, i) => (
                    <div key={i} className="rounded-brand bg-mist px-5 py-4">
                      {item.kicker ? <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-red">{item.kicker}</p> : null}
                      {item.title ? <p className="type-display mt-1 text-xl">{item.title}</p> : null}
                      {item.text ? <p className="mt-2 text-[14px] leading-relaxed text-black/65">{item.text}</p> : null}
                    </div>
                  ))}
                </div>
                {str(t.note) ? <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-black/60">{str(t.note)}</p> : null}
                {assets}
              </section>
            );
          case "figures":
            return (
              <section key={section.id} className={sectionClass}>
                {str(t.heading) ? <p className={eyebrowClass}>{str(t.heading)}</p> : null}
                {str(t.lead) ? <p className="mt-4 max-w-2xl text-[16px] leading-relaxed">{str(t.lead)}</p> : null}
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {records(t.items).map((item, i) => (
                    <div key={i} className="rounded-brand bg-mist px-4 py-5">
                      <p className="type-display text-3xl text-red sm:text-4xl">{item.figure}</p>
                      <p className="mt-2 text-[13.5px] leading-relaxed text-black/70">{item.label}</p>
                    </div>
                  ))}
                </div>
                {assets}
              </section>
            );
          case "list":
            return (
              <section key={section.id} className={sectionClass}>
                {str(t.heading) ? <p className={eyebrowClass}>{str(t.heading)}</p> : null}
                {str(t.lead) ? <p className="mt-4 max-w-2xl text-[16px] leading-relaxed">{str(t.lead)}</p> : null}
                <ol className="mt-5 grid gap-5 sm:grid-cols-2">
                  {records(t.items).map((item, i) => (
                    <li key={i}>
                      <span className="font-mono text-[12px] text-red">0{i + 1}</span>
                      <p className="mt-0.5 text-[15.5px] font-semibold">{item.title}</p>
                      <p className="mt-1 text-[14px] leading-relaxed text-black/65">{item.text}</p>
                    </li>
                  ))}
                </ol>
                {assets}
                {buttonEl}
              </section>
            );
          case "callout":
            return (
              <section key={section.id} className="mt-12 rounded-brand bg-sea px-6 py-7 text-paper">
                {str(t.heading) ? <h2 className="type-display text-2xl">{str(t.heading)}</h2> : null}
                {lines(t.paragraphs).length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {lines(t.paragraphs).map((paragraph, i) => (
                      <p key={i} className="text-[15px] leading-relaxed text-paper/85">{paragraph}</p>
                    ))}
                  </div>
                ) : null}
                {assets}
                {buttonEl}
              </section>
            );
          case "note":
            return str(t.text) ? (
              <p key={section.id} className="mt-10 max-w-xl rounded-brand bg-mist px-4 py-3 text-[13px] text-sea">{str(t.text)}</p>
            ) : null;
          default:
            return null;
        }
      })}
    </>
  );
}

function SectionAssets({ section, pools, locale, labels, dark }: { section: Section; pools: AssetPools; locale: Locale; labels: { more: string; cause: string }; dark: boolean }) {
  const a = section.assets;
  if (!a) return null;
  const people = pickPeople(a.people, pools.people);
  const supporters = pickIds(a.supporters, pools.supporters);
  const beneficiaries = pickIds(a.beneficiaries, pools.beneficiaries);
  if (people.length === 0 && supporters.length === 0 && beneficiaries.length === 0) return null;
  return (
    <div className="mt-5 space-y-6">
      {people.length > 0 ? <PeopleStrip people={people} cards={a.peopleLayout === "cards"} dark={dark} showYears={a.people?.kinds.includes("volunteer")} /> : null}
      {supporters.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {supporters.map((su) => {
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
                <span className={`mt-2 block text-[14px] font-bold ${dark ? "text-paper" : ""}`}>{su.name}</span>
              </>
            );
            return (
              <li key={su.id} className={`rounded-lg p-3 text-center ${dark ? "bg-paper/12" : "bg-mist"}`}>
                {su.website ? <a href={su.website} target="_blank" rel="noopener" className="block hover:opacity-90">{inner}</a> : inner}
              </li>
            );
          })}
        </ul>
      ) : null}
      {beneficiaries.length > 0 ? <BeneficiaryStories rows={beneficiaries} locale={locale} labels={labels} /> : null}
    </div>
  );
}
