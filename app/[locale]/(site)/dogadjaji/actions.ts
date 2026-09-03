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
  waiverAccepted: z.literal(true),
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
 * Register the signed-in user for an event: waiver recorded, per-registration
 * SEPA reference minted server-side, entry fee owed to the Operations Fund.
 * Idempotent per (event, user) — an existing registration just returns ok.
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
        "id, name, is_published, distances, price_tiers, capacity, registration_opens_at, registration_closes_at",
      )
      .eq("slug", data.eventSlug)
      .maybeSingle();
    if (!event?.is_published) return { ok: false, error: "server" };

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
        shirt_size: data.shirtSize,
        tier_label: tier?.label ?? null,
        amount_due_cents: tier?.amount_cents ?? 0,
        payment_reference: reference,
        waiver_signed_at: new Date().toISOString(),
        waiver_version: WAIVER_VERSION,
        status: "pending",
      });
      if (!error) inserted = true;
      else if (
        error.code === "23505" &&
        `${error.message} ${error.details ?? ""}`.includes("event_id")
      ) {
        // Double-submit race: the other request won unique(event_id, user_id).
        // The user IS registered — idempotent success, not a reference retry.
        return { ok: true };
      } else if (error.code !== "23505" && error.code !== "P0001") {
        console.error("[events] registration failed:", error.code);
        return { ok: false, error: "server" };
      }
    }
    if (!inserted) return { ok: false, error: "server" };

    // Best effort — a failed email must never lose the registration.
    if (user.email) {
      try {
        const { data: profile } = await service
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();
        await sendEmail(
          await buildRegistrationEmail({
            locale: data.locale,
            name: profile?.full_name?.trim() || user.email,
            email: user.email,
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
