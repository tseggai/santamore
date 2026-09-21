"use server";

import { z } from "zod";

import packJson from "@/content/legal-pack/pack.json";
import { DRAFT_KEY, sanitizeDraftHtml, type LegalPack } from "@/lib/legal-pack";
import { isStaffRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

// Staff-only: save one part of the legal pack (the shared blanks, the
// founding checklist or an edited draft). Translation between the two
// languages goes through translateFields in ../translate-actions.ts.

const pack = packJson as unknown as LegalPack;
const FIELD_IDS = new Set(Object.keys(pack.fields));
const CHECK_IDS = new Set(pack.forms.flatMap((f) => f.blocks.flatMap((b) => (b.type === "check" ? [b.id] : []))));
const DRAFT_IDS = new Set(pack.drafts.map((d) => d.id));

export type SaveLegalPackResult = { ok: true; updatedAt: string } | { ok: false; error: "invalid" | "forbidden" | "missing_table" | "server" };

const fieldState = z.object({ me: z.string().max(20_000), en: z.string().max(20_000), stale: z.enum(["me", "en"]).nullable() });

const inputSchema = z.discriminatedUnion("key", [
  z.object({ key: z.literal("fields"), value: z.record(z.string().regex(/^[a-z0-9_]{1,40}$/), fieldState).refine((v) => Object.keys(v).every((id) => FIELD_IDS.has(id))) }),
  z.object({ key: z.literal("checks"), value: z.record(z.string().regex(/^s\d_\d{1,3}$/), z.boolean()).refine((v) => Object.keys(v).every((id) => CHECK_IDS.has(id))) }),
  z.object({ key: z.string().regex(DRAFT_KEY).refine((k) => DRAFT_IDS.has(k.slice("draft:".length))), value: z.object({ html: z.string().max(400_000) }) }),
]);

export async function saveLegalPack(input: unknown): Promise<SaveLegalPackResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "forbidden" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isStaffRole(profile?.role)) return { ok: false, error: "forbidden" };

  let value: unknown = parsed.data.value;
  if (parsed.data.key.startsWith("draft:")) {
    const html = sanitizeDraftHtml((parsed.data.value as { html: string }).html);
    if (html === null) return { ok: false, error: "invalid" };
    value = { html };
  }
  const updatedAt = new Date().toISOString();
  const { error } = await supabase
    .from("legal_pack")
    .upsert({ key: parsed.data.key, value, updated_at: updatedAt, updated_by: user.id }, { onConflict: "key" });
  if (error) {
    console.error("[legal-pack] save failed:", error.code, error.message);
    // 42P01: the table does not exist; PGRST205: PostgREST's schema cache has never seen it.
    if (error.code === "42P01" || error.code === "PGRST205") return { ok: false, error: "missing_table" };
    return { ok: false, error: error.code === "42501" ? "forbidden" : "server" };
  }
  return { ok: true, updatedAt };
}
