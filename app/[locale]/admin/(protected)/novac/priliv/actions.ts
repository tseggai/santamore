"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { buildInstructionsEmail } from "@/lib/email/donation";
import { sendReceiptFor } from "@/lib/email/receipt";
import { sendEmail } from "@/lib/email/send";
import { getOrgBankDetails, hasBankDetails } from "@/lib/org";
import { MAX_CENTS } from "@/lib/money";
import { PAYMENT_REFERENCE_PATTERN } from "@/lib/references";
import { createClient } from "@/lib/supabase/server";

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
  revalidatePath("/[locale]/admin/novac", "layout");
  return { ok: true };
}

const refundSchema = z.object({
  donationId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
});

/**
 * Refund = one logical operation: approved → refunded plus the negative
 * ledger_adjustments row, atomically via the refund_donation RPC
 * (migration 0007). The original row stays visible in the public ledger;
 * the adjustment is the correction (append-only, brief §11).
 */
export async function refundDonation(input: unknown): Promise<ActionResult> {
  const parsed = refundSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase.rpc("refund_donation", {
    p_donation_id: parsed.data.donationId,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false };

  revalidatePath("/[locale]/admin/novac", "layout");
  return { ok: true };
}

const resendSchema = z.object({ donationId: z.string().uuid() });

/** Re-send the receipt email for an approved donation (donor asked again). */
export async function resendReceipt(input: unknown): Promise<ActionResult> {
  const parsed = resendSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const { data } = await supabase
    .from("donations")
    .select("id, status")
    .eq("id", parsed.data.donationId)
    .eq("status", "approved")
    .maybeSingle();
  if (!data) return { ok: false };

  await sendReceiptFor(data.id);
  return { ok: true };
}

const feeSchema = z.object({
  registrationId: z.string().uuid(),
  /** Statement amount when it differs from the fee due (the bank is the truth). */
  amountCents: z.number().int().positive().max(MAX_CENTS).optional(),
});

/**
 * Approve a matched entry-fee transfer: pending → confirmed with the paid
 * amount recorded on the REGISTRATION (Operations Fund). Never touches
 * donations — the two funds stay unmixed.
 */
export async function approveRegistrationFee(input: unknown): Promise<ActionResult> {
  const parsed = feeSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { registrationId, amountCents } = parsed.data;

  const supabase = await createClient();
  const { data: registration } = await supabase
    .from("registrations")
    .select("amount_due_cents")
    .eq("id", registrationId)
    .eq("status", "pending")
    .maybeSingle();
  if (!registration) return { ok: false };

  const { error } = await supabase
    .from("registrations")
    .update({
      status: "confirmed",
      amount_paid_cents: amountCents ?? registration.amount_due_cents,
    })
    .eq("id", registrationId)
    .eq("status", "pending")
    .select("id")
    .single();
  if (error) return { ok: false };

  revalidatePath("/[locale]/admin/novac", "layout");
  revalidatePath("/[locale]/admin/dogadjaji", "layout");
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

  revalidatePath("/[locale]/admin/novac", "layout");
  return { ok: true };
}

export interface SendInstructionsResult {
  ok: boolean;
  sent: number;
  failed: number;
  error?: "unconfigured";
}

/**
 * Pledges made before the bank account existed are still waiting for
 * their transfer details. Once the real IBAN is set, this sends every one
 * of them the instructions email and records when. Staff only, through
 * the admin's own session: the is_staff() policies decide.
 */
export async function sendPledgeInstructions(): Promise<SendInstructionsResult> {
  if (!hasBankDetails(getOrgBankDetails())) return { ok: false, sent: 0, failed: 0, error: "unconfigured" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("donations")
    .select("id, amount_cents, donor_name, donor_email, is_recurring, donor_locale, campaign:campaigns(title, payment_reference), fundraiser:fundraisers(title, payment_reference)")
    .eq("rail", "sepa")
    .eq("status", "pending")
    .is("instructions_sent_at", null)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return { ok: false, sent: 0, failed: 0 };
  let sent = 0;
  let failed = 0;
  for (const row of data ?? []) {
    const one = <T,>(value: T | T[] | null): T | null => (Array.isArray(value) ? value[0] ?? null : value);
    const target = one(row.fundraiser as { title: string; payment_reference: string } | { title: string; payment_reference: string }[] | null) ?? one(row.campaign as { title: string; payment_reference: string } | { title: string; payment_reference: string }[] | null);
    if (!target || !row.donor_email) { failed += 1; continue; }
    try {
      await sendEmail(
        await buildInstructionsEmail({
          locale: (["me", "en", "ru"].includes(row.donor_locale ?? "") ? row.donor_locale : "me") as "me" | "en" | "ru",
          donorName: row.donor_name ?? "",
          donorEmail: row.donor_email,
          campaignTitle: target.title,
          reference: target.payment_reference,
          amountCents: row.amount_cents,
          isRecurring: Boolean(row.is_recurring),
        }),
      );
      const { error: updateError } = await supabase.from("donations").update({ instructions_sent_at: new Date().toISOString() }).eq("id", row.id);
      if (updateError) failed += 1;
      else sent += 1;
    } catch (emailError) {
      console.error("[pledges] instructions email failed:", emailError);
      failed += 1;
    }
  }
  revalidatePath("/[locale]/admin/novac/priliv", "page");
  return { ok: true, sent, failed };
}
