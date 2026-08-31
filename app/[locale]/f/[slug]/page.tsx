import Image from "next/image";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

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
  const initial = fundraiser.title.trim().charAt(0).toUpperCase() || "S";

  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      {/* runner-head: avatar + name + meta line, per the prototype */}
      <div className="flex items-center gap-3.5">
        {photo ? (
          <Image
            src={photo}
            alt=""
            width={52}
            height={52}
            className="h-[52px] w-[52px] shrink-0 rounded-full border-[1.5px] border-ink object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="type-display flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink bg-red text-[21px] font-bold text-paper"
          >
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="type-display text-lg leading-tight">{fundraiser.title}</h1>
          <p className="mt-0.5 text-[12px] text-ink/60">
            {fundraiser.team_name ? (
              <>
                {t("team")} · {fundraiser.team_name} ·{" "}
              </>
            ) : null}
            {fundraiser.event_name}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Waterline
          raisedCents={fundraiser.raised_cents}
          goalCents={fundraiser.goal_cents}
          donorCount={fundraiser.donor_count}
          locale={locale as Locale}
        />
      </div>

      {fundraiser.story ? (
        <p className="mt-4 text-[13.5px] leading-relaxed text-ink/70">
          {fundraiser.story}
        </p>
      ) : null}

      <div className="mt-4 space-y-2">
        <Link
          href={{ pathname: "/podrzi", query: { za: fundraiser.slug } }}
          className="block w-full rounded-xl bg-red px-6 py-3.5 text-center text-[15.5px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark"
        >
          {tDonate("payVerb")}
        </Link>
        <ShareButton
          title={fundraiser.title}
          path={`/${locale}/f/${fundraiser.slug}`}
          label={t("share")}
          copiedLabel={tDonate("copied")}
          variant="ghost"
        />
      </div>

      <div className="my-5 h-px bg-line-soft" />
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-sea/80">
        {t("donorWall")}
      </p>
      <ul className="mt-2">
        {wall.map((donor) => (
          <li
            key={donor.id}
            className="flex items-start gap-3 border-b border-line-soft py-3 last:border-b-0"
          >
            <span aria-hidden className="mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full bg-red" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold">
                {donor.display_name ?? t("anonymous")}
              </span>
              {donor.message ? (
                <span className="mt-0.5 block text-[12px] leading-relaxed text-ink/60">
                  {donor.message}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 font-mono text-[13px] font-medium tabular-nums">
              {formatCents(donor.amount_cents, locale as Locale, { trimWholeCents: true })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
