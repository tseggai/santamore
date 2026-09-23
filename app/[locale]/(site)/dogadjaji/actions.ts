"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { buildRegistrationEmail } from "@/lib/email/registration";
import { activeTiers, parseDistances, parseTiers, tiersFor } from "@/lib/events";
import { sendEmail } from "@/lib/email/send";
import { generatePaymentReference } from "@/lib/references";
import { createServiceClient } from "@/lib/supabase/admin";
import { getOrgBankDetails } from "@/lib/org";
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
  /** External race we buy bibs for: this runner wants one of ours. */
  needsBib: z.boolean().default(false),
  /** A gathering: the people this member brings, by name. */
  guests: z.array(z.object({ name: z.string().trim().min(2).max(120), tierLabel: z.string().trim().max(100) })).max(20).default([]),
});

export interface RegisterResult {
  ok: boolean;
  error?: "invalid" | "closed" | "full" | "bibsGone" | "server";
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
        "id, name, kind, is_published, distances, price_tiers, capacity, registration_opens_at, registration_closes_at, offers_shirts, hosting, registration_mode, bib_policy, bib_capacity, max_guests",
      )
      .eq("slug", data.eventSlug)
      .maybeSingle();
    if (!event?.is_published) return { ok: false, error: "server" };
    // Our own races and challenges carry the waiver; a race someone else
    // organises is theirs to waive, and a gathering has none.
    const needsWaiver = event.kind !== "social" && event.hosting !== "external";
    if (needsWaiver && !data.waiverAccepted) return { ok: false, error: "invalid" };
    const guests = event.kind === "social" ? data.guests.slice(0, event.max_guests ?? 0) : [];
    if (event.kind === "social" && data.guests.length > (event.max_guests ?? 0)) return { ok: false, error: "invalid" };
    // A race registered with its organiser: here people only say they run
    // for Santamore, so nothing is owed and no bib of ours is claimed.
    const withOrganizer = event.hosting === "external" && (event.registration_mode ?? "organizer") === "organizer";
    const wantsBib = data.needsBib && event.hosting === "external" && !withOrganizer && event.bib_policy === "we_buy";
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

    const distanceRows = parseDistances(event.distances);
    const distances = distanceRows.map((d) => d.name);
    if (data.distance !== null && !distances.includes(data.distance)) {
      return { ok: false, error: "invalid" };
    }
    if (distances.length > 0 && data.distance === null && event.kind !== "social") {
      return { ok: false, error: "invalid" };
    }
    // Free events (no tiers) register at zero; priced events need a tier
    // that is still on offer today (early-bird dates are enforced here)
    // and meant for the chosen distance.
    const tiers = withOrganizer ? [] : tiersFor(activeTiers(parseTiers(event.price_tiers)), data.distance);
    const tier =
      tiers.length === 0
        ? null
        : tiers.find((candidate) => candidate.label === data.tierLabel);
    if (tiers.length > 0 && !tier) return { ok: false, error: "invalid" };
    const guestTiers = guests.map((guest) => (tiers.length === 0 ? null : tiers.find((candidate) => candidate.label === guest.tierLabel)));
    if (tiers.length > 0 && guestTiers.some((candidate) => !candidate)) return { ok: false, error: "invalid" };
    const dueCents = (tier?.amount_cents ?? 0) + guestTiers.reduce((sum, candidate) => sum + (candidate?.amount_cents ?? 0), 0);

    const { data: existing } = await service
      .from("registrations")
      .select("id")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .eq("participant_email", data.participantEmail.toLowerCase())
      .is("party_of", null)
      .neq("status", "cancelled")
      .maybeSingle();
    if (existing) return { ok: true };

    // Bibs we buy for the team are few; the count is the truth.
    if (wantsBib) {
      const { count } = await service
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("needs_bib", true)
        .neq("status", "cancelled");
      if ((count ?? 0) >= (event.bib_capacity ?? 0)) return { ok: false, error: "bibsGone" };
    }

    // A distance with its own number of places fills on its own.
    const chosen = distanceRows.find((d) => d.name === data.distance);
    if (chosen && typeof chosen.capacity === "number" && chosen.capacity > 0) {
      const { count } = await service
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("distance", chosen.name)
        .neq("status", "cancelled");
      if ((count ?? 0) >= chosen.capacity) return { ok: false, error: "full" };
    }

    // Capacity gate (best effort — the tiny race window can only ever
    // oversell by concurrent submissions, not without bound).
    if (typeof event.capacity === "number" && event.capacity > 0) {
      const { count } = await service
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .neq("status", "cancelled");
      if ((count ?? 0) + guests.length >= event.capacity) return { ok: false, error: "full" };
    }

    // Nothing to pay → the place is confirmed right away.
    const status = dueCents === 0 ? "confirmed" : "pending";
    let primaryId: string | null = null;
    let reference = "";
    for (let attempt = 0; attempt < 5 && !primaryId; attempt += 1) {
      reference = generatePaymentReference();
      const { data: row, error } = await service
        .from("registrations")
        .insert({
          event_id: event.id,
          user_id: user.id,
          distance: data.distance,
          shirt_size: shirtSize,
          tier_label: tier?.label ?? null,
          // The whole party is owed on the one reference the payer quotes.
          amount_due_cents: dueCents,
          payment_reference: reference,
          waiver_signed_at: needsWaiver ? new Date().toISOString() : null,
          waiver_version: needsWaiver ? WAIVER_VERSION : null,
          participant_name: data.participantName,
          participant_email: data.participantEmail.toLowerCase(),
          participant_phone: data.participantPhone || null,
          needs_bib: wantsBib,
          status,
        })
        .select("id")
        .single();
      if (!error && row) primaryId = row.id;
      else if (error && error.code !== "23505" && error.code !== "P0001") {
        console.error("[events] registration failed:", error.code);
        return { ok: false, error: "server" };
      }
    }
    if (!primaryId) return { ok: false, error: "server" };

    if (guests.length > 0) {
      const { error: guestError } = await service.from("registrations").insert(
        guests.map((guest, index) => ({
          event_id: event.id,
          user_id: user.id,
          party_of: primaryId,
          tier_label: guestTiers[index]?.label ?? null,
          amount_due_cents: 0,
          payment_reference: generatePaymentReference(),
          participant_name: guest.name,
          participant_email: data.participantEmail.toLowerCase(),
          status,
        })),
      );
      if (guestError) {
        // The payer owes the party total: without the guest rows the
        // registration is wrong, so it goes back to nothing.
        console.error("[events] guest rows failed:", guestError.code);
        await service.from("registrations").delete().eq("id", primaryId);
        return { ok: false, error: "server" };
      }
    }

    // A gathering registration is also the loudest "I'm coming".
    if (event.kind === "social") {
      await service
        .from("event_rsvps")
        .upsert({ event_id: event.id, user_id: user.id, status: "going", updated_at: new Date().toISOString() }, { onConflict: "event_id,user_id" });
    }

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
            amountDueCents: dueCents,
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

export interface MyRegistration {
  id: string;
  status: "pending" | "confirmed" | "cancelled";
  distance: string | null;
  shirt_size: string | null;
  tier_label: string | null;
  amount_due_cents: number;
  payment_reference: string | null;
  participant_name: string | null;
  /** Set on a guest row: the registration that pays for it. */
  party_of: string | null;
  needs_bib: boolean;
}

export interface RegistrationState {
  signedIn: boolean;
  fullName: string;
  email: string;
  registrations: MyRegistration[];
  bank: { name: string; iban: string; bic: string };
}

/** What the register overlay needs: who is signed in and what they already hold on this event. */
export async function fetchRegistrationState(eventSlug: string): Promise<RegistrationState> {
  const empty: RegistrationState = { signedIn: false, fullName: "", email: "", registrations: [], bank: getOrgBankDetails() };
  const slug = z.string().trim().min(1).max(100).safeParse(eventSlug);
  if (!slug.success) return empty;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;
  const { data: event } = await supabase.from("v_public_events").select("id").eq("slug", slug.data).maybeSingle();
  if (!event) return empty;
  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase
      .from("registrations")
      .select("id, status, distance, shirt_size, tier_label, amount_due_cents, payment_reference, participant_name, party_of, needs_bib")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  return {
    signedIn: true,
    fullName: profile?.full_name ?? "",
    email: user.email ?? "",
    registrations: (rows ?? []) as MyRegistration[],
    bank: getOrgBankDetails(),
  };
}
