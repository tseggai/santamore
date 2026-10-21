import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { MeetingSheet } from "@/components/MeetingSheet";
import { PrintButton } from "@/components/PrintButton";
import { MEETING_COLUMNS, meetingDate, type MeetingRow } from "@/lib/meetings";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

async function fetchMeeting(id: string): Promise<MeetingRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("meetings").select(MEETING_COLUMNS).eq("id", id).maybeSingle();
  return (data as MeetingRow | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = await params;
  const row = await fetchMeeting(id);
  return row ? { title: `${row.title} — ${row.held_at} — Santamore` } : {};
}

/** One meeting for a member to read and print: who was there, the agenda, the minutes. */
export default async function MemberMeetingPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const [t, tMeetings] = await Promise.all([getTranslations("dashboard"), getTranslations("admin.meetings")]);
  const row = await fetchMeeting(id);
  if (!row) notFound();
  return (
    <div className="py-8">
      <p className="text-[14px] print:hidden"><Link href="/dashboard/dokumenti" className="font-semibold text-sea hover:underline">← {t("documentsTitle")}</Link></p>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <p className="type-eyebrow text-black/60">{meetingDate(row.held_at, locale)}</p>
          <h1 className="type-display text-2xl">{row.title}</h1>
        </div>
        <PrintButton label={tMeetings("print")} fileName={`santamore-zapisnik-${row.held_at}`} />
      </div>
      <MeetingSheet row={row} locale={locale} />
    </div>
  );
}
