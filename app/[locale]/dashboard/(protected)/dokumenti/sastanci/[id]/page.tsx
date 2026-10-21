import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { MarkdownBlock } from "@/components/MarkdownBlock";
import { MEETING_COLUMNS, meetingDate, type MeetingRow } from "@/lib/meetings";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

/** One meeting for a member to read: who was there, the agenda, the minutes. */
export default async function MemberMeetingPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [t, tMeetings] = await Promise.all([getTranslations("dashboard"), getTranslations("admin.meetings")]);
  const supabase = await createClient();
  const { data } = await supabase.from("meetings").select(MEETING_COLUMNS).eq("id", id).maybeSingle();
  if (!data) notFound();
  const row = data as MeetingRow;
  return (
    <div className="py-8">
      <p className="text-[14px]"><Link href="/dashboard/dokumenti" className="font-semibold text-sea hover:underline">← {t("documentsTitle")}</Link></p>
      <p className="type-eyebrow mt-4 text-black/60">{meetingDate(row.held_at, locale)}</p>
      <h1 className="type-display text-2xl">{row.title}</h1>
      <section className="mt-6 max-w-3xl rounded-lg bg-mist px-5 py-4">
        <h2 className="text-[15px] font-bold">{tMeetings("attendeesHeading")}</h2>
        <p className="mt-1 text-[14.5px]">{row.attendees.length > 0 ? row.attendees.join(", ") : "—"}</p>
      </section>
      <section className="mt-8 max-w-3xl">
        <h2 className="type-display text-2xl">{tMeetings("agendaHeading")}</h2>
        {row.agenda_md ? <MarkdownBlock text={row.agenda_md} className="mt-3" /> : <p className="mt-3 text-[14.5px] text-black/60">{tMeetings("noAgenda")}</p>}
      </section>
      <section className="mt-10 max-w-3xl">
        <h2 className="type-display text-2xl">{tMeetings("minutesHeading")}</h2>
        {row.minutes_md ? <MarkdownBlock text={row.minutes_md} className="mt-3" /> : <p className="mt-3 text-[14.5px] text-black/60">{tMeetings("noMinutes")}</p>}
      </section>
    </div>
  );
}
