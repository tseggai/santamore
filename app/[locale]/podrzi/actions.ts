"use server";

import { buildInstructionsEmail } from "@/lib/email/donation";
import { sendEmail } from "@/lib/email/send";
import { donationPledgeSchema } from "@/lib/schemas/donation";
import { createServiceClient } from "@/lib/supabase/admin";

export interface PledgeResult {
  ok: boolean;
  /** The page-level payment reference the donor must quote. */
  reference?: string;
  error?: "invalid" | "server";
}

/**
 * Record a SEPA pledge: a `pending` donation row the admin reconciliation
 * queue can match against the bank statement (brief §8.4). Pending rows
 * never appear in public totals — the v_public_* views only show approved.
 */
export async function createSepaPledge(input: unknown): Promise<PledgeResult> {
  const parsed = donationPledgeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid" };
  }
  const pledge = parsed.data;

  try {
    // Service role: the donations table deliberately has no anon grants.
    const supabase = createServiceClient();

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, title, chapter_id, payment_reference, is_public")
      .eq("slug", pledge.campaignSlug)
      .single();
    if (campaignError || !campaign || !campaign.is_public) {
      return { ok: false, error: "server" };
    }

    // SEPA transfers carry no processing fee, so nothing to cover on this
    // rail — fee_covered_cents stays 0 and net_cents equals the gift.
    const { error: insertError } = await supabase.from("donations").insert({
      amount_cents: pledge.amountCents,
      fee_covered_cents: 0,
      campaign_id: campaign.id,
      chapter_id: campaign.chapter_id,
      donor_name: pledge.name,
      donor_email: pledge.email,
      display_name: pledge.anonymous ? null : pledge.name,
      is_anonymous: pledge.anonymous,
      message: pledge.message === "" ? null : pledge.message,
      is_recurring: pledge.monthly,
      rail: "sepa",
      status: "pending",
      donor_locale: pledge.locale,
    });
    if (insertError) {
      console.error("[donate] pending insert failed:", insertError.code);
      return { ok: false, error: "server" };
    }

    // Best effort: a failed email must never lose the pledge.
    try {
      await sendEmail(
        await buildInstructionsEmail({
          locale: pledge.locale,
          donorName: pledge.name,
          donorEmail: pledge.email,
          campaignTitle: campaign.title,
          reference: campaign.payment_reference,
          amountCents: pledge.amountCents,
          isRecurring: pledge.monthly,
        }),
      );
    } catch (emailError) {
      console.error("[donate] instructions email failed:", emailError);
    }

    return { ok: true, reference: campaign.payment_reference };
  } catch (error) {
    console.error("[donate] pledge failed:", error);
    return { ok: false, error: "server" };
  }
}
