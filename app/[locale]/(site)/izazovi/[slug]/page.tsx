import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PerkRule } from "@/components/perks/PerkRule";
import { ShareButton } from "@/components/ShareButton";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { htmlLang, routing, type Locale } from "@/i18n/routing";
import type { PerkChallengeRow } from "../page";

export const dynamic = "force-dynamic";

async function fetchChallenge(slug: string): Promise<PerkChallengeRow | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("v_public_perk_challenges")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    return (data as PerkChallengeRow | null) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const challenge = await fetchChallenge(slug);
  return { title: challenge ? `${challenge.title} — Santamore` : "Santamore" };
}

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [t, tDonate] = await Promise.all([getTranslations("perks"), getTranslations("donate")]);

  const challenge = await fetchChallenge(slug);
  if (!challenge) notFound();

  const dateFormat = new Intl.DateTimeFormat(htmlLang(locale as Locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const left =
    challenge.daily_cap !== null ? Math.max(0, challenge.daily_cap - challenge.issued_today) : null;

  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-ink/60">
        {challenge.partner_url ? (
          <a href={challenge.partner_url} rel="noopener" target="_blank" className="underline underline-offset-2 hover:text-sea">
            {challenge.partner_name} ↗
          </a>
        ) : (
          challenge.partner_name
        )}
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h1 className="type-display text-3xl sm:text-4xl">{challenge.title}</h1>
        <ShareButton
          title={challenge.title}
          path={`/${locale}/izazovi/${challenge.slug}`}
          label={t("share")}
          copiedLabel={tDonate("copied")}
          variant="icon"
        />
      </div>

      <div className="mt-5 rounded-brand bg-mist px-5 py-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">{t("reward")}</p>
        <p className="type-display mt-1 text-3xl">{challenge.reward_label}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/80">
          <PerkRule challenge={challenge} />
        </p>
        {left !== null ? (
          <p className="mt-3 font-mono text-[13.5px] tabular-nums text-sea">
            {t("leftToday", { count: left })}
          </p>
        ) : null}
        {challenge.starts_at || challenge.ends_at ? (
          <p className="mt-1 text-[13.5px] text-ink/60">
            {challenge.starts_at ? dateFormat.format(new Date(challenge.starts_at)) : "…"}
            {" — "}
            {challenge.ends_at ? dateFormat.format(new Date(challenge.ends_at)) : "…"}
          </p>
        ) : null}
      </div>

      {challenge.description ? (
        <p className="mt-5 whitespace-pre-line text-[16px] leading-relaxed text-ink/80">
          {challenge.description}
        </p>
      ) : null}

      <p className="mt-6 text-[14.5px] leading-relaxed text-ink/70">{t("noPageNeeded")}</p>
      <ol className="mt-3 space-y-2">
        {(["step1", "step2", "step3"] as const).map((step, index) => (
          <li key={step} className="flex gap-3 text-[14.5px] leading-relaxed">
            <span className="font-mono text-[12px] text-red">0{index + 1}</span>
            <span>{t(step)}</span>
          </li>
        ))}
      </ol>

      <div className="mt-6">
        <Link
          href="/dashboard/strava"
          className="inline-flex h-12 items-center rounded-lg bg-red px-7 text-[16px] font-bold text-paper transition-colors hover:bg-red-dark"
        >
          {t("connectCta")}
        </Link>
      </div>
      <p className="mt-4 text-[13px] text-ink/50">{t("poweredBy")}</p>
    </div>
  );
}
