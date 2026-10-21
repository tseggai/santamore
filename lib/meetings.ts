/** A meeting of the association: agenda and minutes together (migration 0084). Staff write, members read. */
export interface MeetingRow {
  id: string;
  held_at: string;
  title: string;
  attendees: string[];
  agenda_md: string | null;
  minutes_md: string | null;
  updated_at: string;
}

export const MEETING_COLUMNS = "id, held_at, title, attendees, agenda_md, minutes_md, updated_at";

/** The attendees as typed: one name per line, blank lines dropped. */
export function parseAttendees(text: string): string[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
}

/** A meeting's date in the locale's long form. */
export function meetingDate(heldAt: string, locale: string): string {
  const [y, m, d] = heldAt.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "me" ? "sr-Latn-ME" : locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(Date.UTC(y, m - 1, d)));
}

/**
 * Markdown as the printed sheet sets it: a "## 1. Title" heading loses its
 * number (the sheet draws a numbered pill instead), and a "## Title" without
 * a number becomes a "### Title" so it is set as a plain heading, no pill.
 */
export function sheetMarkdown(md: string): string {
  return md
    .split(/\r?\n/)
    .map((line) => {
      const numbered = line.match(/^## \d+[.)]\s+(.*)$/);
      if (numbered) return `## ${numbered[1]}`;
      if (/^## /.test(line)) return `#${line}`;
      return line;
    })
    .join("\n");
}

/** The private bucket a meeting's pictures are uploaded to (migration 0085). */
export const MEETING_IMAGE_BUCKET = "meeting-images";

/** The line that draws the organisation chart (components/org/OrgChart) in an agenda or the minutes. */
export const ORG_CHART_TOKEN = "{{org-chart}}";

export type SheetSegment = { kind: "md"; text: string } | { kind: "org-chart" };

/**
 * The Markdown split at every line that is the org chart token: Markdown
 * segments to set as prose, and the chart to draw between them. Blank
 * segments are dropped.
 */
export function splitSheetMarkdown(md: string): SheetSegment[] {
  const out: SheetSegment[] = [];
  let buffer: string[] = [];
  const flush = () => {
    const text = buffer.join("\n").trim();
    if (text) out.push({ kind: "md", text });
    buffer = [];
  };
  for (const line of md.split(/\r?\n/)) {
    if (line.trim() === ORG_CHART_TOKEN) {
      flush();
      out.push({ kind: "org-chart" });
    } else {
      buffer.push(line);
    }
  }
  flush();
  return out;
}

// A Markdown image whose target is a path in the bucket: a folder and a
// file name, no scheme, no leading slash. Anything else (https://…) is
// left as written.
const IMAGE_REF = /!\[([^\]]*)\]\(([A-Za-z0-9_-]+\/[A-Za-z0-9._-]+)\)/g;

/** The bucket paths of the pictures referenced in the Markdown, each once, in order. */
export function meetingImagePaths(md: string): string[] {
  const paths: string[] = [];
  for (const match of md.matchAll(IMAGE_REF)) if (!paths.includes(match[2])) paths.push(match[2]);
  return paths;
}

/** The Markdown with every bucket path replaced by its URL; a path with no URL is left as written. */
export function withImageUrls(md: string, urls: ReadonlyMap<string, string>): string {
  return md.replace(IMAGE_REF, (whole, alt: string, path: string) => {
    const url = urls.get(path);
    return url ? `![${alt}](${url})` : whole;
  });
}
