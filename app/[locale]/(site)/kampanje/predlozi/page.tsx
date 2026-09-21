import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProposalsList, type PublicProposal } from "@/components/proposals/ProposalsList";
import { ProposePane } from "@/components/proposals/ProposePane";
import type { PublicCriterion } from "@/components/proposals/ProposeForm";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface CriterionRow {
  id: string;
  disqualify_on: boolean;
  question_me: string;
  question_en: string;
  question_ru: string;
  reason_me: string;
  reason_en: string;
  reason_ru: string;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "proposals" });
  return { title: `${t("listHeading")} — Santamore` };
}

/**
 * Every proposal, with its full text as the proposer wrote it, ranked by
 * votes with the chosen ones last. The causes page shows the five in the
 * running; this is where the rest, and the reading, happen.
 */
export default async function ProposalsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("proposals");
  const supabase = await createClient();
  const [{ data: proposalRows }, { data: voteRows }, { data: auth }, { data: criteriaRows }] = await Promise.all([
    supabase.from("v_public_cause_proposals").select("*").order("vote_rank").order("created_at").limit(500),
    supabase.from("v_my_cause_votes").select("proposal_id"),
    supabase.auth.getUser(),
    supabase.from("v_public_cause_criteria").select("*"),
  ]);
  const lang = locale as Locale;
  const criteria: PublicCriterion[] = ((criteriaRows ?? []) as CriterionRow[]).map((row) => ({
    id: row.id,
    disqualify_on: row.disqualify_on,
    question: row[`question_${lang}`],
    reason: row[`reason_${lang}`],
  }));
  const proposals = ((proposalRows ?? []) as PublicProposal[]).sort((a, b) => (a.status === "chosen" ? 1 : 0) - (b.status === "chosen" ? 1 : 0) || a.vote_rank - b.vote_rank);
  const myVotes = (voteRows ?? []).map((row) => row.proposal_id as string);
  const signedIn = Boolean(auth.user);

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className="text-[13.5px]">
        <Link href="/kampanje" className="font-semibold text-sea underline underline-offset-2">← {t("backToCauses")}</Link>
      </p>
      <p className="type-eyebrow mt-6 text-sea/80">{t("eyebrow")}</p>
      <h1 className="type-display mt-2 text-4xl">{t("listHeading")}</h1>
      <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-black/70">{t("listSub")}</p>
      <div className="mt-6 max-w-xs">
        <ProposePane signedIn={signedIn} criteria={criteria} />
      </div>
      <ProposalsList proposals={proposals} myVotes={myVotes} signedIn={signedIn} />
    </div>
  );
}
