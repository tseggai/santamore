/**
 * Prospects (migration 0088): the organisations we ask for support and where
 * each ask stands. Shared by the console page and its actions: the
 * vocabulary, what a researched entry looks like, how criteria pick entries,
 * the messages we send, and the links that open them in WhatsApp, the mail
 * app or Instagram.
 */

export const PROSPECT_KINDS = ["sponsor", "in_kind", "partner", "media", "funder"] as const;
export type ProspectKind = (typeof PROSPECT_KINDS)[number];

export const PROSPECT_SECTORS = [
  "bank", "insurance", "telecom", "energy_industry", "retail_fmcg", "food_drink",
  "marina_resort", "hotel", "real_estate", "yachting", "tourism_transport", "health",
  "fitness_wellness", "professional_services", "local_shop", "municipality",
  "tourism_board", "sport_body", "culture", "media", "foundation_grant", "embassy_intl",
] as const;
export type ProspectSector = (typeof PROSPECT_SECTORS)[number];

export const PROSPECT_AREAS = ["tivat", "boka", "coast", "national", "international"] as const;
export type ProspectArea = (typeof PROSPECT_AREAS)[number];

export const PROSPECT_TIERS = ["core", "title", "gold", "silver", "local", "inkind"] as const;
export type ProspectTier = (typeof PROSPECT_TIERS)[number];

export const PROSPECT_STAGES = ["new", "contacted", "engaged", "pledged", "won", "declined"] as const;
export type ProspectStage = (typeof PROSPECT_STAGES)[number];

export const PROSPECT_CHANNELS = ["whatsapp", "email", "instagram", "copy"] as const;
export type ProspectChannel = (typeof PROSPECT_CHANNELS)[number];

export const PROSPECT_TEMPLATES = ["first", "follow_up"] as const;
export type ProspectTemplate = (typeof PROSPECT_TEMPLATES)[number];

export type ProspectLang = "me" | "en";
/** The language of a message: one of the two, or both, Montenegrin first. */
export type MessageLang = ProspectLang | "both";
export const MESSAGE_LANGS = ["both", "me", "en"] as const satisfies readonly MessageLang[];

/** One researched organisation (content/prospects/catalogue.json): every fact from a published page, listed in `sources`. */
export interface CatalogueEntry {
  key: string;
  name: string;
  legal_name: string | null;
  kind: ProspectKind;
  sector: ProspectSector;
  town: string | null;
  area: ProspectArea;
  website: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  contact_name: string | null;
  contact_role: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_source: string | null;
  tier_fit: ProspectTier | null;
  why: string | null;
  sources: string[];
}

/** What the "develop a list" form needs to count matches: no names, no contacts. */
export interface CatalogueFacet {
  key: string;
  kind: ProspectKind;
  sector: ProspectSector;
  area: ProspectArea;
  tier_fit: ProspectTier | null;
  hasPerson: boolean;
}

export interface ProspectRow {
  id: string;
  catalogue_key: string | null;
  kind: ProspectKind;
  name: string;
  sector: string;
  area: ProspectArea;
  town: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  contact_name: string | null;
  contact_role: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  tier_fit: ProspectTier | null;
  why: string | null;
  sources: string[];
  stage: ProspectStage;
  next_follow_up: string | null;
  last_contacted_at: string | null;
  notes: string | null;
  supporter_id: string | null;
  created_at: string;
  /** When live research last checked it (migration 0089); absent before that migration. */
  checked_at?: string | null;
  google_place_id?: string | null;
}

export const PROSPECT_COLUMNS =
  "id, catalogue_key, kind, name, sector, area, town, website, email, phone, instagram, contact_name, contact_role, contact_email, contact_phone, tier_fit, why, sources, stage, next_follow_up, last_contacted_at, notes, supporter_id, created_at";

export interface ProspectActivityRow {
  id: string;
  prospect_id: string;
  kind: "message" | "note" | "stage" | "research";
  channel: ProspectChannel | null;
  template: string | null;
  lang: string | null;
  body: string | null;
  created_at: string;
}

/** What the form picks; an empty list means "any". */
export interface ProspectCriteria {
  kinds: ProspectKind[];
  sectors: ProspectSector[];
  areas: ProspectArea[];
  tiers: ProspectTier[];
  /** Only organisations where a person is named. */
  personOnly: boolean;
}

export function matchesCriteria(entry: Pick<CatalogueFacet, "kind" | "sector" | "area" | "tier_fit" | "hasPerson">, criteria: ProspectCriteria): boolean {
  if (criteria.kinds.length > 0 && !criteria.kinds.includes(entry.kind)) return false;
  if (criteria.sectors.length > 0 && !criteria.sectors.includes(entry.sector)) return false;
  if (criteria.areas.length > 0 && !criteria.areas.includes(entry.area)) return false;
  // A tier is a sponsor's measure: partners, media and funders have none and are not excluded by it.
  if (criteria.tiers.length > 0 && entry.tier_fit !== null && !criteria.tiers.includes(entry.tier_fit)) return false;
  if (criteria.personOnly && !entry.hasPerson) return false;
  return true;
}

/** A stable key for a researched entry, from its name. */
export function catalogueKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "dj")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ── follow-ups ──────────────────────────────────────────────────────────────

/** Days until the follow-up: negative = overdue, 0 = today, null = none set. */
export function followUpDays(nextFollowUp: string | null, today: string): number | null {
  if (!nextFollowUp) return null;
  const ms = Date.parse(`${nextFollowUp}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Number.isNaN(ms) ? null : Math.round(ms / 86_400_000);
}

/** Due: a follow-up date that has come, on an ask still open. */
export function isDue(row: Pick<ProspectRow, "stage" | "next_follow_up">, today: string): boolean {
  if (row.stage === "won" || row.stage === "declined") return false;
  const days = followUpDays(row.next_follow_up, today);
  return days !== null && days <= 0;
}

/** When to come back after a message: five days after the first, a week after a follow-up. */
export function followUpAfter(template: ProspectTemplate, today: string): string {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + (template === "first" ? 5 : 7));
  return date.toISOString().slice(0, 10);
}

// ── links ───────────────────────────────────────────────────────────────────

/** Digits for wa.me: +382…, 00382… and a national 0… all become 382…. Null when there is nothing to dial. */
export function phoneDigits(phone: string | null | undefined): string | null {
  if (!phone) return null;
  // The first number when several are listed. A slash is not a separator: 068/755-921 is one number.
  const first = phone.split(/[;,]| ili | or /)[0] ?? "";
  let digits = first.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `382${digits.slice(1)}`;
  digits = digits.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

/** A Montenegrin mobile (+382 6x…): the numbers WhatsApp can reach. A landline cannot. */
export function isMobile(phone: string | null | undefined): boolean {
  const digits = phoneDigits(phone);
  return digits !== null && /^3826\d{7}$/.test(digits);
}

export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  const digits = phoneDigits(phone);
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
}

export function mailtoLink(email: string | null | undefined, subject: string, body: string): string | null {
  if (!email) return null;
  return `mailto:${encodeURIComponent(email).replace(/%40/g, "@")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Opens a direct message to the account; the text is copied first, Instagram takes no prefilled message. */
export function instagramLink(handle: string | null | undefined): string | null {
  const clean = (handle ?? "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(clean) ? `https://ig.me/m/${clean}` : null;
}

// ── messages ────────────────────────────────────────────────────────────────

export interface MessageContext {
  kind: ProspectKind;
  template: ProspectTemplate;
  lang: MessageLang;
  org: string;
  contactName: string | null;
  /** The prospect's tier fit; it sets the figure a sponsor ask opens with. */
  tierFit?: ProspectTier | null;
  sender: string;
  /** The sponsor page with the tiers and the pledge form. */
  pledgeUrl: string;
  /** The site, for the asks that are not about tiers. */
  siteUrl: string;
  /** The sponsorship sheet; null leaves the line out. */
  pdfUrl: string | null;
}

/** Who signs every ask, whoever is signed in when it is sent. (Owner decision 2026-11-20.) */
export const PROSPECT_SIGNER = "Staša Ceranić";

// Names Santamore Week with its dates: change this once the week has passed.
const WHO: Record<ProspectLang, string> = {
  me: "javljam se u ime Santamorea, crnogorske neprofitne organizacije sa sjedištem u Tivtu. Organizujemo Santamore Week, od 7. do 13. decembra: sedmicu društvenih aktivnosti i događaja kroz koje prikupljamo sredstva, od kojih 100% ide u humanitarne svrhe.",
  en: "I'm writing on behalf of Santamore, a Montenegrin non-profit based in Tivat. We are organizing Santamore Week, taking place from December 7–13 — a week of community activities and events through which we raise funds, 100% of which go to charitable causes.",
};

/**
 * The figure a sponsor ask opens with, in whole euros, by the prospect's tier
 * fit. The prices are the ones on the sponsor page (`content/site/partners.ts`);
 * a prospect with no cash tier on file gets the Gold figure. (Owner decision 2026-11-20.)
 */
const TIER_FROM_EUR: Partial<Record<ProspectTier, number>> = { core: 25000, title: 10000, gold: 5000, silver: 2000, local: 250 };
const DEFAULT_FROM_EUR = 5000;

/** "€5,000" in English, "€5.000" in Montenegrin; no separator under a thousand. */
export function tierFrom(tier: ProspectTier | null | undefined, lang: ProspectLang): string {
  const euros = (tier && TIER_FROM_EUR[tier]) || DEFAULT_FROM_EUR;
  return `€${String(euros).replace(/\B(?=(\d{3})+$)/g, lang === "me" ? "." : ",")}`;
}

const ASK: Record<ProspectKind, Record<ProspectLang, (org: string, from: string) => string>> = {
  sponsor: {
    me: (org, from) => `Ove praznične sezone voljeli bismo da nam se ${org} pridruži kao sponzor. Nivoi sponzorstva počinju od ${from}.`,
    en: (org, from) => `This holiday season, we would love for ${org} to join us as a sponsor. Tiers start at ${from}.`,
  },
  in_kind: {
    me: (org) => `Tražimo podršku u robi ili uslugama za naše događaje: voda, voće, štampa, ozvučenje, prva pomoć, fotografija. Vrednujemo je i knjižimo tačno kao gotovinu, uz priznanje na odgovarajućem nivou sponzorstva. Voljeli bismo da ${org} bude dio toga. Možete li nam pomoći?`,
    en: (org) => `We are looking for goods or services for our events: water, fruit, printing, sound, first aid, photography. We value and book them exactly like cash, and credit them at the matching sponsorship tier. We would love ${org} to be part of it. Could you help?`,
  },
  partner: {
    me: (org) => `Voljeli bismo da ${org} i Santamore sarađuju na predstojećim događajima. Možemo li dogovoriti kratak sastanak?`,
    en: (org) => `We would like ${org} and Santamore to work together on our coming events. Could we arrange a short meeting?`,
  },
  media: {
    me: (org) => `Bilo bi nam drago da ${org} prenese našu priču: zajednica predlaže i bira cilj, a svaki euro koji uđe i izađe stoji u javnoj knjizi. Mogu poslati fotografije i detalje.`,
    en: (org) => `We would be glad if ${org} covered our story: the community proposes and votes the cause, and every euro in and out sits in a public ledger. I can send photos and details.`,
  },
  funder: {
    me: (org) => `Zanima nas podrška organizacijama civilnog društva. Možete li nam reći koje otvorene ili predstojeće pozive ${org} ima, na koje se može prijaviti mala crnogorska NVO?`,
    en: (org) => `We are interested in support for civil society organisations. Could you tell us which open or upcoming calls ${org} has that a small Montenegrin NGO may apply to?`,
  },
};

const SUBJECT: Record<ProspectKind, Record<ProspectLang, string>> = {
  sponsor: { me: "Santamore: sponzorstvo", en: "Santamore: sponsorship" },
  in_kind: { me: "Santamore: podrška u robi i uslugama", en: "Santamore: in-kind support" },
  partner: { me: "Santamore: saradnja", en: "Santamore: working together" },
  media: { me: "Santamore: priča za vaše medije", en: "Santamore: a story for you" },
  funder: { me: "Santamore: pitanje o pozivima za podršku", en: "Santamore: a question about your calls" },
};

const TITLE = /^(dr|mr|mrs|ms|prof|doc|g|gđa|gdja|gospodin|gospođa)\.?$/i;

/** The name to greet by: the first name, or the whole name when it opens with a title. */
function greetingName(name: string | null): string | null {
  const clean = name?.trim().replace(/\s+/g, " ");
  if (!clean) return null;
  const first = clean.split(" ")[0]!;
  return TITLE.test(first) ? clean : first;
}

function greeting(lang: ProspectLang, name: string | null): string {
  const clean = greetingName(name);
  if (lang === "me") return clean ? `Poštovani/a ${clean},` : "Poštovani,";
  return clean ? `Hello ${clean},` : "Hello,";
}

/** A link written as [words](address), the form the message keeps its links in. */
const LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;

/** The message for an app that shows no linked words (WhatsApp, Instagram): "words: address". */
export function messagePlain(body: string): string {
  return body.replace(LINK, "$1: $2");
}

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The message as HTML for the clipboard, so that pasted into a mail it keeps
 * its links as clickable words. Paragraphs split on blank lines, a line of
 * three dashes is a rule, and everything else is escaped.
 */
export function messageHtml(body: string): string {
  return body
    .trim()
    .split(/\n{2,}/)
    .map((block) => {
      if (block.trim() === "---") return "<hr>";
      let html = "";
      let at = 0;
      for (const match of block.matchAll(LINK)) {
        html += `${escapeHtml(block.slice(at, match.index))}<a href="${escapeHtml(match[2]!)}">${escapeHtml(match[1]!)}</a>`;
        at = match.index + match[0].length;
      }
      html += escapeHtml(block.slice(at));
      return `<p style="margin:0 0 1em">${html.replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
}

/** Whether the message carries a link that only a rich paste keeps. */
export function hasLinks(body: string): boolean {
  return body.search(LINK) !== -1;
}

/**
 * The message for an ask, ready to edit before it is sent. Plain text with
 * blank lines between paragraphs and links as [words](address): a mail keeps
 * them as clickable words (`messageHtml`), WhatsApp and Instagram get the
 * address after the words (`messagePlain`). Sponsors and in-kind asks point at
 * the sponsor page; the others at the site. "both" is the Montenegrin message,
 * a rule, then the English one.
 */
export function composeMessage(ctx: MessageContext): { subject: string; body: string } {
  if (ctx.lang === "both") {
    const me = composeOne(ctx, "me");
    const en = composeOne(ctx, "en");
    return { subject: `${me.subject} / ${en.subject.replace(/^Santamore: /, "")}`, body: `${me.body}\n\n---\n\n${en.body}` };
  }
  return composeOne(ctx, ctx.lang);
}

function composeOne(ctx: MessageContext, lang: ProspectLang): { subject: string; body: string } {
  const { kind, org } = ctx;
  const tiered = kind === "sponsor" || kind === "in_kind";
  const link = tiered ? ctx.pledgeUrl : ctx.siteUrl;
  const sign = lang === "me" ? `Hvala unaprijed,\n${ctx.sender}\nSantamore` : `Thank you,\n${ctx.sender}\nSantamore`;
  const paragraphs: string[] = [greeting(lang, ctx.contactName)];

  if (ctx.template === "follow_up") {
    paragraphs.push(
      lang === "me"
        ? `javljam se ponovo u vezi sa mojom porukom: ${org} i Santamore. Postoji li osoba kojoj treba da se obratim, ili zgodan termin za kratak razgovor?`
        : `I wanted to follow up on my message about ${org} and Santamore. Is there someone I should speak to, or a good time for a short call?`,
    );
  } else {
    paragraphs.push(WHO[lang], ASK[kind][lang](org, tierFrom(ctx.tierFit, lang)));
  }

  if (ctx.pdfUrl) paragraphs.push(`[${lang === "me" ? "Sve na jednoj stranici (PDF)" : "Everything on one page (PDF)"}](${ctx.pdfUrl})`);
  paragraphs.push(
    `[${tiered ? (lang === "me" ? "Nivoi i prijava" : "Tiers and the pledge form") : lang === "me" ? "Više o nama" : "More about us"}](${link})`,
    sign,
  );
  return { subject: SUBJECT[kind][lang], body: paragraphs.join("\n\n") };
}


/** Where the sponsorship sheet is served from (public/sponzorstvo). */
export const SPONSORSHIP_PDF_PATH = "/sponzorstvo/santamore-sponzorstvo-sponsorship.pdf";
