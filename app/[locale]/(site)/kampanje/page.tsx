import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { formatCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { htmlLang, routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface CampaignRow {
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
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: `${t("campaigns")} — Santamore` };
}

/** Every public campaign: what we are raising for, how far along, who benefits. */
export default async function CampaignsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("campaigns");

  let campaigns: CampaignRow[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("v_public_campaigns")
      .select(
        "slug, title, description, beneficiary_summary, goal_cents, raised_cents, donor_count, starts_at, ends_at, chapter_name",
      )
      .order("starts_at", { ascending: false, nullsFirst: false });
    campaigns = (data ?? []) as CampaignRow[];
  } catch {
    campaigns = [];
  }

  const dateFormat = new Intl.DateTimeFormat(htmlLang(locale as Locale), {
    month: "long",
    year: "numeric",
  });
  const money = (cents: number) => formatCents(cents, locale as Locale, { trimWholeCents: true });

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="type-display text-4xl">{t("title")}</h1>
      <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-black/70">{t("sub")}</p>

      {campaigns.length === 0 ? (
        <p className="mt-8 text-[15px] text-black/60">{t("empty")}</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {campaigns.map((campaign) => {
            const pct =
              campaign.goal_cents && campaign.goal_cents > 0
                ? Math.min(100, Math.round((campaign.raised_cents / campaign.goal_cents) * 100))
                : null;
            return (
              <li key={campaign.slug}>
                <Link
                  href={`/kampanje/${campaign.slug}`}
                  className="block rounded-brand border-[1.5px] border-line px-5 py-4 transition-colors hover:border-sea"
                >
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="type-display text-2xl">{campaign.title}</span>
                    <span className="font-mono text-[13px] tabular-nums text-black/60">
                      {campaign.starts_at ? dateFormat.format(new Date(campaign.starts_at)) : null}
                      {campaign.chapter_name ? <> · {campaign.chapter_name}</> : null}
                    </span>
                  </span>
                  {campaign.beneficiary_summary ? (
                    <span className="mt-1 block text-[14.5px] leading-relaxed text-black/70">
                      {campaign.beneficiary_summary}
                    </span>
                  ) : null}
                  <span className="mt-3 flex items-baseline gap-3">
                    <span className="font-mono text-[16px] font-medium tabular-nums">
                      {money(campaign.raised_cents)}
                    </span>
                    {campaign.goal_cents ? (
                      <span className="text-[13.5px] text-black/60">
                        {t("ofGoal", { goal: money(campaign.goal_cents) })}
                      </span>
                    ) : null}
                    <span className="text-[13.5px] text-black/60">
                      · <span className="font-mono tabular-nums">{campaign.donor_count}</span>{" "}
                      {t("donors")}
                    </span>
                  </span>
                  {pct !== null ? (
                    <span className="mt-2 block h-[5px] overflow-hidden rounded-[3px] bg-line-soft">
                      <span
                        className="block h-full rounded-[3px] bg-sea"
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
