"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { buildRegistrationEmail } from "@/lib/email/registration";
import { sendEmail } from "@/lib/email/send";
import { generatePaymentReference } from "@/lib/references";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { WAIVER_VERSION } from "@/lib/waiver";

const registerSchema = z.object({
  eventSlug: z.string().trim().min(1).max(100),
  distance: z.string().trim().min(1).max(60).nullable(),
  shirtSize: z.enum(["XS", "S", "M", "L", "XL", "XXL"]).nullable(),
  /** Empty when the event is free (no price tiers). */
  tierLabel: z.string().trim().max(100),
  /** Required for races and challenges; a gathering has no waiver. */
  waiverAccepted: z.boolean(),
  participantName: z.string().trim().min(2).max(120),
  participantEmail: z.string().trim().email().max(120),
  participantPhone: z.string().trim().max(40).default(""),
  locale: z.enum(["me", "en", "ru"]),
});

interface Tier {
  label: string;
  amount_cents: number;
}

function parseTiers(value: unknown): Tier[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) =>
    typeof entry?.label === "string" &&
    typeof entry?.amount_cents === "number" &&
    Number.isInteger(entry.amount_cents) &&
    entry.amount_cents >= 0
      ? [{ label: entry.label, amount_cents: entry.amount_cents }]
      : [],
  );
}

export interface RegisterResult {
  ok: boolean;
  error?: "invalid" | "closed" | "full" | "server";
}

/**
 * Register a participant for an event under the signed-in account — the
 * account holder or someone they register (a child, a friend). Waiver
 * recorded where the event needs one, per-registration SEPA reference
 * minted server-side, entry fee owed to the Operations Fund; a free tier
 * confirms on the spot. Idempotent per (event, account, participant email).
 */
export async function registerForEvent(input: unknown): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return { ok: false, error: "server" };

  try {
    const service = createServiceClient();
    const { data: event } = await service
      .from("events")
      .select(
        "id, name, kind, is_published, distances, price_tiers, capacity, registration_opens_at, registration_closes_at, offers_shirts",
      )
      .eq("slug", data.eventSlug)
      .maybeSingle();
    if (!event?.is_published) return { ok: false, error: "server" };
    if (event.kind !== "social" && !data.waiverAccepted) return { ok: false, error: "invalid" };
    const shirtSize = event.offers_shirts ? data.shirtSize : null;

    const now = Date.now();
    if (
      (event.registration_opens_at &&
        now < new Date(event.registration_opens_at).getTime()) ||
      (event.registration_closes_at &&
        now > new Date(event.registration_closes_at).getTime())
    ) {
      return { ok: false, error: "closed" };
    }

    const distances = Array.isArray(event.distances)
      ? (event.distances as string[])
      : [];
    if (data.distance !== null && !distances.includes(data.distance)) {
      return { ok: false, error: "invalid" };
    }
    // Free events (no tiers) register at zero; priced events need a valid tier.
    const tiers = parseTiers(event.price_tiers);
    const tier =
      tiers.length === 0
        ? null
        : tiers.find((candidate) => candidate.label === data.tierLabel);
    if (tiers.length > 0 && !tier) return { ok: false, error: "invalid" };

    const { data: existing } = await service
      .from("registrations")
      .select("id")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .eq("participant_email", data.participantEmail.toLowerCase())
      .neq("status", "cancelled")
      .maybeSingle();
    if (existing) return { ok: true };

    // Capacity gate (best effort — the tiny race window can only ever
    // oversell by concurrent submissions, not without bound).
    if (typeof event.capacity === "number" && event.capacity > 0) {
      const { count } = await service
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .neq("status", "cancelled");
      if ((count ?? 0) >= event.capacity) return { ok: false, error: "full" };
    }

    let inserted = false;
    let reference = "";
    for (let attempt = 0; attempt < 5 && !inserted; attempt += 1) {
      reference = generatePaymentReference();
      const { error } = await service.from("registrations").insert({
        event_id: event.id,
        user_id: user.id,
        distance: data.distance,
        shirt_size: shirtSize,
        tier_label: tier?.label ?? null,
        amount_due_cents: tier?.amount_cents ?? 0,
        payment_reference: reference,
        waiver_signed_at: event.kind === "social" ? null : new Date().toISOString(),
        waiver_version: event.kind === "social" ? null : WAIVER_VERSION,
        participant_name: data.participantName,
        participant_email: data.participantEmail.toLowerCase(),
        participant_phone: data.participantPhone || null,
        // Nothing to pay → the place is confirmed right away.
        status: (tier?.amount_cents ?? 0) === 0 ? "confirmed" : "pending",
      });
      if (!error) inserted = true;
      else if (error.code !== "23505" && error.code !== "P0001") {
        console.error("[events] registration failed:", error.code);
        return { ok: false, error: "server" };
      }
    }
    if (!inserted) return { ok: false, error: "server" };

    // Best effort — a failed email must never lose the registration.
    {
      try {
        await sendEmail(
          await buildRegistrationEmail({
            locale: data.locale,
            name: data.participantName,
            email: data.participantEmail,
            eventName: event.name,
            distance: data.distance,
            tierLabel: tier?.label ?? null,
            reference,
            amountDueCents: tier?.amount_cents ?? 0,
          }),
        );
      } catch (emailError) {
        console.error("[events] registration email failed:", emailError);
      }
    }

    revalidatePath("/[locale]/dogadjaji", "layout");
    return { ok: true };
  } catch (error) {
    console.error("[events] registration failed:", error);
    return { ok: false, error: "server" };
  }
}
