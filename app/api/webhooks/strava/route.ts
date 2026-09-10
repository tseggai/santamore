import { NextResponse, after } from "next/server";
import { z } from "zod";

import { stravaConfig } from "@/lib/strava/api";
import { verifyHandshake, webhookEventKey, type StravaWebhookEvent } from "@/lib/strava/rules";
import { connectionForAthlete, forgetAthlete, removeActivity, syncOne } from "@/lib/strava/sync";
import { createServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Strava webhook (docs/STRAVA.md). Strava signs nothing on event delivery —
 * the only secret is the verify token exchanged at subscription time — so
 * this handler treats every event as an untrusted hint: it never writes
 * from the payload. It re-fetches the activity from Strava with the
 * athlete's own token, which a forged event cannot influence. Idempotent
 * via webhook_events (Strava retries up to 3×), and it answers within
 * Strava's 2-second budget by doing the work after the response.
 */

// ── Subscription validation handshake ────────────────────────────────────
export async function GET(request: Request) {
  const result = verifyHandshake(new URL(request.url).searchParams, stravaConfig().verifyToken);
  if (!result.ok) return new NextResponse("forbidden", { status: 403 });
  return NextResponse.json({ "hub.challenge": result.challenge });
}

const eventSchema = z.object({
  object_type: z.enum(["activity", "athlete"]),
  object_id: z.number().int(),
  aspect_type: z.enum(["create", "update", "delete"]),
  owner_id: z.number().int(),
  subscription_id: z.number().int(),
  event_time: z.number().int(),
  updates: z.record(z.string(), z.string()).optional(),
});

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new NextResponse("bad request", { status: 400 });
  }
  const parsed = eventSchema.safeParse(payload);
  // Malformed events get a 200 too — a 4xx only makes Strava retry.
  if (!parsed.success) return NextResponse.json({ ok: true, ignored: true });
  const event = parsed.data as StravaWebhookEvent;

  const service = createServiceClient();
  const key = webhookEventKey(event);
  const { error } = await service.from("webhook_events").insert({
    provider: "strava",
    provider_event_id: key,
    payload: event,
    // Strava provides no event signature (see doc comment).
    signature_valid: false,
  });
  if (error) {
    // 23505: already seen — Strava retrying. Nothing more to do.
    if (error.code !== "23505") console.error("[strava] webhook log failed:", error.code);
    return NextResponse.json({ ok: true, duplicate: true });
  }

  after(async () => {
    try {
      await process(event);
      await service
        .from("webhook_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("provider_event_id", key);
    } catch (processError) {
      console.error("[strava] webhook processing failed:", processError);
    }
  });

  return NextResponse.json({ ok: true });
}

async function process(event: StravaWebhookEvent): Promise<void> {
  const connection = await connectionForAthlete(event.owner_id);
  if (!connection) return;

  if (event.object_type === "athlete") {
    if (event.updates?.authorized === "false") await forgetAthlete(connection.user_id);
    return;
  }

  if (event.aspect_type === "delete") {
    await removeActivity(event.object_id);
    return;
  }
  await syncOne(connection, event.object_id);
}
