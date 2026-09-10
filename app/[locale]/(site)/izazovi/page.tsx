import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PerkRule, type PerkChallengeFields } from "@/components/perks/PerkRule";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export interface PerkChallengeRow extends PerkChallengeFields {
  id: string;
  slug: string;
  partner_name: string;
  title: string;
  description: string | null;
  reward_label: string;
  starts_at: string | null;
  ends_at: string | null;
  issued_today: number;
  redeemed_total: number;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: `${t("challenges")} — Santamore` };
}

/** Partner perks catalogue: run the rule, earn the reward, show the code. */
export default async function ChallengesIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("perks");

  let challenges: PerkChallengeRow[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("v_public_perk_challenges")
      .select("*")
      .order("partner_name");
    challenges = (data ?? []) as PerkChallengeRow[];
  } catch {
    challenges = [];
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="type-display text-4xl">{t("title")}</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink/70">{t("sub")}</p>

      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {(["step1", "step2", "step3"] as const).map((step, index) => (
          <li key={step} className="rounded-brand bg-[#f3f6f7] px-4 py-3.5 text-[13.5px] leading-relaxed">
            <span className="font-mono text-[11px] text-red">0{index + 1}</span>
            <span className="mt-1 block">{t(step)}</span>
          </li>
        ))}
      </ol>

      {challenges.length === 0 ? (
        <p className="mt-8 text-[14px] text-ink/60">{t("empty")}</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {challenges.map((challenge) => {
            const left =
              challenge.daily_cap !== null
                ? Math.max(0, challenge.daily_cap - challenge.issued_today)
                : null;
            return (
              <li key={challenge.id}>
                <Link
                  href={`/izazovi/${challenge.slug}`}
                  className="block rounded-brand border-[1.5px] border-line px-5 py-4 transition-colors hover:border-sea"
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
                    {challenge.partner_name}
                  </span>
                  <span className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
                    <span className="type-display text-2xl">{challenge.title}</span>
                    <span className="rounded-full bg-red px-3 py-1 text-[12.5px] font-bold text-paper">
                      {challenge.reward_label}
                    </span>
                  </span>
                  <span className="mt-2 block text-[13.5px] leading-relaxed text-ink/70">
                    <PerkRule challenge={challenge} />
                  </span>
                  {left !== null ? (
                    <span className="mt-2 block font-mono text-[12px] tabular-nums text-sea">
                      {t("leftToday", { count: left })}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-10 rounded-brand border-[1.5px] border-dashed border-line px-5 py-4 text-[13.5px] leading-relaxed text-ink/70">
        {t("howNote")}{" "}
        <Link href="/dashboard/strava" className="font-semibold text-sea underline underline-offset-2">
          {t("connectCta")}
        </Link>
      </div>
      <p className="mt-4 text-[12px] text-ink/50">{t("poweredBy")}</p>
    </div>
  );
}
