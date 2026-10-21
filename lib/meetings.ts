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
