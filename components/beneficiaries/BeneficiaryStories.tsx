import Image from "next/image";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { beneficiaryPhotoUrl } from "@/lib/storage";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export interface PublicBeneficiary {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  photo_path: string | null;
  story: Partial<Record<Locale, string>>;
  campaign_slug: string | null;
  campaign_title: string | null;
}

/** The story in the reader's language, else the first one written. */
export function storyFor(row: PublicBeneficiary, locale: Locale): string | null {
  const own = row.story[locale]?.trim();
  if (own) return own;
  for (const key of ["me", "en", "ru"] as Locale[]) {
    const text = row.story[key]?.trim();
    if (text) return text;
  }
  return null;
}

const prose = "prose-santamore text-[15.5px] leading-relaxed text-black/80 [&_p]:mt-3 [&_p:first-child]:mt-0 [&_a]:text-sea [&_a]:underline [&_strong]:font-bold";

/**
 * Who the money reached: photo beside the story, alternating sides on
 * wide screens, stacked on a phone. Links to the beneficiary's own site
 * and to the cause that reached them.
 */
export function BeneficiaryStories({
  rows,
  locale,
  labels,
  showCause = true,
}: {
  rows: PublicBeneficiary[];
  locale: Locale;
  labels: { more: string; cause: string };
  showCause?: boolean;
}) {
  return (
    <ul className="space-y-10">
      {rows.map((row, index) => {
        const photo = beneficiaryPhotoUrl(row.photo_path);
        const story = storyFor(row, locale);
        return (
          <li key={row.id} className={`grid gap-6 sm:items-center ${photo ? "sm:grid-cols-2" : ""}`}>
            {photo ? (
              <div className={`relative aspect-[4/3] overflow-hidden rounded-brand bg-mist ${index % 2 === 1 ? "sm:order-2" : ""}`}>
                <Image src={photo} alt="" fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover" />
              </div>
            ) : null}
            <div>
              <h3 className="type-display text-2xl sm:text-3xl">{row.name}</h3>
              {story ? (
                <div className={`mt-4 ${prose}`}>
                  <Markdown remarkPlugins={[remarkGfm]}>{story}</Markdown>
                </div>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-3">
                {row.website ? (
                  <a href={row.website} target="_blank" rel="noopener" className="inline-flex h-11 items-center rounded-lg bg-red px-5 text-[15px] font-bold text-paper transition-colors hover:bg-red-dark">
                    {labels.more} ↗
                  </a>
                ) : null}
                {showCause && row.campaign_slug && row.campaign_title ? (
                  <Link href={`/kampanje/${row.campaign_slug}`} className="inline-flex h-11 items-center rounded-lg bg-mist px-5 text-[15px] font-semibold transition-colors hover:bg-mist-2 hover:text-sea">
                    {labels.cause}: {row.campaign_title} →
                  </Link>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
