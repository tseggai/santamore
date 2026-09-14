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

export async function translatePost(input: unknown): Promise<TranslateResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!(await isStaff())) return { ok: false, error: "forbidden" };
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: "unconfigured" };
  const { from, to, title, excerpt, body } = parsed.data;

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 16000,
      output_config: { effort: "medium", format: zodOutputFormat(translationSchema) },
      system: [
        "You translate news posts for Santamore, a charitable non-profit in Tivat, Montenegro,",
        "written in the first person plural, concrete, without charity-sector jargon.",
        "Translate faithfully; keep Markdown structure, links, image references and numbers exactly as they are.",
        "Keep proper names, amounts, IBAN-like references and dates unchanged. Do not add or drop content.",
      ].join(" "),
      messages: [
        {
          role: "user",
          content: `Translate from ${LANGUAGE_NAMES[from]} to ${LANGUAGE_NAMES[to]}.\n\nTITLE:\n${title}\n\nEXCERPT:\n${excerpt || "(none)"}\n\nBODY (Markdown):\n${body}`,
        },
      ],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return { ok: false, error: "server", detail: response.stop_details?.explanation ?? "no output" };
    }
    const out = response.parsed_output;
    return { ok: true, title: out.title, excerpt: out.excerpt === "(none)" ? "" : out.excerpt, body: out.body };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return { ok: false, error: "unconfigured", detail: "invalid key" };
    if (error instanceof Anthropic.RateLimitError) return { ok: false, error: "server", detail: "rate limited" };
    if (error instanceof Anthropic.APIError) return { ok: false, error: "server", detail: `${error.status}` };
    return { ok: false, error: "server" };
  }
}
