"use server";

import { buildInstructionsEmail } from "@/lib/email/donation";
import { sendEmail } from "@/lib/email/send";
import { getOrgBankDetails, hasBankDetails } from "@/lib/org";
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

  // No bank details, no pledge: a pending row the donor cannot pay (and an
  // instructions email full of [[PLACEHOLDER]]s) is worse than an error.
  if (!hasBankDetails(getOrgBankDetails())) {
    return { ok: false, error: "server" };
  }

  try {
    // Service role: the donations table deliberately has no anon grants.
    const supabase = createServiceClient();

    // Resolve the target: a public campaign, or an ACTIVE fundraiser page
    // (its chapter comes via the event, for v_chapter_totals).
    let target:
      | {
          title: string;
          reference: string;
          chapterId: string | null;
          campaignId?: string;
          fundraiserId?: string;
        }
      | null = null;
    if (pledge.fundraiserSlug !== undefined) {
      const { data: fundraiser } = await supabase
        .from("fundraisers")
        .select("id, title, status, payment_reference, event:events(chapter_id)")
        .eq("slug", pledge.fundraiserSlug)
        .single();
      if (fundraiser && fundraiser.status === "active") {
        const event = Array.isArray(fundraiser.event)
          ? fundraiser.event[0]
          : fundraiser.event;
        target = {
          title: fundraiser.title,
          reference: fundraiser.payment_reference,
          chapterId: event?.chapter_id ?? null,
          fundraiserId: fundraiser.id,
        };
      }
    } else {
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("id, title, chapter_id, payment_reference, is_public")
        .eq("slug", pledge.campaignSlug)
        .single();
      if (campaign?.is_public) {
        target = {
          title: campaign.title,
          reference: campaign.payment_reference,
          chapterId: campaign.chapter_id,
          campaignId: campaign.id,
        };
      }
    }
    if (!target) {
      return { ok: false, error: "server" };
    }

    // SEPA transfers carry no processing fee, so nothing to cover on this
    // rail — fee_covered_cents stays 0 and net_cents equals the gift.
    const { error: insertError } = await supabase.from("donations").insert({
      amount_cents: pledge.amountCents,
      fee_covered_cents: 0,
      campaign_id: target.campaignId ?? null,
      fundraiser_id: target.fundraiserId ?? null,
      chapter_id: target.chapterId,
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
          campaignTitle: target.title,
          reference: target.reference,
          amountCents: pledge.amountCents,
          isRecurring: pledge.monthly,
        }),
      );
    } catch (emailError) {
      console.error("[donate] instructions email failed:", emailError);
    }

    return { ok: true, reference: target.reference };
  } catch (error) {
    console.error("[donate] pledge failed:", error);
    return { ok: false, error: "server" };
  }
}
