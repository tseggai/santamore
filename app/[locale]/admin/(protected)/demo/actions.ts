"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  AVATAR_PALETTES,
  DONOR_MESSAGES,
  DONOR_NAMES,
  FIRST_NAMES,
  LAST_NAMES,
  STORY_CLOSERS,
  STORY_MIDDLES,
  STORY_OPENERS,
  TEAM_DESCRIPTIONS,
  TEAM_NAMES,
} from "@/lib/demo/pools";
import { demoPersonAvatar, demoTeamAvatar } from "@/lib/demo/avatar";
import { generatePaymentReference } from "@/lib/references";
import { slugify } from "@/lib/slug";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Demo data is service-role work (auth users, active pages, approved
// donations) gated on a server-side staff check. Every row goes into
// demo_records so purgeDemoData() removes exactly what was generated.

export interface DemoResult {
  ok: boolean;
  error?: "invalid" | "forbidden" | "no_event" | "server";
  created?: { users: number; teams: number; fundraisers: number; donations: number };
  purged?: { users: number };
  /** refreshDemoPhotos: rows given a new avatar. */
  refreshed?: number;
}

const generateSchema = z.object({
  teams: z.number().int().min(1).max(10),
  perTeam: z.number().int().min(1).max(8),
  maxDonations: z.number().int().min(0).max(15),
});

const DEMO_DOMAIN = "demo.santamore.invalid";
const DONATION_AMOUNTS = [500, 1000, 1000, 1500, 2000, 2500, 2500, 3000, 5000, 5000, 7500, 10000];
const DAY_MS = 86_400_000;

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function suffix(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

async function requireStaff(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "admin" || profile?.role === "chapter_lead";
}

/**
 * Generate teams → runners (auth user + profile + active page with photo,
 * story, goal) → approved donations spread over the last 30 days. Runs
 * against the next upcoming published event.
 */
export async function generateDemoData(input: unknown): Promise<DemoResult> {
  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!(await requireStaff())) return { ok: false, error: "forbidden" };

  const service = createServiceClient();
  const created = { users: 0, teams: 0, fundraisers: 0, donations: 0 };
  const records: { kind: string; row_id: string }[] = [];

  try {
    const { data: upcoming } = await service
      .from("events")
      .select("id, chapter_id, campaign_id")
      .eq("is_published", true)
      .not("campaign_id", "is", null)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const event =
      upcoming ??
      (
        await service
          .from("events")
          .select("id, chapter_id, campaign_id")
          .eq("is_published", true)
          .not("campaign_id", "is", null)
          .order("starts_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data;
    if (!event) return { ok: false, error: "no_event" };

    const { data: existingTeams } = await service
      .from("teams")
      .select("name")
      .eq("campaign_id", event.campaign_id);
    const taken = new Set((existingTeams ?? []).map((row) => row.name));
    const teamNames = TEAM_NAMES.filter((name) => !taken.has(name));

    const donationRows: Record<string, unknown>[] = [];

    for (let teamIndex = 0; teamIndex < parsed.data.teams; teamIndex += 1) {
      const teamName = teamNames[teamIndex] ?? `${pick(TEAM_NAMES)} ${suffix()}`;
      const members: { userId: string; fundraiserId: string }[] = [];

      for (let memberIndex = 0; memberIndex < parsed.data.perTeam; memberIndex += 1) {
        const fullName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
        const { data: userData, error: userError } = await service.auth.admin.createUser({
          email: `runner-${crypto.randomUUID().slice(0, 8)}@${DEMO_DOMAIN}`,
          email_confirm: true,
          password: crypto.randomUUID(),
          user_metadata: { demo: true, full_name: fullName },
        });
        if (userError || !userData.user) throw userError ?? new Error("user create failed");
        const userId = userData.user.id;
        records.push({ kind: "user", row_id: userId });
        created.users += 1;
        await service.from("profiles").update({ full_name: fullName }).eq("id", userId);

        const palette = pick(AVATAR_PALETTES);
        const photoPath = `${userId}/demo.png`;
        const { error: uploadError } = await service.storage
          .from("fundraiser-photos")
          .upload(photoPath, await demoPersonAvatar(userId, palette), {
            contentType: "image/png",
            upsert: true,
          });
        if (uploadError) throw uploadError;

        const story = `${pick(STORY_OPENERS)} ${pick(STORY_MIDDLES)} ${pick(STORY_CLOSERS)}`;
        const goalCents = pick([30000, 50000, 50000, 75000, 100000, 150000, 200000, 300000]);
        let fundraiserId: string | null = null;
        for (let attempt = 0; attempt < 5 && !fundraiserId; attempt += 1) {
          const { data, error } = await service
            .from("fundraisers")
            .insert({
              user_id: userId,
              campaign_id: event.campaign_id,
              event_id: event.id,
              slug: `${slugify(fullName, "trkac")}-${suffix()}`,
              title: fullName,
              story,
              goal_cents: goalCents,
              photo_path: photoPath,
              payment_reference: generatePaymentReference(),
              status: "active",
            })
            .select("id")
            .single();
          if (data) fundraiserId = data.id;
          else if (error && error.code !== "23505" && error.code !== "P0001") throw error;
        }
        if (!fundraiserId) throw new Error("fundraiser create failed");
        records.push({ kind: "fundraiser", row_id: fundraiserId });
        created.fundraisers += 1;
        members.push({ userId, fundraiserId });

        const donations = Math.floor(Math.random() * (parsed.data.maxDonations + 1));
        for (let n = 0; n < donations; n += 1) {
          const amount = pick(DONATION_AMOUNTS);
          const anonymous = Math.random() < 0.2;
          const donorName = pick(DONOR_NAMES);
          const message = pick(DONOR_MESSAGES);
          const approvedAt = new Date(Date.now() - Math.random() * 30 * DAY_MS).toISOString();
          const rail = pick(["card", "card", "sepa", "sepa", "cash"] as const);
          donationRows.push({
            id: crypto.randomUUID(),
            amount_cents: amount,
            fee_covered_cents: rail === "card" && Math.random() < 0.6 ? Math.round(amount * 0.02) : 0,
            fundraiser_id: fundraiserId,
            campaign_id: event.campaign_id,
            chapter_id: event.chapter_id,
            event_id: event.id,
            donor_name: donorName,
            donor_email: `donor-${crypto.randomUUID().slice(0, 8)}@${DEMO_DOMAIN}`,
            display_name: donorName,
            is_anonymous: anonymous,
            message: message || null,
            rail,
            status: "approved",
            created_at: approvedAt,
            approved_at: approvedAt,
          });
        }
      }

      // Team after its members exist: the captain is the first runner.
      const teamPalette = pick(AVATAR_PALETTES);
      const teamPhotoPath = `${members[0].userId}/team-demo.png`;
      const { error: teamPhotoError } = await service.storage
        .from("fundraiser-photos")
        .upload(teamPhotoPath, await demoTeamAvatar(teamName, teamPalette), {
          contentType: "image/png",
          upsert: true,
        });
      if (teamPhotoError) throw teamPhotoError;

      let teamId: string | null = null;
      for (let attempt = 0; attempt < 5 && !teamId; attempt += 1) {
        const { data, error } = await service
          .from("teams")
          .insert({
            campaign_id: event.campaign_id,
            event_id: event.id,
            name: teamName,
            slug: `${slugify(teamName, "tim")}-${suffix()}`,
            captain_id: members[0].userId,
            description: pick(TEAM_DESCRIPTIONS),
            photo_path: teamPhotoPath,
            goal_cents: Math.random() < 0.5 ? parsed.data.perTeam * 100000 : null,
          })
          .select("id")
          .single();
        if (data) teamId = data.id;
        else if (error && error.code !== "23505") throw error;
      }
      if (!teamId) throw new Error("team create failed");
      records.push({ kind: "team", row_id: teamId });
      created.teams += 1;

      const { error: joinError } = await service
        .from("fundraisers")
        .update({ team_id: teamId })
        .in(
          "id",
          members.map((member) => member.fundraiserId),
        );
      if (joinError) throw joinError;
    }

    if (donationRows.length > 0) {
      const { error: donationError } = await service.from("donations").insert(donationRows);
      if (donationError) throw donationError;
      for (const row of donationRows) records.push({ kind: "donation", row_id: row.id as string });
      created.donations = donationRows.length;
    }

    const { error: registryError } = await service.from("demo_records").insert(records);
    if (registryError) throw registryError;

    revalidatePath("/[locale]", "layout");
    return { ok: true, created };
  } catch (error) {
    console.error("[admin] demo generate failed:", error);
    // Register whatever landed so a purge still cleans up a partial run.
    if (records.length > 0) {
      await service
        .from("demo_records")
        .upsert(records, { onConflict: "kind,row_id" })
        .then(() => undefined, () => undefined);
    }
    return { ok: false, error: "server", created };
  }
}

/** Remove everything the generator created, then the demo users and their photos. */
export async function purgeDemoData(): Promise<DemoResult> {
  if (!(await requireStaff())) return { ok: false, error: "forbidden" };

  try {
    // Staff session: the RPC checks is_staff() itself.
    const supabase = await createClient();
    const { data: userIds, error } = await supabase.rpc("purge_demo_data");
    if (error) {
      console.error("[admin] demo purge failed:", error.code);
      return { ok: false, error: "server" };
    }

    const service = createServiceClient();
    for (const userId of (userIds ?? []) as string[]) {
      const { data: files } = await service.storage.from("fundraiser-photos").list(userId);
      if (files && files.length > 0) {
        await service.storage
          .from("fundraiser-photos")
          .remove(files.map((file) => `${userId}/${file.name}`));
      }
      await service.auth.admin.deleteUser(userId);
    }
    await service.from("demo_records").delete().eq("kind", "user");

    revalidatePath("/[locale]", "layout");
    return { ok: true, purged: { users: (userIds ?? []).length } };
  } catch (error) {
    console.error("[admin] demo purge failed:", error);
    return { ok: false, error: "server" };
  }
}

/**
 * Give every demo runner and team an illustrated avatar (older demo runs
 * had gradient discs). Only rows in the demo registry are touched —
 * never a real person's page.
 */
export async function refreshDemoPhotos(): Promise<DemoResult> {
  if (!(await requireStaff())) return { ok: false, error: "forbidden" };
  const service = createServiceClient();
  const { data: records } = await service.from("demo_records").select("kind, row_id").in("kind", ["fundraiser", "team"]);
  const fundraiserIds = (records ?? []).filter((r) => r.kind === "fundraiser").map((r) => r.row_id);
  const teamIds = (records ?? []).filter((r) => r.kind === "team").map((r) => r.row_id);
  let updated = 0;
  try {
    if (fundraiserIds.length) {
      const { data: pages } = await service.from("fundraisers").select("id, user_id, title").in("id", fundraiserIds);
      for (const page of pages ?? []) {
        const path = `${page.user_id}/demo.png`;
        const { error } = await service.storage
          .from("fundraiser-photos")
          .upload(path, await demoPersonAvatar(page.user_id, pick(AVATAR_PALETTES)), { contentType: "image/png", upsert: true });
        if (error) throw error;
        await service.from("fundraisers").update({ photo_path: path }).eq("id", page.id);
        updated += 1;
      }
    }
    if (teamIds.length) {
      const { data: teams } = await service.from("teams").select("id, name, captain_id").in("id", teamIds);
      for (const team of teams ?? []) {
        const path = `${team.captain_id}/team-demo.png`;
        const { error } = await service.storage
          .from("fundraiser-photos")
          .upload(path, await demoTeamAvatar(team.name, pick(AVATAR_PALETTES)), { contentType: "image/png", upsert: true });
        if (error) throw error;
        await service.from("teams").update({ photo_path: path }).eq("id", team.id);
        updated += 1;
      }
    }
  } catch (error) {
    console.error("[admin] demo photo refresh failed:", error);
    return { ok: false, error: "server" };
  }
  revalidatePath("/[locale]", "layout");
  return { ok: true, refreshed: updated };
}
