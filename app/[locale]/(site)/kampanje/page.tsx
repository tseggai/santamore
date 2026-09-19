import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProposalsList, type PublicProposal } from "@/components/proposals/ProposalsList";
import { ProposePane } from "@/components/proposals/ProposePane";
import type { PublicCriterion } from "@/components/proposals/ProposeForm";
import { CauseStatus } from "@/components/campaigns/CauseStatus";
import { openFirst } from "@/lib/cause-status";
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
  /** Absent until migration 0044 is applied. */
  disbursed_cents?: number | null;
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
  const [t, tProposals] = await Promise.all([getTranslations("campaigns"), getTranslations("proposals")]);

  let campaigns: CampaignRow[] = [];
  let proposals: PublicProposal[] = [];
  let myVotes: string[] = [];
  let signedIn = false;
  let criteria: PublicCriterion[] = [];
  try {
    const supabase = await createClient();
    const [{ data: proposalRows }, { data: voteRows }, { data: auth }, { data: criteriaRows }] = await Promise.all([
      supabase.from("v_public_cause_proposals").select("*").order("vote_rank").order("created_at").limit(100),
      supabase.from("v_my_cause_votes").select("proposal_id"),
      supabase.auth.getUser(),
      supabase.from("v_public_cause_criteria").select("*"),
    ]);
    const lang = locale as Locale;
    criteria = ((criteriaRows ?? []) as { id: string; disqualify_on: boolean; question_me: string; question_en: string; question_ru: string; reason_me: string; reason_en: string; reason_ru: string }[]).map((row) => ({
      id: row.id,
      disqualify_on: row.disqualify_on,
      question: row[`question_${lang}`],
      reason: row[`reason_${lang}`],
    }));
    proposals = ((proposalRows ?? []) as PublicProposal[]).sort((a, b) => (a.status === "chosen" ? 1 : 0) - (b.status === "chosen" ? 1 : 0) || a.vote_rank - b.vote_rank);
    myVotes = (voteRows ?? []).map((row) => row.proposal_id as string);
    signedIn = Boolean(auth.user);
    const { data } = await supabase
      .from("v_public_campaigns")
      .select("*")
      .order("starts_at", { ascending: false, nullsFirst: false });
    // Open causes first; a completed one is read from its records, never set.
    campaigns = openFirst((data ?? []) as CampaignRow[]);
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

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>

      {campaigns.length === 0 ? (
        <p className="text-[15px] text-black/60">{t("empty")}</p>
      ) : (
        <ul className="space-y-3">
          {campaigns.map((campaign) => {
            const pct =
              campaign.goal_cents && campaign.goal_cents > 0
                ? Math.min(100, Math.round((campaign.raised_cents / campaign.goal_cents) * 100))
                : null;
            return (
              <li key={campaign.slug}>
                <Link
                  href={`/kampanje/${campaign.slug}`}
                  className="block rounded-brand bg-mist px-5 py-4 transition-colors hover:bg-mist-2"
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
                  <CauseStatus cause={campaign} className="mt-3" />
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

      {/* the community's say: always in view beside the causes */}
      <aside id="prijedlozi" className="scroll-mt-6 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-brand bg-mist px-5 py-5">
          <p className="type-eyebrow text-sea/80">{tProposals("eyebrow")}</p>
          <h2 className="mt-2 text-[20px] font-bold leading-snug">{tProposals("listHeading")}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-black/65">{tProposals("listSub")}</p>
          <div className="mt-4">
            <ProposePane signedIn={signedIn} criteria={criteria} />
          </div>
        </div>
        <div className="mt-2 max-h-[60vh] overflow-y-auto pr-1 lg:max-h-[calc(100vh-22rem)]">
          <ProposalsList proposals={proposals} myVotes={myVotes} signedIn={signedIn} />
        </div>
      </aside>
      </div>
    </div>
  );
}
