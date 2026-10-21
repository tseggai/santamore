import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { MarkdownBlock } from "@/components/MarkdownBlock";
import { OrgChart } from "@/components/org/OrgChart";
import { MEETING_IMAGE_BUCKET, meetingDate, meetingImagePaths, sheetMarkdown, splitSheetMarkdown, withImageUrls, type MeetingRow } from "@/lib/meetings";
import { createClient } from "@/lib/supabase/server";
import iconColor from "@/public/brand/SantamoreIcon-Color.png";

/**
 * A meeting as a sheet, in the brand: the agenda as page one, the minutes
 * from page two, each under the letterhead (the icon left, the kind of sheet
 * in the display face and the date right, a hairline), then the meeting's
 * title in the display face too, numbered sections as red pills, the sign-in list in a mist box, and
 * a footer on every page. On screen the letterhead, title and footer stay
 * hidden (the page has its own) and the console around it stays; on paper
 * the sheet is the whole page.
 *
 * The page's own margins are zero so the browser has nowhere to print its
 * date, file name and URL. The room at the top and bottom of every page
 * comes instead from each sheet being a table whose head and foot rows,
 * which browsers repeat on every printed page, are empty spacers; the footer
 * is a fixed element, which browsers also repeat on every page. Shared by
 * the console and the member area so the two print the same document.
 *
 * A picture in the text is a Markdown image whose target is a path in the
 * private meeting-images bucket (migration 0085); the sheet signs every
 * path for an hour before setting the text. A line that is the org chart
 * token draws the chart itself, from the code, so it is always current.
 */
export async function MeetingSheet({ row, locale }: { row: MeetingRow; locale: string }) {
  const t = await getTranslations("admin.meetings");
  const date = meetingDate(row.held_at, locale);
  const urls = await signedImageUrls([row.agenda_md ?? "", row.minutes_md ?? ""].join("\n"));
  const chartLang = locale === "me" ? "me" : "en";

  function Body({ md, className }: { md: string; className: string }) {
    return splitSheetMarkdown(withImageUrls(md, urls)).map((segment, i) =>
      segment.kind === "org-chart" ? (
        <figure key={i} className="sheet-figure">
          <OrgChart lang={chartLang} />
        </figure>
      ) : (
        <MarkdownBlock key={i} text={sheetMarkdown(segment.text)} className={i === 0 ? className : "sheet-body"} />
      ),
    );
  }

  function Sheet({ kind, heading, children }: { kind: string; heading: string; children: React.ReactNode }) {
    return (
      <>
        <header className="sheet-head hidden print:flex">
          <Image src={iconColor} alt="" className="sheet-icon" priority unoptimized />
          <div className="sheet-head-right">
            <p className="type-display sheet-kind">{kind}</p>
            <p className="sheet-meta">{date}</p>
          </div>
        </header>
        <h1 className="type-display sheet-title hidden print:block">{row.title}</h1>
        <h2 className="type-display mt-8 text-2xl print:hidden">{heading}</h2>
        {children}
      </>
    );
  }

  return (
    <article id="print-doc" className="print-doc">
      <style>{SHEET_CSS}</style>

      <table className="sheet-page">
        <thead><tr><td><div className="sheet-top" /></td></tr></thead>
        <tfoot><tr><td><div className="sheet-bottom" /></td></tr></tfoot>
        <tbody>
          <tr>
            <td>
              <Sheet kind={t("agendaSheetTitle")} heading={t("agendaHeading")}>
                {row.agenda_md ? <Body md={row.agenda_md} className="sheet-body mt-3" /> : <p className="mt-3 text-[14.5px] text-black/60">{t("noAgenda")}</p>}
              </Sheet>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="sheet-page sheet-minutes">
        <thead><tr><td><div className="sheet-top" /></td></tr></thead>
        <tfoot><tr><td><div className="sheet-bottom" /></td></tr></tfoot>
        <tbody>
          <tr>
            <td>
              <Sheet kind={t("minutesSheetTitle")} heading={t("minutesHeading")}>
                <div className="sheet-box mt-3">
                  <p className="sheet-box-title">{t("attendeesHeading")}</p>
                  <p>{row.attendees.length > 0 ? row.attendees.join(", ") : "—"}</p>
                </div>
                {row.minutes_md ? <Body md={row.minutes_md} className="sheet-body mt-5" /> : <p className="mt-3 text-[14.5px] text-black/60">{t("noMinutes")}</p>}
              </Sheet>
            </td>
          </tr>
        </tbody>
      </table>

      <footer className="sheet-foot hidden print:flex">
        <span>Santamore · santamore.me</span>
        <span>{row.title} · {date}</span>
      </footer>
    </article>
  );
}

/** A signed URL, good for an hour, for every bucket path the text refers to; a path that cannot be signed is left out. */
async function signedImageUrls(md: string): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  const paths = meetingImagePaths(md);
  if (paths.length === 0) return urls;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(MEETING_IMAGE_BUCKET).createSignedUrls(paths, 3600);
  if (error || !data) {
    console.error("[meetings] signing images failed:", error?.message);
    return urls;
  }
  for (const item of data) if (item.signedUrl && item.path && !item.error) urls.set(item.path, item.signedUrl);
  return urls;
}

/**
 * The sheet's own type: numbered sections as red pills (a counter per
 * sheet), plain headings as red eyebrows, mist boxes, the agenda's table
 * style. On paper: A4 with no page margin (see above), 14 mm sides from the
 * sheet's own padding, 16 mm at the top and 18 mm at the foot of every page
 * from the spacer rows, the minutes on a new page, the footer fixed.
 */
const SHEET_CSS = `
#print-doc { max-width: 48rem; }
#print-doc .sheet-page { width: 100%; border-collapse: collapse; counter-reset: sec; }
#print-doc .sheet-page > thead > tr > td, #print-doc .sheet-page > tfoot > tr > td, #print-doc .sheet-page > tbody > tr > td { padding: 0; border: 0; vertical-align: top; }
#print-doc .sheet-top, #print-doc .sheet-bottom { height: 0; }
#print-doc .sheet-body h2 { display: flex; align-items: baseline; gap: .6rem; margin-top: 1.6rem; font-family: var(--font-brand); font-weight: 700; font-size: 1.05rem; line-height: 1.3; counter-increment: sec; }
#print-doc .sheet-body h2::before { content: counter(sec, decimal-leading-zero); flex: none; font-weight: 800; font-size: .72rem; letter-spacing: .06em; color: #fff; background: #F35353; border-radius: 8px; padding: .12rem .5rem; transform: translateY(-.1rem); }
#print-doc .sheet-body h3 { margin-top: 1.4rem; font-size: .78rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #F35353; }
#print-doc .sheet-body p { margin-top: .5rem; }
#print-doc .sheet-body ul, #print-doc .sheet-body ol { margin-top: .5rem; padding-left: 1.2rem; }
#print-doc .sheet-body li { margin-top: .25rem; }
#print-doc .sheet-body li::marker { color: #F35353; }
#print-doc .sheet-body .tablewrap, #print-doc .sheet-body table { margin-top: .6rem; }
#print-doc .sheet-body th { background: #F1F5F6; }
#print-doc .sheet-body img { display: block; max-width: 100%; height: auto; margin-top: .8rem; border-radius: 8px; }
#print-doc .sheet-figure { margin-top: 1rem; }
#print-doc .sheet-box { background: #F1F5F6; border-radius: 8px; padding: .7rem 1rem; font-size: .95rem; }
#print-doc .sheet-box-title { font-weight: 700; font-size: .9rem; margin-bottom: .15rem; }
#print-doc .sheet-head { align-items: flex-end; justify-content: space-between; gap: 5mm; padding-bottom: 4mm; border-bottom: .2mm solid #000; }
#print-doc .sheet-icon { height: 20mm; width: auto; flex: none; }
#print-doc .sheet-head-right { text-align: right; }
#print-doc .sheet-kind { font-size: 21pt; line-height: 1.05; text-transform: uppercase; letter-spacing: .06em; }
#print-doc .sheet-meta { margin-top: 2mm; font-size: 9.5pt; color: rgba(0,0,0,.6); }
#print-doc .sheet-title { margin-top: 9mm; font-size: 20pt; line-height: 1.15; text-transform: uppercase; letter-spacing: .06em; color: #0E3A46; }
#print-doc .sheet-foot { position: fixed; left: 14mm; right: 14mm; bottom: 0; height: 14mm; justify-content: space-between; align-items: flex-start; gap: 6mm; padding-top: 3mm; border-top: .2mm solid rgba(0,0,0,.45); font-size: 8pt; color: rgba(0,0,0,.55); }
#print-doc .sheet-foot span:last-child { text-align: right; }
@media print {
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body * { visibility: hidden; }
  #print-doc, #print-doc * { visibility: visible; }
  #print-doc { position: absolute; left: 0; top: 0; width: 100%; max-width: none; margin: 0; padding: 0 14mm; box-sizing: border-box; font-size: 9.8pt; line-height: 1.38; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  #print-doc .sheet-top { height: 16mm; }
  #print-doc .sheet-bottom { height: 18mm; }
  #print-doc .prose-legal { font-size: inherit; line-height: inherit; color: #000; }
  #print-doc .sheet-minutes { break-before: page; }
  #print-doc .sheet-body { margin-top: 6mm; }
  #print-doc .sheet-body h2 { font-size: 11.5pt; margin-top: 7mm; break-after: avoid; }
  #print-doc .sheet-body h2::before { font-size: 8.5pt; padding: .5mm 2.2mm; }
  #print-doc .sheet-body h3 { font-size: 8pt; margin-top: 5mm; }
  #print-doc .sheet-body p, #print-doc .sheet-body ul, #print-doc .sheet-body ol { margin-top: 1.6mm; }
  #print-doc .sheet-body li { margin-top: .8mm; }
  #print-doc .sheet-box { margin-top: 6mm; padding: 2.4mm 3.2mm; font-size: 9.6pt; }
  #print-doc .sheet-body img { max-height: 150mm; margin-top: 3mm; break-inside: avoid; }
  #print-doc .sheet-figure { margin-top: 4mm; break-inside: avoid; }
  #print-doc .sheet-body tr { break-inside: avoid; }
  #print-doc .sheet-body thead { break-after: avoid; }
  #print-doc .tablewrap { break-inside: auto; }
  #print-doc .sheet-body th, #print-doc .sheet-body td { font-size: 9.5pt; padding: 1.2mm 1.8mm; }
}
`;
