import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProposalsManager, type CriterionRow, type ProposalRow } from "@/components/admin/ProposalsManager";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/** Community proposals with their votes and screening, and the screening questions themselves. */
export default async function ProposalsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const [{ data: proposals }, { data: votes }, { data: criteria }, { data: chapters }, { data: profiles }] = await Promise.all([
    supabase.from("cause_proposals").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("cause_votes").select("proposal_id").limit(20_000),
    supabase.from("cause_criteria").select("*").order("sort_order"),
    supabase.from("chapters").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name").limit(5000),
  ]);
  const voteCount = new Map<string, number>();
  for (const row of votes ?? []) voteCount.set(row.proposal_id, (voteCount.get(row.proposal_id) ?? 0) + 1);
  const nameById = new Map((profiles ?? []).map((row) => [row.id, row.full_name ?? ""]));
  const rows: ProposalRow[] = ((proposals ?? []) as Omit<ProposalRow, "votes" | "proposer_name">[]).map((row) => ({
    ...row,
    votes: voteCount.get(row.id) ?? 0,
    proposer_name: nameById.get(row.proposer_id) ?? "",
  }));

  return (
    <div className="pb-8">
      <ProposalsManager
        locale={locale as Locale}
        lead={t("proposalsHint")}
        proposals={rows}
        criteria={(criteria ?? []) as CriterionRow[]}
        chapters={(chapters ?? []) as { id: string; name: string }[]}
      />
    </div>
  );
}
