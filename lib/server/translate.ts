import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import type { Locale } from "@/i18n/routing";

// Drafts translations of staff-written content into another site language.
// Every result lands in an editor for a human to read before it is saved;
// nothing is published by this module.

export const LANGUAGE_NAMES: Record<Locale, string> = {
  me: "Montenegrin (Latin script, ijekavian)",
  en: "English",
  ru: "Russian",
};

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

const SYSTEM = [
  "You translate the website copy of Santamore, a charitable non-profit in Tivat, Montenegro,",
  "written in the first person plural, concrete, without charity-sector jargon.",
  "Translate each field faithfully and return every field. Keep Markdown structure, links, image references and numbers exactly as they are.",
  "Keep proper names, amounts, IBAN-like references and dates unchanged. Do not add or drop content.",
  "Where a field has several lines, keep the same number of lines in the same order;",
  "where a line has parts separated by \" · \", keep the separators and the number of parts.",
].join(" ");

export function describeError(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    const body = error.error as { error?: { message?: string } } | undefined;
    return `${error.status ?? ""} ${body?.error?.message ?? error.message}`.trim();
  }
  return error instanceof Error ? error.message : "unknown";
}

function prompt(from: Locale, to: Locale, fields: Record<string, string>): string {
  const parts = Object.entries(fields).map(([key, text]) => `FIELD ${key}:\n${text || "(empty)"}`);
  return `Translate from ${LANGUAGE_NAMES[from]} to ${LANGUAGE_NAMES[to]}. Return the same field keys.\n\n${parts.join("\n\n")}`;
}

/**
 * Translate a set of named text fields. Structured output first; if the
 * API rejects that shape, plain JSON in the text. Empty fields stay empty.
 */
export async function translateFieldsWithClaude(from: Locale, to: Locale, fields: Record<string, string>): Promise<Record<string, string>> {
  const keys = Object.keys(fields).filter((key) => fields[key].trim() !== "");
  if (keys.length === 0) return {};
  const subset = Object.fromEntries(keys.map((key) => [key, fields[key]]));
  const schema = z.object(Object.fromEntries(keys.map((key) => [key, z.string()])));
  const client = new Anthropic();
  const user = prompt(from, to, subset);
  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium", format: zodOutputFormat(schema) },
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
    });
    if (response.stop_reason === "refusal") throw new Error(`refused: ${response.stop_details?.explanation ?? ""}`);
    if (response.parsed_output) return response.parsed_output as Record<string, string>;
    throw new Error("no structured output");
  } catch (error) {
    if (!(error instanceof Anthropic.BadRequestError)) throw error;
    console.warn("[translate] structured output rejected, retrying as plain JSON:", describeError(error));
  }
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium" },
    system: `${SYSTEM} Reply with only a JSON object whose keys are the field keys and whose values are the translated strings, no code fence, no commentary.`,
    messages: [{ role: "user", content: user }],
  });
  if (response.stop_reason === "refusal") throw new Error(`refused: ${response.stop_details?.explanation ?? ""}`);
  const text = response.content.map((block) => (block.type === "text" ? block.text : "")).join("").trim();
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = schema.safeParse(JSON.parse(json));
  if (!parsed.success) throw new Error("reply was not the expected JSON");
  return parsed.data as Record<string, string>;
}

export { MODEL as TRANSLATE_MODEL };
