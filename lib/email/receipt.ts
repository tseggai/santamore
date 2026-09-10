import "server-only";

import { buildReceiptEmail } from "@/lib/email/donation";
import { sendEmail } from "@/lib/email/send";
import { createServiceClient } from "@/lib/supabase/admin";
import { routing, type Locale } from "@/i18n/routing";

/**
 * (Re)send the receipt for an APPROVED donation to the address on the row.
 * Callers must already have established that the caller may do this (staff
 * session, or the member the donation belongs to); this helper reads with
 * the service role because donations carry no member grants.
 */
export async function sendReceiptFor(donationId: string): Promise<boolean> {
  const service = createServiceClient();
  const { data } = await service
    .from("donations")
    .select(
      "amount_cents, status, donor_name, donor_email, donor_locale, campaign:campaigns(title, payment_reference), fundraiser:fundraisers(title, payment_reference)",
    )
    .eq("id", donationId)
    .single();
  if (!data?.donor_email || data.status !== "approved") return false;

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
    return true;
  } catch (error) {
    console.error("[receipt] email failed:", error);
    return false;
  }
}
