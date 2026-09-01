import { toCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface ExportRow {
  distance: string | null;
  shirt_size: string | null;
  tier_label: string | null;
  bib_number: string | null;
  waiver_signed_at: string | null;
  waiver_version: string | null;
  amount_due_cents: number;
  amount_paid_cents: number;
  payment_reference: string | null;
  status: string;
  profile: { full_name: string | null } | { full_name: string | null }[] | null;
  event: { name: string } | { name: string }[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Staff-only start-list export. RLS already limits non-staff to their own
 * rows, but this endpoint is explicitly gated so a runner can't export a
 * one-line CSV of themselves and mistake it for the start list.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "chapter_lead") {
    return new Response("Forbidden", { status: 403 });
  }

  const eventId = new URL(request.url).searchParams.get("event");
  if (!eventId || !/^[0-9a-f-]{36}$/i.test(eventId)) {
    return new Response("Bad Request", { status: 400 });
  }

  const { data } = await supabase
    .from("registrations")
    .select(
      "distance, shirt_size, tier_label, bib_number, waiver_signed_at, waiver_version, amount_due_cents, amount_paid_cents, payment_reference, status, profile:profiles(full_name), event:events(name)",
    )
    .eq("event_id", eventId)
    .order("status", { ascending: true });
  const rows = (data ?? []) as unknown as ExportRow[];

  const csv = toCsv([
    [
      "name",
      "event",
      "distance",
      "shirt_size",
      "tier",
      "bib",
      "status",
      "fee_due_eur",
      "fee_paid_eur",
      "reference",
      "waiver_signed",
      "waiver_version",
    ],
    ...rows.map((row) => [
      one(row.profile)?.full_name ?? "",
      one(row.event)?.name ?? "",
      row.distance,
      row.shirt_size,
      row.tier_label,
      row.bib_number,
      row.status,
      (row.amount_due_cents / 100).toFixed(2),
      (row.amount_paid_cents / 100).toFixed(2),
      row.payment_reference,
      row.waiver_signed_at,
      row.waiver_version,
    ]),
  ]);

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="santamore-prijave.csv"',
    },
  });
}
