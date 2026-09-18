"use server";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { TRANSLATE_MODEL, describeError, translateFieldsWithClaude } from "@/lib/server/translate";
import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

// Staff-only: translate the named fields of one record from the language
// it was written in into another site language. The result lands in the
// open form for a human to read; saving is a separate step.

export type TranslateFieldsResult =
  | { ok: true; fields: Record<string, string> }
  | { ok: false; error: "invalid" | "forbidden" | "unconfigured" | "server"; detail?: string };

const inputSchema = z.object({
  from: z.enum(routing.locales),
  to: z.enum(routing.locales),
  fields: z.record(z.string().min(1).max(60), z.string().max(50_000)).refine((f) => Object.keys(f).length > 0 && Object.keys(f).length <= 40),
});

async function isStaff(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "admin" || data?.role === "chapter_lead";
}

export async function translateFields(input: unknown): Promise<TranslateFieldsResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (parsed.data.from === parsed.data.to) return { ok: false, error: "invalid" };
  if (!(await isStaff())) return { ok: false, error: "forbidden" };
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: "unconfigured" };
  try {
    const fields = await translateFieldsWithClaude(parsed.data.from, parsed.data.to, parsed.data.fields);
    return { ok: true, fields };
  } catch (error) {
    console.error("[translate] failed:", describeError(error));
    if (error instanceof Anthropic.AuthenticationError) return { ok: false, error: "unconfigured", detail: describeError(error) };
    if (error instanceof Anthropic.NotFoundError) return { ok: false, error: "server", detail: `${describeError(error)} (model "${TRANSLATE_MODEL}" — set ANTHROPIC_MODEL to one your key can use)` };
    return { ok: false, error: "server", detail: describeError(error) };
  }
}
