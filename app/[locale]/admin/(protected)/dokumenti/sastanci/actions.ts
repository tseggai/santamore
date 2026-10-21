"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isStaffRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

// Staff-session actions; meetings_staff_write (migration 0084) is the
// enforcement. One row per meeting: agenda and minutes together.

export type MeetingResult = { ok: true; id: string } | { ok: false; error: "invalid" | "forbidden" | "server" };

const schema = z.object({
  id: z.string().uuid().nullable(),
  heldAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().trim().min(1).max(200),
  attendees: z.array(z.string().trim().min(1).max(120)).max(200),
  agendaMd: z.string().trim().max(20_000).nullable(),
  minutesMd: z.string().trim().max(60_000).nullable(),
});

async function staffUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return isStaffRole(profile?.role) ? { supabase, user } : null;
}

export async function saveMeeting(input: unknown): Promise<MeetingResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const auth = await staffUser();
  if (!auth) return { ok: false, error: "forbidden" };
  const d = parsed.data;
  const row = { held_at: d.heldAt, title: d.title, attendees: d.attendees, agenda_md: d.agendaMd || null, minutes_md: d.minutesMd || null, updated_at: new Date().toISOString() };
  const query = d.id
    ? auth.supabase.from("meetings").update(row).eq("id", d.id).select("id").single()
    : auth.supabase.from("meetings").insert({ ...row, created_by: auth.user.id }).select("id").single();
  const { data, error } = await query;
  if (error || !data) {
    console.error("[meetings] save failed:", error?.code, error?.message);
    return { ok: false, error: error?.code === "42501" ? "forbidden" : "server" };
  }
  revalidatePath("/[locale]/admin/dokumenti", "layout");
  revalidatePath("/[locale]/dashboard/dokumenti", "layout");
  return { ok: true, id: data.id };
}

export async function deleteMeeting(id: string): Promise<MeetingResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "invalid" };
  const auth = await staffUser();
  if (!auth) return { ok: false, error: "forbidden" };
  const { error } = await auth.supabase.from("meetings").delete().eq("id", id);
  if (error) return { ok: false, error: error.code === "42501" ? "forbidden" : "server" };
  revalidatePath("/[locale]/admin/dokumenti", "layout");
  revalidatePath("/[locale]/dashboard/dokumenti", "layout");
  return { ok: true, id };
}
