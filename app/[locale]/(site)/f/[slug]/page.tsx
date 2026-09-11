import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { DonateButton } from "@/components/donate/DonateButton";
import { Avatar } from "@/components/Avatar";
import { ShareButton } from "@/components/ShareButton";
import { Waterline } from "@/components/Waterline";
import { formatCents } from "@/lib/money";
import { fundraiserPhotoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export interface FundraiserTotalsRow {
  id: string;
  slug: string;
  title: string;
  story: string | null;
  photo_path: string | null;
  goal_cents: number;
  raised_cents: number;
  donor_count: number;
  payment_reference: string;
  event_slug: string;
  event_name: string;
  team_slug: string | null;
  team_name: string | null;
}

interface WallRow {
  id: string;
  display_name: string | null;
  amount_cents: number;
  message: string | null;
}

async function fetchPage(slug: string) {
  try {
    const supabase = await createClient();
    const [{ data: fundraiser }, { data: wall }] = await Promise.all([
      supabase.from("v_fundraiser_totals").select("*").eq("slug", slug).single(),
      supabase
        .from("v_public_donor_wall")
        .select("id, display_name, amount_cents, message")
        .eq("fundraiser_slug", slug)
        .order("approved_at", { ascending: false, nullsFirst: false })
        .limit(100),
    ]);
    return {
      fundraiser: fundraiser as FundraiserTotalsRow | null,
      wall: (wall ?? []) as WallRow[],
    };
  } catch {
    return { fundraiser: null, wall: [] as WallRow[] };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const { fundraiser } = await fetchPage(slug);
  return { title: fundraiser ? `${fundraiser.title} — Santamore` : "Santamore" };
}

export default async function FundraiserPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [t, tDonate] = await Promise.all([
    getTranslations("runner"),
    getTranslations("donate"),
  ]);

  const { fundraiser, wall } = await fetchPage(slug);
  if (!fundraiser) notFound();

  const photo = fundraiserPhotoUrl(fundraiser.photo_path);
  const linkClass =
    "font-semibold text-ink underline decoration-line underline-offset-[3px] transition-colors hover:text-sea";

  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      {/* runner head: a photo you can actually recognise, name, where they
          run and with whom, and the two actions at header level */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
        <Avatar
          src={photo}
          name={fundraiser.title}
          size={136}
          priority
          className="sm:mt-1"
        />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-ink/60">
            {t("eyebrow")}
          </p>
          <h1 className="type-display mt-1 text-3xl leading-tight sm:text-4xl">
            {fundraiser.title}
          </h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink/70">
            {fundraiser.team_name && fundraiser.team_slug ? (
              <>
                {t("runsWith")}{" "}
                <Link href={`/t/${fundraiser.team_slug}`} className={linkClass}>
                  {fundraiser.team_name}
                </Link>
                {" · "}
              </>
            ) : null}
            <Link href={`/dogadjaji/${fundraiser.event_slug}`} className={linkClass}>
              {fundraiser.event_name}
            </Link>
          </p>
          <div className="mt-4 flex items-center gap-2">
            <DonateButton
              request={{ kind: "fundraiser", slug: fundraiser.slug }}
              href={`/f/${fundraiser.slug}/podrzi`}
              className="inline-flex h-11 items-center rounded-lg bg-red px-7 text-[16px] font-bold text-paper transition-colors hover:bg-red-dark"
            >
              {tDonate("payVerb")}
            </DonateButton>
            <ShareButton
              title={fundraiser.title}
              path={`/${locale}/f/${fundraiser.slug}`}
              label={t("share")}
              copiedLabel={tDonate("copied")}
              variant="icon"
            />
          </div>
        </div>
      </header>

      <div className="mt-7">
        <Waterline
          raisedCents={fundraiser.raised_cents}
          goalCents={fundraiser.goal_cents}
          donorCount={fundraiser.donor_count}
          locale={locale as Locale}
        />
      </div>

      {fundraiser.story ? (
        <>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
            {t("story")}
          </p>
          <p className="mt-2 whitespace-pre-line text-[16px] leading-relaxed text-ink/80">
            {fundraiser.story}
          </p>
        </>
      ) : null}

      <div className="my-7 h-px bg-line-soft" />
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
        {t("donorWall")}
      </p>
      {wall.length === 0 ? (
        <p className="mt-2 text-[14.5px] text-ink/60">{t("wallEmpty")}</p>
      ) : null}
      <ul className="mt-2">
        {wall.map((donor) => (
          <li
            key={donor.id}
            className="flex items-start gap-3 border-b border-line-soft py-3 last:border-b-0"
          >
            <span aria-hidden className="mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full bg-red" />
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold">
                {donor.display_name ?? t("anonymous")}
              </span>
              {donor.message ? (
                <span className="mt-0.5 block text-[13.5px] leading-relaxed text-ink/60">
                  {donor.message}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 font-mono text-[14px] font-medium tabular-nums">
              {formatCents(donor.amount_cents, locale as Locale, { trimWholeCents: true })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
