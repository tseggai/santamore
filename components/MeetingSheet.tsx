import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { MarkdownBlock } from "@/components/MarkdownBlock";
import { meetingDate, sheetMarkdown, type MeetingRow } from "@/lib/meetings";
import iconColor from "@/public/brand/SantamoreIcon-Color.png";

/**
 * A meeting as a sheet, in the brand: the agenda as page one, the minutes
 * from page two, each under its own head (the icon, the title in the display
 * face, the date), numbered sections as red pills, the sign-in list in a mist
 * box, a page counter at the foot. On screen the heads stay hidden (the page
 * has its own) and the console around it stays; on paper the sheet is the
 * whole page. Shared by the console and the member area so the two print
 * the same document.
 */
export async function MeetingSheet({ row, locale }: { row: MeetingRow; locale: string }) {
  const t = await getTranslations("admin.meetings");
  const date = meetingDate(row.held_at, locale);
  const meta = `${t("sheetMeta")} · ${date}`;
  return (
    <article id="print-doc" className="print-doc">
      <style>{SHEET_CSS}</style>

      <section className="sheet-page">
        <header className="sheet-head hidden print:block">
          <Image src={iconColor} alt="" className="sheet-icon" />
          <h1 className="type-display sheet-title">{t("agendaSheetTitle")}</h1>
          <p className="sheet-meta">{meta} · {row.title}</p>
        </header>
        <h2 className="type-display mt-8 text-2xl print:hidden">{t("agendaHeading")}</h2>
        {row.agenda_md ? <MarkdownBlock text={sheetMarkdown(row.agenda_md)} className="sheet-body mt-3" /> : <p className="mt-3 text-[14.5px] text-black/60">{t("noAgenda")}</p>}
      </section>

      <section className="sheet-page sheet-minutes">
        <header className="sheet-head hidden print:block">
          <Image src={iconColor} alt="" className="sheet-icon" />
          <h1 className="type-display sheet-title">{t("minutesSheetTitle")}</h1>
          <p className="sheet-meta">{meta} · {row.title}</p>
        </header>
        <h2 className="type-display mt-10 text-2xl print:hidden">{t("minutesHeading")}</h2>
        <div className="sheet-box mt-3">
          <p className="sheet-box-title">{t("attendeesHeading")}</p>
          <p>{row.attendees.length > 0 ? row.attendees.join(", ") : "—"}</p>
        </div>
        {row.minutes_md ? <MarkdownBlock text={sheetMarkdown(row.minutes_md)} className="sheet-body mt-5" /> : <p className="mt-3 text-[14.5px] text-black/60">{t("noMinutes")}</p>}
      </section>
    </article>
  );
}

/**
 * The sheet's own type: numbered sections as red pills (a counter per
 * page), plain headings as red eyebrows, mist boxes, the agenda's table
 * style. On paper: A4, 13 mm sides, the sheet alone, the minutes on a new
 * page, a page counter at the foot.
 */
const SHEET_CSS = `
#print-doc { max-width: 48rem; }
#print-doc .sheet-page { counter-reset: sec; }
#print-doc .sheet-body h2 { display: flex; align-items: baseline; gap: .6rem; margin-top: 1.6rem; font-family: var(--font-brand); font-weight: 700; font-size: 1.05rem; line-height: 1.3; counter-increment: sec; }
#print-doc .sheet-body h2::before { content: counter(sec, decimal-leading-zero); flex: none; font-weight: 800; font-size: .72rem; letter-spacing: .06em; color: #fff; background: #F35353; border-radius: 8px; padding: .12rem .5rem; transform: translateY(-.1rem); }
#print-doc .sheet-body h3 { margin-top: 1.4rem; font-size: .78rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #F35353; }
#print-doc .sheet-body p { margin-top: .5rem; }
#print-doc .sheet-body ul, #print-doc .sheet-body ol { margin-top: .5rem; padding-left: 1.2rem; }
#print-doc .sheet-body li { margin-top: .25rem; }
#print-doc .sheet-body li::marker { color: #F35353; }
#print-doc .sheet-body .tablewrap, #print-doc .sheet-body table { margin-top: .6rem; }
#print-doc .sheet-body th { background: #F1F5F6; }
#print-doc .sheet-box { background: #F1F5F6; border-radius: 8px; padding: .7rem 1rem; font-size: .95rem; }
#print-doc .sheet-box-title { font-weight: 700; font-size: .9rem; margin-bottom: .15rem; }
#print-doc .sheet-head { padding-bottom: 3mm; border-bottom: .5px solid #000; }
#print-doc .sheet-icon { height: 14mm; width: auto; }
#print-doc .sheet-title { margin-top: 2mm; font-size: 19pt; line-height: 1.05; text-transform: uppercase; letter-spacing: .02em; }
#print-doc .sheet-meta { margin-top: 1mm; font-size: 9pt; color: rgba(0,0,0,.6); }
@media print {
  @page { size: A4; margin: 13mm 13mm 16mm; @bottom-left { content: "Santamore · santamore.me"; font: 8pt sans-serif; color: rgba(0,0,0,.55); vertical-align: top; padding-top: 4mm; } @bottom-right { content: counter(page) " / " counter(pages); font: 8pt sans-serif; color: rgba(0,0,0,.55); vertical-align: top; padding-top: 4mm; } }
  html, body { margin: 0; padding: 0; background: #fff; }
  body * { visibility: hidden; }
  #print-doc, #print-doc * { visibility: visible; }
  #print-doc { position: absolute; left: 0; top: 0; width: 100%; max-width: none; margin: 0; padding: 0; font-size: 10.5pt; line-height: 1.4; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  #print-doc .sheet-minutes { break-before: page; }
  #print-doc .sheet-body { margin-top: 4mm; }
  #print-doc .sheet-body h2 { font-size: 11.5pt; margin-top: 5mm; break-after: avoid; }
  #print-doc .sheet-body h3 { font-size: 8pt; }
  #print-doc .sheet-box { margin-top: 5mm; padding: 2.6mm 3.2mm; font-size: 10pt; }
  #print-doc tr { break-inside: avoid; }
  #print-doc thead { break-after: avoid; }
  #print-doc .tablewrap { break-inside: auto; }
  #print-doc .sheet-body th, #print-doc .sheet-body td { font-size: 9.5pt; padding: 1.2mm 1.8mm; }
}
`;
