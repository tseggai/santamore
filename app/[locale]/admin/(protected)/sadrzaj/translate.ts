"use server";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

// Staff-only helper: drafts a translation of one post into another site
// language. The result lands in the editor for a human to read before it
// is saved — nothing is published by this action.

const LANGUAGE_NAMES: Record<string, string> = {
  me: "Montenegrin (Latin script, ijekavian)",
  en: "English",
  ru: "Russian",
};

const inputSchema = z.object({
  from: z.enum(routing.locales),
  to: z.enum(routing.locales),
  title: z.string().trim().min(1).max(200),
  excerpt: z.string().trim().max(500),
  body: z.string().trim().min(1).max(50_000),
});

const translationSchema = z.object({
  title: z.string(),
  excerpt: z.string(),
  body: z.string(),
});

export type TranslateResult =
  | { ok: true; title: string; excerpt: string; body: string }
  | { ok: false; error: "invalid" | "forbidden" | "unconfigured" | "server"; detail?: string };

async function isStaff(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "admin" || data?.role === "chapter_lead";
}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

const SYSTEM = [
  "You translate news posts for Santamore, a charitable non-profit in Tivat, Montenegro,",
  "written in the first person plural, concrete, without charity-sector jargon.",
  "Translate faithfully; keep Markdown structure, links, image references and numbers exactly as they are.",
  "Keep proper names, amounts, IBAN-like references and dates unchanged. Do not add or drop content.",
].join(" ");

function prompt(from: string, to: string, title: string, excerpt: string, body: string): string {
  return `Translate from ${LANGUAGE_NAMES[from]} to ${LANGUAGE_NAMES[to]}.\n\nTITLE:\n${title}\n\nEXCERPT:\n${excerpt || "(none)"}\n\nBODY (Markdown):\n${body}`;
}

function describe(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    const body = error.error as { error?: { message?: string } } | undefined;
    return `${error.status ?? ""} ${body?.error?.message ?? error.message}`.trim();
  }
  return error instanceof Error ? error.message : "unknown";
}

/** Structured output first; if the API rejects that shape, plain JSON in the text. */
async function requestTranslation(client: Anthropic, from: string, to: string, title: string, excerpt: string, body: string) {
  const user = prompt(from, to, title, excerpt, body);
  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium", format: zodOutputFormat(translationSchema) },
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
    });
    if (response.stop_reason === "refusal") {
      throw new Error(`refused: ${response.stop_details?.explanation ?? ""}`);
    }
    if (response.parsed_output) return response.parsed_output;
    throw new Error("no structured output");
  } catch (error) {
    if (!(error instanceof Anthropic.BadRequestError)) throw error;
    console.warn("[translate] structured output rejected, retrying as plain JSON:", describe(error));
  }
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium" },
    system: `${SYSTEM} Reply with only a JSON object with the keys "title", "excerpt" and "body" (strings), no code fence, no commentary.`,
    messages: [{ role: "user", content: user }],
  });
  if (response.stop_reason === "refusal") throw new Error(`refused: ${response.stop_details?.explanation ?? ""}`);
  const text = response.content.map((block) => (block.type === "text" ? block.text : "")).join("").trim();
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = translationSchema.safeParse(JSON.parse(json));
  if (!parsed.success) throw new Error("reply was not the expected JSON");
  return parsed.data;
}

export async function translatePost(input: unknown): Promise<TranslateResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!(await isStaff())) return { ok: false, error: "forbidden" };
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: "unconfigured" };
  const { from, to, title, excerpt, body } = parsed.data;

  try {
    const out = await requestTranslation(new Anthropic(), from, to, title, excerpt, body);
    return { ok: true, title: out.title, excerpt: out.excerpt === "(none)" ? "" : out.excerpt, body: out.body };
  } catch (error) {
    console.error("[translate] failed:", describe(error));
    if (error instanceof Anthropic.AuthenticationError) return { ok: false, error: "unconfigured", detail: describe(error) };
    if (error instanceof Anthropic.NotFoundError) return { ok: false, error: "server", detail: `${describe(error)} (model "${MODEL}" — set ANTHROPIC_MODEL to one your key can use)` };
    return { ok: false, error: "server", detail: describe(error) };
  }
}
