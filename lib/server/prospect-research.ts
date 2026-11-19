import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { comparableUrl, lastJson, sourcedCheck, sourcedFinds, type LiveCandidate, type ResearchCheck } from "@/lib/prospect-live";
import { PROSPECT_SECTORS, catalogueKey, type ProspectArea, type ProspectKind, type ProspectRow } from "@/lib/prospects";
import { TRANSLATE_MODEL } from "@/lib/server/translate";

/**
 * Live research: Claude with the web search tool, at the moment a person
 * asks. Two questions: what is true of this prospect today (its contact,
 * its record of sponsoring, whether it changed), and who has sponsored
 * events like ours and is not on the list yet.
 *
 * Nothing it answers is taken on trust. Every source it gives must be a
 * page the search tool actually returned in the same request, a named
 * person stays only with such a page naming them, and an answer with no
 * source left is dropped (lib/prospect-live: sourcedCheck, sourcedFinds).
 * A check is shown to a person as a proposal; nothing is saved until they
 * apply it.
 */
export function researchConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const RULES = [
  "You research organisations in Montenegro for Santamore, a charitable non-profit in Tivat that runs sport and community events and asks organisations for sponsorship, in-kind help, partnership or media coverage.",
  "Use the web search tool. State only what a page you found says. Never invent or guess: no email built from a pattern, no person without a page that names them with their role.",
  "Prefer the organisation's own website, official press releases and reputable news. Do not use LinkedIn or other login-walled pages.",
  "Every source you list must be the exact URL of a search result you received. If you did not find something, use null.",
  "Finish with one JSON value in a ```json block and nothing after it.",
].join(" ");

const AREA_WORDS: Record<ProspectArea, string> = {
  tivat: "Tivat",
  boka: "Boka Bay (Tivat, Kotor, Herceg Novi)",
  coast: "the Montenegrin coast",
  national: "Montenegro",
  international: "Montenegro, by international bodies and embassies",
};

interface Answer {
  json: unknown;
  /** Every page the search tool returned, in comparable form. */
  retrieved: Set<string>;
}

async function ask(prompt: string, maxSearches: number): Promise<Answer> {
  const client = new Anthropic();
  const retrieved = new Set<string>();
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
  let text = "";
  // A long search turn may pause; the same conversation continues it.
  for (let turn = 0; turn < 3; turn++) {
    const response = await client.messages.create({
      model: TRANSLATE_MODEL,
      max_tokens: 4000,
      system: RULES,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: maxSearches }],
      messages,
    });
    for (const block of response.content) {
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const result of block.content) {
          const url = comparableUrl(result.url);
          if (url) retrieved.add(url);
        }
      } else if (block.type === "text") {
        text += block.text;
      }
    }
    if (response.stop_reason === "refusal") throw new Error("refused");
    if (response.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: response.content });
  }
  return { json: lastJson(text), retrieved };
}

/** What is true of this prospect today. Null when nothing sourced came back. */
export async function checkProspect(row: Pick<ProspectRow, "name" | "kind" | "town" | "website" | "contact_name" | "contact_role" | "why">): Promise<ResearchCheck | null> {
  const known = [
    `Organisation: ${row.name}${row.town ? `, ${row.town}` : ""}, Montenegro.`,
    row.website ? `Website on file: ${row.website}` : "No website on file.",
    row.contact_name ? `Contact on file: ${row.contact_name}${row.contact_role ? `, ${row.contact_role}` : ""}.` : "No named contact on file.",
    row.why ? `What we noted before: ${row.why}` : "",
  ].filter(Boolean).join("\n");
  const prompt = `${known}

Find out, as of today:
1. Is it operating, and has it changed (renamed, merged, moved, closed)?
2. Its record of sponsoring or donating to sport, charity or community events in Montenegro, newest first, each with the year.
3. Who to ask about ${row.kind === "media" ? "coverage: the newsroom or editor" : row.kind === "funder" ? "its open calls: the programme contact" : "sponsorship: the person for marketing, PR, communications or CSR, or the director or owner of a small business"}, and whether the contact on file still holds that role.
4. Its published general email, phone, website and Instagram account.

Answer with this JSON object:
{"status": "operating" | "changed" | "closed" | "unknown", "summary": "two sentences at most: what you found and what changed", "sponsorship_record": "string or null", "website": "string or null", "email": "string or null", "phone": "string or null", "instagram": "handle or null", "contact_name": "string or null", "contact_role": "string or null", "contact_email": "string or null", "contact_phone": "string or null", "contact_source": "the URL that names the person with that role, or null", "sources": ["URL", "..."]}`;
  const answer = await ask(prompt, 6);
  return sourcedCheck(answer.json, answer.retrieved);
}

/** Who has sponsored or given to events like ours in an area and is not on the list yet. */
export async function findSponsors(input: { kind: ProspectKind; area: ProspectArea; focus: string; exclude: string[] }): Promise<LiveCandidate[]> {
  const what: Record<ProspectKind, string> = {
    sponsor: "companies that sponsored sport, charity or community events (races, regattas, tournaments, charity runs, festivals)",
    in_kind: "companies that gave goods or services to sport, charity or community events (water, food, printing, sound, medical cover, photography, transport)",
    partner: "public bodies, clubs and associations that co-organised or supported sport, charity or community events",
    media: "newsrooms and media outlets that were media partners of, or reported on, sport, charity or community events",
    funder: "foundations, embassies and programmes with grant calls a small Montenegrin NGO in sport, youth or social protection could apply to",
  };
  const prompt = `Find ${what[input.kind]} in ${AREA_WORDS[input.area]} in the last three years.${input.focus.trim() ? ` Focus: ${input.focus.trim().slice(0, 200)}.` : ""}

Look for sponsor and partner lists of real events, press releases and local news. For each organisation give what it supported and the year, from the page that says so.

Leave out these, already on our list: ${input.exclude.slice(0, 200).join("; ") || "none"}.

Answer with this JSON object, twelve organisations at most, best documented first:
{"organisations": [{"name": "string", "sector": one of ${JSON.stringify(PROSPECT_SECTORS)}, "town": "string or null", "website": "string or null", "email": "string or null", "phone": "string or null", "instagram": "handle or null", "contact_name": "string or null", "contact_role": "string or null", "contact_source": "the URL that names the person with that role, or null", "why": "what it sponsored or gave to, with the year", "sources": ["URL", "..."]}]}`;
  const answer = await ask(prompt, 8);
  return sourcedFinds(answer.json, answer.retrieved, input.area, catalogueKey);
}
