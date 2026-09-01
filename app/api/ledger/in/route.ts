import { toCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Public money-in export — same data as v_public_ledger_in, nothing more. */
export async function GET() {
  const supabase = await createClient();
  const [{ data: rows }, { data: adjustments }] = await Promise.all([
    supabase
      .from("v_public_ledger_in")
      .select("*")
      .order("entry_date", { ascending: false }),
    supabase
      .from("v_public_ledger_adjustments")
      .select("*")
      .is("references_disbursement_id", null)
      .order("entry_date", { ascending: false }),
  ]);

  const csv = toCsv([
    ["type", "date", "amount_eur", "display_name", "fundraiser", "campaign", "chapter", "rail"],
    ...(rows ?? []).map((row) => [
      "entry",
      row.entry_date,
      (row.amount_cents / 100).toFixed(2),
      row.display_name,
      row.fundraiser_title,
      row.campaign_title,
      row.chapter_slug,
      row.rail,
    ]),
    ...(adjustments ?? []).map((row) => [
      "correction",
      row.entry_date,
      (row.amount_cents / 100).toFixed(2),
      row.reason,
      null,
      null,
      row.chapter_slug,
      null,
    ]),
  ]);

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="santamore-uplate.csv"',
    },
  });
}
