import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { MarkdownBlock } from "@/components/MarkdownBlock";
import { meetingDate, type MeetingRow } from "@/lib/meetings";
import iconColor from "@/public/brand/SantamoreIcon-Color.png";

/**
 * A meeting as a sheet: who was there, the agenda, the minutes. On screen it
 * is the body of the meeting page; on paper it is the whole page, with the
 * brand and the date at the top and a page counter at the foot, the console
 * around it hidden (the print rules below). Shared by the console and the
 * member area so the two print the same document.
 */
export async function MeetingSheet({ row, locale }: { row: MeetingRow; locale: string }) {
  const t = await getTranslations("admin.meetings");
  const date = meetingDate(row.held_at, locale);
  return (
    <article id="print-doc" className="print-doc">
      <style>{PRINT_CSS}</style>
      <header className="print-doc-head hidden print:block">
        <Image src={iconColor} alt="Santamore" className="h-12 w-auto" />
        <p className="type-eyebrow mt-3 text-black/60">{t("sheetKind")} · {date}</p>
        <h1 className="type-display mt-1 text-3xl">{row.title}</h1>
      </header>
      <section className="mt-6 max-w-3xl rounded-lg bg-mist px-5 py-4 print:mt-5 print:bg-transparent print:px-0 print:py-0">
        <h2 className="text-[15px] font-bold">{t("attendeesHeading")}</h2>
        <p className="mt-1 text-[14.5px]">{row.attendees.length > 0 ? row.attendees.join(", ") : "—"}</p>
      </section>
      <section className="mt-8 max-w-3xl">
        <h2 className="type-display text-2xl">{t("agendaHeading")}</h2>
        {row.agenda_md ? <MarkdownBlock text={row.agenda_md} className="mt-3" /> : <p className="mt-3 text-[14.5px] text-black/60">{t("noAgenda")}</p>}
      </section>
      <section className="mt-10 max-w-3xl">
        <h2 className="type-display text-2xl">{t("minutesHeading")}</h2>
        {row.minutes_md ? <MarkdownBlock text={row.minutes_md} className="mt-3" /> : <p className="mt-3 text-[14.5px] text-black/60">{t("noMinutes")}</p>}
      </section>
    </article>
  );
}

/** On paper: A4, the sheet alone at the top left, a page counter at the foot; nothing else on the page is drawn. */
const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 18mm; @bottom-center { content: counter(page) " / " counter(pages); font: 9pt sans-serif; color: rgba(0,0,0,.55); vertical-align: top; padding-top: 4mm; } }
  html, body { margin: 0; padding: 0; background: #fff; }
  body * { visibility: hidden; }
  #print-doc, #print-doc * { visibility: visible; }
  #print-doc { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; font-size: 11.5pt; line-height: 1.45; color: #000; }
  #print-doc .max-w-3xl { max-width: none; }
  #print-doc h2 { break-after: avoid; }
  #print-doc table, #print-doc tr { break-inside: avoid; }
  #print-doc .prose-legal th { background: #F1F5F6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;
