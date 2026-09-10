"use client";

import { useLocale, useTranslations } from "next-intl";

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
  const linkClass =
    "font-semibold text-ink underline decoration-line underline-offset-[3px] transition-colors hover:text-sea";

  return (
    <div className={`mx-auto max-w-xl px-5 py-12 ${preview ? "pointer-events-none select-none" : ""}`}>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
        {t("eyebrow")}
        {campaign.chapter_name ? <> · {campaign.chapter_name}</> : null}
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h1 className="type-display text-3xl sm:text-4xl">{campaign.title || t("untitled")}</h1>
        {!preview ? (
          <ShareButton
            title={campaign.title}
            path={`/${locale}/kampanje/${campaign.slug}`}
            label={t("share")}
            copiedLabel={tDonate("copied")}
            variant="icon"
          />
        ) : null}
      </div>
      {campaign.starts_at || campaign.ends_at ? (
        <p className="mt-2 text-[13.5px] text-ink/60">
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
          <div className="rounded-brand bg-[#f3f6f7] px-5 py-5">
            <span className="type-display block text-4xl tabular-nums">
              {money(campaign.raised_cents)}
            </span>
            <span className="mt-1 block text-[12.5px] text-ink/70">
              <span className="font-mono tabular-nums">{campaign.donor_count}</span>{" "}
              {t("donors")}
            </span>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center gap-2">
        <Link
          href={`/podrzi?kampanja=${campaign.slug}`}
          className="inline-flex h-12 items-center rounded-xl bg-red px-8 text-[15.5px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark"
        >
          {tDonate("payVerb")}
        </Link>
        <Link
          href="/transparentnost"
          className="inline-flex h-12 items-center rounded-xl border-[1.5px] border-line px-5 text-[14px] font-semibold transition-colors hover:border-sea hover:text-sea"
        >
          {t("ledgerLink")}
        </Link>
      </div>

      {campaign.description ? (
        <>
          <p className="mt-7 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/60">
            {t("about")}
          </p>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink/80">
            {campaign.description}
          </p>
        </>
      ) : null}

      {campaign.beneficiary_summary ? (
        <div className="mt-6 rounded-brand border-[1.5px] border-dashed border-sea bg-mist px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-sea">
            {t("beneficiary")}
          </p>
          <p className="mt-1 text-[14.5px] leading-relaxed text-ink/85">
            {campaign.beneficiary_summary}
          </p>
          <p className="mt-2 text-[12.5px] text-ink/60">{t("promise")}</p>
        </div>
      ) : null}

      {campaign.events.length > 0 ? (
        <>
          <p className="mt-7 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/60">
            {t("events")}
          </p>
          <ul className="mt-2 space-y-2">
            {campaign.events.map((event) => (
              <li key={event.slug}>
                <Link
                  href={`/dogadjaji/${event.slug}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-[11px] border-[1.5px] border-line px-4 py-3 transition-colors hover:border-sea"
                >
                  <span className="text-[14px] font-semibold">{event.name}</span>
                  <span className="font-mono text-[12px] tabular-nums text-ink/60">
                    {event.starts_at ? dateFormat.format(new Date(event.starts_at)) : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p className="mt-7 text-[13.5px]">
        <Link href="/prikupljaci" className={linkClass}>
          {t("fundraisersLink")}
        </Link>
      </p>
    </div>
  );
}
