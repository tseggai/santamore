"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

import { BeneficiaryStories, type PublicBeneficiary } from "@/components/beneficiaries/BeneficiaryStories";
import { CauseLedgerDialog } from "@/components/campaigns/CauseLedgerDialog";
import { DonateButton } from "@/components/donate/DonateButton";
import type { GalleryImage } from "@/components/gallery/GalleryGrid";
import { PublicGallery } from "@/components/gallery/PublicGallery";
import { galleryImageUrl } from "@/lib/storage";
import { ShareButton } from "@/components/ShareButton";
import { Waterline } from "@/components/Waterline";
import { formatCents } from "@/lib/money";
import { Link } from "@/i18n/navigation";
import { htmlLang, type Locale } from "@/i18n/routing";

export interface CampaignEventItem {
  slug: string;
  name: string;
  starts_at: string | null;
  kind: "race" | "challenge";
}

export interface CampaignView {
  slug: string;
  title: string;
  description: string | null;
  beneficiary_summary: string | null;
  goal_cents: number | null;
  raised_cents: number;
  donor_count: number;
  starts_at: string | null;
  ends_at: string | null;
  chapter_name: string | null;
  events: CampaignEventItem[];
  cover_path?: string | null;
  gallery?: GalleryImage[];
  /** Who this cause reached, with their stories. */
  beneficiaries?: PublicBeneficiary[];
}

/**
 * The public campaign page — also what the admin form previews while
 * typing, so the markup lives here once. `preview` renders links inert.
 */
export function CampaignPageView({
  campaign,
  preview = false,
}: {
  campaign: CampaignView;
  preview?: boolean;
}) {
  const t = useTranslations("campaigns");
  const tDonate = useTranslations("donate");
  const locale = useLocale() as Locale;
  const dateFormat = new Intl.DateTimeFormat(htmlLang(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });
  const cover = galleryImageUrl(campaign.cover_path ?? null);
  const secondaryButton =
    "inline-flex h-12 items-center rounded-lg bg-mist px-5 text-[15px] font-semibold transition-colors hover:bg-mist-2 hover:text-sea";
  const linkClass =
    "font-semibold text-black underline decoration-black/30 underline-offset-[3px] transition-colors hover:text-sea";

  return (
    <div className={`mx-auto max-w-3xl px-5 py-12 ${preview ? "pointer-events-none select-none" : ""}`}>
      <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-black/60">
        {t("eyebrow")}
        {campaign.chapter_name ? <> · {campaign.chapter_name}</> : null}
      </p>
      <h1 className="type-display mt-2 text-3xl sm:text-4xl">{campaign.title || t("untitled")}</h1>
      {cover ? (
        <Image src={cover} alt="" width={1200} height={675} priority className="mt-5 aspect-[16/9] w-full rounded-lg bg-mist object-cover" />
      ) : null}
      {campaign.starts_at || campaign.ends_at ? (
        <p className="mt-2 text-[14.5px] text-black/60">
          {campaign.starts_at ? dateFormat.format(new Date(campaign.starts_at)) : "…"}
          {" — "}
          {campaign.ends_at ? dateFormat.format(new Date(campaign.ends_at)) : "…"}
        </p>
      ) : null}

      <div className="mt-6">
        {campaign.goal_cents && campaign.goal_cents > 0 ? (
          <Waterline
            raisedCents={campaign.raised_cents}
            goalCents={campaign.goal_cents}
            donorCount={campaign.donor_count}
            locale={locale}
          />
        ) : (
          <div className="rounded-brand bg-mist px-5 py-5">
            <span className="font-mono block text-4xl font-extrabold tabular-nums">
              {money(campaign.raised_cents)}
            </span>
            <span className="mt-1 block text-[13.5px] text-black/70">
              <span className="font-mono tabular-nums">{campaign.donor_count}</span>{" "}
              {t("donors")}
            </span>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <DonateButton
          request={{ kind: "campaign", slug: campaign.slug }}
          href={`/podrzi?kampanja=${campaign.slug}`}
          className="inline-flex h-12 items-center rounded-lg bg-red px-8 text-[16.5px] font-bold text-paper transition-colors hover:bg-red-dark"
        >
          {tDonate("payVerb")}
        </DonateButton>
        {preview ? (
          <span className={secondaryButton}>{t("raiseCta")}</span>
        ) : (
          <Link href={`/dashboard/prikupljaj?cause=${campaign.slug}`} className={secondaryButton}>{t("raiseCta")}</Link>
        )}
        {preview ? (
          <span className={secondaryButton}>{t("shareCta")}</span>
        ) : (
          <ShareButton
            title={campaign.title}
            path={`/${locale}/kampanje/${campaign.slug}`}
            label={t("shareCta")}
            copiedLabel={tDonate("copied")}
            variant="ghost"
            className={`${secondaryButton} gap-2`}
          />
        )}
        {preview ? (
          <span className={secondaryButton}>{t("ledgerLink")}</span>
        ) : (
          <CauseLedgerDialog slug={campaign.slug} className={secondaryButton} />
        )}
      </div>

      {campaign.description ? (
        <>
          <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.16em] text-black/60">
            {t("about")}
          </p>
          <p className="mt-2 whitespace-pre-line text-[16px] leading-relaxed text-black/80">
            {campaign.description}
          </p>
        </>
      ) : null}

      {campaign.beneficiary_summary ? (
        <div className="mt-6 rounded-brand bg-mist px-5 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sea">
            {t("beneficiary")}
          </p>
          <p className="mt-1 text-[15.5px] leading-relaxed text-black/85">
            {campaign.beneficiary_summary}
          </p>
          <p className="mt-2 text-[13.5px] text-black/60">{t("promise")}</p>
        </div>
      ) : null}

      {campaign.events.length > 0 ? (
        <>
          <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.16em] text-black/60">
            {t("events")}
          </p>
          <ul className="mt-2 space-y-2">
            {campaign.events.map((event) => (
              <li key={event.slug}>
                <Link
                  href={`/dogadjaji/${event.slug}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-mist px-4 py-3 transition-colors hover:bg-mist-2"
                >
                  <span className="text-[15px] font-semibold">{event.name}</span>
                  <span className="font-mono text-[13px] tabular-nums text-black/60">
                    {event.starts_at ? dateFormat.format(new Date(event.starts_at)) : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p className="mt-7 text-[14.5px]">
        <Link href={`/prikupljaci?cilj=${campaign.slug}`} className={linkClass}>
          {t("fundraisersLink")}
        </Link>
      </p>

      {campaign.beneficiaries && campaign.beneficiaries.length > 0 ? (
        <section className="mt-12 border-t-[0.5px] border-line pt-10">
          <p className="type-eyebrow text-sea/80">{t("beneficiariesHeading")}</p>
          <div className="mt-6">
            <BeneficiaryStories rows={campaign.beneficiaries} locale={locale} labels={{ more: t("beneficiaryMore"), cause: "" }} showCause={false} />
          </div>
        </section>
      ) : null}

      {campaign.gallery && campaign.gallery.length > 0 ? (
        <PublicGallery images={campaign.gallery} heading={t("galleryHeading")} />
      ) : null}
    </div>
  );
}
