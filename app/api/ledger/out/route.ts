import { toCsv } from "@/lib/csv";
import { disbursementDocUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Public money-out export — same data as v_public_ledger_out. */
export async function GET() {
  const supabase = await createClient();
  const [{ data: rows }, { data: adjustments }] = await Promise.all([
    supabase
      .from("v_public_ledger_out")
      .select("*")
      .order("entry_date", { ascending: false }),
    supabase
      .from("v_public_ledger_adjustments")
      .select("*")
      .not("references_disbursement_id", "is", null)
      .order("entry_date", { ascending: false }),
  ]);

  const csv = toCsv([
    ["type", "date", "amount_eur", "beneficiary", "category", "chapter", "committee_ref", "documents"],
    ...(rows ?? []).map((row) => [
      "entry",
      row.entry_date,
      (row.amount_cents / 100).toFixed(2),
      row.beneficiary_label,
      row.category,
      row.chapter_slug,
      row.committee_decision_ref,
      (row.documentation_paths as string[])
        .map((path) => disbursementDocUrl(path))
        .filter(Boolean)
        .join(" "),
    ]),
    ...(adjustments ?? []).map((row) => [
      "correction",
      row.entry_date,
      (row.amount_cents / 100).toFixed(2),
      row.reason,
      null,
      row.chapter_slug,
      null,
      null,
    ]),
  ]);

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="santamore-isplate.csv"',
    },
  });
}
