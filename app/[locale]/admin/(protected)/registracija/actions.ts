"use server";

import packJson from "@/content/legal-pack/pack.json";
import { sanitizeDraftHtml, savePackSchema, type LegalPack } from "@/lib/legal-pack";
import { isStaffRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

// Staff-only: save one part of the legal pack (the shared blanks, the
// founding checklist or an edited draft). Translation between the two
// languages goes through translateFields in ../translate-actions.ts.

const pack = packJson as unknown as LegalPack;
const inputSchema = savePackSchema(pack);

export type SaveLegalPackResult = { ok: true; updatedAt: string } | { ok: false; error: "invalid" | "forbidden" | "missing_table" | "server" };

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
