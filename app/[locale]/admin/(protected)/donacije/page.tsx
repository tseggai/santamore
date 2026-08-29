import { getTranslations } from "next-intl/server";

import { ReconciliationTool } from "@/components/admin/ReconciliationTool";
import { formatCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import type { PendingPledge } from "@/lib/reconcile";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface DonationRow {
  id: string;
  amount_cents: number;
  donor_name: string | null;
  donor_email: string | null;
  is_recurring: boolean;
  created_at: string;
  approved_at: string | null;
  campaign: { title: string; payment_reference: string } | null;
  fundraiser: { title: string; payment_reference: string } | null;
}

const SELECT =
  "id, amount_cents, donor_name, donor_email, is_recurring, created_at, approved_at, campaign:campaigns(title, payment_reference), fundraiser:fundraisers(title, payment_reference)";

export default async function AdminDonationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const [{ data: pendingData }, { data: approvedData }] = await Promise.all([
    supabase
      .from("donations")
      .select(SELECT)
      .eq("rail", "sepa")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("donations")
      .select(SELECT)
      .eq("rail", "sepa")
      .eq("status", "approved")
      .order("approved_at", { ascending: false })
      .limit(10),
  ]);

  const pending = (pendingData ?? []) as unknown as DonationRow[];
  const approved = (approvedData ?? []) as unknown as DonationRow[];

  const pledges: PendingPledge[] = pending.map((row) => {
    const page = row.campaign ?? row.fundraiser;
    return {
      id: row.id,
      amountCents: row.amount_cents,
      reference: page?.payment_reference ?? "",
      donorName: row.donor_name,
      donorEmail: row.donor_email,
      isRecurring: row.is_recurring,
      createdAt: row.created_at,
      pageTitle: page?.title ?? "—",
    };
  });

  const money = (cents: number) => formatCents(cents, locale as Locale);
  const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "—");

  const table = (rows: DonationRow[], showApproved: boolean) => (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-[13.5px]">
        <thead>
          <tr className="border-b border-line text-left font-mono text-[10.5px] uppercase tracking-[0.12em] text-sea">
            <th className="py-2 pr-3">{t("table.date")}</th>
            <th className="py-2 pr-3">{t("table.amount")}</th>
            <th className="py-2 pr-3">{t("table.donor")}</th>
            <th className="py-2 pr-3">{t("table.page")}</th>
            <th className="py-2">{t("table.reference")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const page = row.campaign ?? row.fundraiser;
            return (
              <tr key={row.id} className="border-b border-line-soft align-top">
                <td className="py-2.5 pr-3 font-mono tabular-nums">
                  {day(showApproved ? row.approved_at : row.created_at)}
                </td>
                <td className="py-2.5 pr-3 font-mono tabular-nums">
                  {money(row.amount_cents)}
                  {row.is_recurring ? (
                    <span className="ml-1 text-[11px] text-ink/50">
                      {t("table.monthly")}
                    </span>
                  ) : null}
                </td>
                <td className="py-2.5 pr-3">
                  {row.donor_name ?? "—"}
                  {row.donor_email ? (
                    <span className="block text-[12px] text-ink/50">{row.donor_email}</span>
                  ) : null}
                </td>
                <td className="py-2.5 pr-3">{page?.title ?? "—"}</td>
                <td className="py-2.5 font-mono">{page?.payment_reference ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("donationsTitle")}</h1>

      <h2 className="mt-8 text-[15px] font-bold">{t("pendingHeading")}</h2>
      {pending.length === 0 ? (
        <p className="mt-2 text-[13.5px] text-ink/60">{t("noPending")}</p>
      ) : (
        table(pending, false)
      )}

      <ReconciliationTool locale={locale as Locale} pledges={pledges} />

      <h2 className="mt-12 text-[15px] font-bold">{t("approvedHeading")}</h2>
      {approved.length > 0 ? table(approved, true) : null}
    </div>
  );
}
