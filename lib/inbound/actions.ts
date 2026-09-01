"use server";

import { z } from "zod";

import { MAX_CENTS, parseEurosToCents } from "@/lib/money";
import { createServiceClient } from "@/lib/supabase/admin";

// Public, unauthenticated forms. Inserts go through the service role (the
// tables have no anon grants); a honeypot field swallows naive bots — real
// rate limiting arrives with Task 8.

export interface InboundResult {
  ok: boolean;
}

const inboundSchema = z
  .object({
    kind: z.enum(["contact", "volunteer", "partner", "newsletter"]),
    name: z.string().trim().max(100).optional(),
    email: z.string().trim().email().max(100),
    phone: z.string().trim().max(40).optional(),
    message: z.string().trim().max(2000).optional(),
    locale: z.enum(["me", "en", "ru"]),
    /** Honeypot: humans never see it, bots fill it. */
    website: z.string().optional(),
  })
  .refine(
    (data) =>
      data.kind === "newsletter" ||
      data.kind === "volunteer" ||
      (data.message ?? "").length >= 5,
    { message: "message required" },
  );

export async function submitInbound(input: unknown): Promise<InboundResult> {
  const parsed = inboundSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  // Bot filled the honeypot: report success, store nothing.
  if (parsed.data.website) return { ok: true };

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("inbound_messages").insert({
      kind: parsed.data.kind,
      name: parsed.data.name || null,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      message: parsed.data.message || null,
      locale: parsed.data.locale,
    });
    if (error) {
      console.error("[inbound] insert failed:", error.code);
      return { ok: false };
    }
    return { ok: true };
  } catch (error) {
    console.error("[inbound] insert failed:", error);
    return { ok: false };
  }
}

const applicationSchema = z.object({
  applicantName: z.string().trim().min(2).max(100),
  contact: z.string().trim().min(5).max(200),
  category: z.enum(["family", "children", "business", "organisation"]),
  amountRequested: z.string().trim().max(20).optional(),
  description: z.string().trim().min(20).max(4000),
  locale: z.enum(["me", "en", "ru"]),
  website: z.string().optional(),
});

/** Beneficiary application (brief §5 /prijava-za-pomoc): open to anyone. */
export async function submitBeneficiaryApplication(
  input: unknown,
): Promise<InboundResult> {
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  if (parsed.data.website) return { ok: true };

  let amountCents: number | null = null;
  if (parsed.data.amountRequested) {
    amountCents = parseEurosToCents(parsed.data.amountRequested);
    if (amountCents === null || amountCents > MAX_CENTS) return { ok: false };
  }

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("beneficiary_applications").insert({
      applicant_name: parsed.data.applicantName,
      contact: parsed.data.contact,
      category: parsed.data.category,
      amount_requested_cents: amountCents,
      description: parsed.data.description,
    });
    if (error) {
      console.error("[inbound] application failed:", error.code);
      return { ok: false };
    }
    return { ok: true };
  } catch (error) {
    console.error("[inbound] application failed:", error);
    return { ok: false };
  }
}
