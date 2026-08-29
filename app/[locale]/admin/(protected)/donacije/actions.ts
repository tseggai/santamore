"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { buildReceiptEmail } from "@/lib/email/donation";
import { sendEmail } from "@/lib/email/send";
import { MAX_CENTS } from "@/lib/money";
import { PAYMENT_REFERENCE_PATTERN } from "@/lib/references";
import { createClient } from "@/lib/supabase/server";
import { routing, type Locale } from "@/i18n/routing";

// All queries here run with the ADMIN'S OWN session (cookie client): the
// is_staff() RLS policies from migration 0004 are the enforcement — a
// non-staff caller updates zero rows and gets an error result. No service
// role on this path.

export interface ActionResult {
  ok: boolean;
}

const approveSchema = z.object({
  donationId: z.string().uuid(),
  /** Statement amount, when it differs from the pledge (the bank is the truth). */
  amountCents: z.number().int().positive().max(MAX_CENTS).optional(),
  /** Statement credit date — truthful ledger dating; defaults to now. */
  approvedAtIso: z.string().datetime().optional(),
});

const createSchema = z.object({
  reference: z.string().regex(PAYMENT_REFERENCE_PATTERN),
  amountCents: z.number().int().positive().max(MAX_CENTS),
  approvedAtIso: z.string().datetime().optional(),
});

async function sendReceiptFor(donationId: string): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("donations")
    .select(
      "amount_cents, donor_name, donor_email, donor_locale, campaign:campaigns(title, payment_reference), fundraiser:fundraisers(title, payment_reference)",
    )
    .eq("id", donationId)
    .single();
  if (!data?.donor_email) return;

  // Without generated DB types supabase-js types to-one embeds as arrays.
  const pageRaw = (data.campaign ?? data.fundraiser) as
    | { title: string; payment_reference: string }
    | { title: string; payment_reference: string }[]
    | null;
  const page = Array.isArray(pageRaw) ? pageRaw[0] : pageRaw;
  const locale: Locale = routing.locales.includes(data.donor_locale as Locale)
    ? (data.donor_locale as Locale)
    : routing.defaultLocale;
  try {
    await sendEmail(
      await buildReceiptEmail({
        locale,
        donorName: data.donor_name ?? "",
        donorEmail: data.donor_email,
        campaignTitle: page?.title ?? "Santamore",
        reference: page?.payment_reference ?? "",
        amountCents: data.amount_cents,
        isRecurring: false,
      }),
    );
  } catch (error) {
    console.error("[reconcile] receipt email failed:", error);
  }
}

/** Approve a matched pending pledge (pending → approved, per the trigger). */
export async function approvePledge(input: unknown): Promise<ActionResult> {
  const parsed = approveSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { donationId, amountCents, approvedAtIso } = parsed.data;

  const supabase = await createClient();

  // The statement amount is what actually arrived; correct the pending row
  // first (pending rows are freely updatable, approved rows are frozen).
  if (amountCents !== undefined) {
    const { error } = await supabase
      .from("donations")
      .update({ amount_cents: amountCents })
      .eq("id", donationId)
      .eq("status", "pending")
      .select("id")
      .single();
    if (error) return { ok: false };
  }

  const { error } = await supabase
    .from("donations")
    .update({
      status: "approved",
      approved_at: approvedAtIso ?? new Date().toISOString(),
    })
    .eq("id", donationId)
    .eq("status", "pending")
    .select("id")
    .single();
  if (error) return { ok: false };

  await sendReceiptFor(donationId);
  revalidatePath("/[locale]/admin/donacije", "page");
  return { ok: true };
}

/**
 * Record a transfer that arrived with a valid reference but no pledge
 * (donor paid without submitting the form — the page-level reference still
 * identifies the target). No donor identity: anonymous in the ledger.
 */
export async function createDonationFromStatement(
  input: unknown,
): Promise<ActionResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { reference, amountCents, approvedAtIso } = parsed.data;

  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, chapter_id")
    .eq("payment_reference", reference)
    .maybeSingle();
  const { data: fundraiserRaw } = campaign
    ? { data: null }
    : await supabase
        .from("fundraisers")
        .select("id, event:events(chapter_id)")
        .eq("payment_reference", reference)
        .maybeSingle();
  const fundraiser = fundraiserRaw as {
    id: string;
    event: { chapter_id: string | null } | { chapter_id: string | null }[] | null;
  } | null;
  if (!campaign && !fundraiser) return { ok: false };

  // The chapter comes from the campaign, or from the fundraiser's event —
  // v_chapter_totals sums by donations.chapter_id, so leaving it null
  // would silently drop the gift from the public chapter totals.
  const fundraiserEvent = Array.isArray(fundraiser?.event)
    ? fundraiser?.event[0]
    : fundraiser?.event;
  const { error } = await supabase.from("donations").insert({
    amount_cents: amountCents,
    fee_covered_cents: 0,
    campaign_id: campaign?.id ?? null,
    chapter_id: campaign?.chapter_id ?? fundraiserEvent?.chapter_id ?? null,
    fundraiser_id: fundraiser?.id ?? null,
    is_anonymous: true,
    rail: "sepa",
    status: "approved",
    approved_at: approvedAtIso ?? new Date().toISOString(),
  });
  if (error) return { ok: false };

  revalidatePath("/[locale]/admin/donacije", "page");
  return { ok: true };
}
