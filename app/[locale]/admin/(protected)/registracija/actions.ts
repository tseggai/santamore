"use server";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import packJson from "@/content/legal-pack/pack.json";
import { FORM_KEY, PACK_LANGS, sanitizeBlocks, sanitizeDraftHtml, savePackSchema, type LegalPack, type PackBlock } from "@/lib/legal-pack";
import { isStaffRole } from "@/lib/roles";
import { TRANSLATE_MODEL, describeError, translateFieldsWithClaude } from "@/lib/server/translate";
import { createClient } from "@/lib/supabase/server";

// Staff-only: save one part of the legal pack (the shared blanks, the
// founding checklist, an edited draft, a form's edited text or a cached
// translation), and
// translate its texts between the pack's four languages.

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
  } else if (FORM_KEY.test(parsed.data.key)) {
    const blocks = (parsed.data.value as { blocks: PackBlock[] | null }).blocks;
    value = { blocks: blocks === null ? null : sanitizeBlocks(blocks) };
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

export type TranslatePackResult =
  | { ok: true; texts: Record<string, string> }
  | { ok: false; error: "invalid" | "forbidden" | "unconfigured" | "server"; detail?: string };

const translateSchema = z.object({
  from: z.enum(PACK_LANGS),
  to: z.enum(PACK_LANGS),
  texts: z.record(z.string().regex(/^[a-z0-9_:.-]{1,60}$/), z.string().max(20_000)).refine((t) => { const n = Object.keys(t).length; return n > 0 && n <= 40; }).refine((t) => Object.values(t).join("").length <= 60_000),
});

/** Translate up to forty named texts of the pack (blank values, templates, draft paragraphs) into another pack language. */
export async function translatePackTexts(input: unknown): Promise<TranslatePackResult> {
  const parsed = translateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (parsed.data.from === parsed.data.to) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "forbidden" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isStaffRole(profile?.role)) return { ok: false, error: "forbidden" };
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: "unconfigured" };
  try {
    const texts = await translateFieldsWithClaude(parsed.data.from, parsed.data.to, parsed.data.texts);
    return { ok: true, texts };
  } catch (error) {
    console.error("[legal-pack] translate failed:", describeError(error));
    if (error instanceof Anthropic.AuthenticationError) return { ok: false, error: "unconfigured", detail: describeError(error) };
    if (error instanceof Anthropic.NotFoundError) return { ok: false, error: "server", detail: `${describeError(error)} (model "${TRANSLATE_MODEL}")` };
    return { ok: false, error: "server", detail: describeError(error) };
  }
}
