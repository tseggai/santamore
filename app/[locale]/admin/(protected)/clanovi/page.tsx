import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  MembersManager,
  type MemberPage,
  type MemberRegistration,
  type MemberRow,
  type MemberTeam,
} from "@/components/admin/MembersManager";
import { MessageHideButton } from "@/components/admin/FundraiserModeration";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface MessageRow {
  id: string;
  donor_name: string | null;
  message: string;
  is_message_hidden: boolean;
  created_at: string;
  fundraiser: { title: string } | { title: string }[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Members: every account, with what each person is doing — athlete,
 * fundraiser, participant, captain, donor — and the staff actions that
 * used to live on three screens (page moderation, registrations, Strava).
 */
export default async function AdminMembersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const [{ data: members }, { data: pages }, { data: registrations }, { data: teams }, { data: events }, { data: messagesData }] =
    await Promise.all([
      supabase.from("v_staff_members").select("*").order("joined_at", { ascending: false }).limit(2000),
      supabase.from("fundraisers").select("id, user_id, slug, title, status, goal_cents, event_id").limit(5000),
      supabase
        .from("registrations")
        .select("id, user_id, event_id, participant_name, distance, tier_label, shirt_size, bib_number, amount_due_cents, amount_paid_cents, payment_reference, status")
        .limit(10_000),
      supabase.from("teams").select("id, captain_id, name, slug, event_id").limit(5000),
      supabase.from("events").select("id, name").limit(1000),
      supabase
        .from("donations")
        .select("id, donor_name, message, is_message_hidden, created_at, fundraiser:fundraisers(title)")
        .not("message", "is", null)
        .neq("message", "")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  const eventName = new Map(((events ?? []) as { id: string; name: string }[]).map((e) => [e.id, e.name]));
  const memberPages: MemberPage[] = ((pages ?? []) as { id: string; user_id: string; slug: string; title: string; status: "draft" | "active" | "hidden"; goal_cents: number | null; event_id: string }[]).map((page) => ({
    ...page,
    event_name: eventName.get(page.event_id) ?? "—",
  }));
  const memberRegistrations: MemberRegistration[] = ((registrations ?? []) as Omit<MemberRegistration, "event_name">[]).map((row) => ({
    ...row,
    event_name: eventName.get(row.event_id) ?? "—",
  }));
  const memberTeams: MemberTeam[] = ((teams ?? []) as { id: string; captain_id: string | null; name: string; slug: string; event_id: string }[]).map((team) => ({
    ...team,
    event_name: eventName.get(team.event_id) ?? "—",
  }));
  const messages = (messagesData ?? []) as unknown as MessageRow[];

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("membersTitle")}</h1>
      <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-black/60">{t("membersHint")}</p>
      <MembersManager
        locale={locale as Locale}
        members={(members ?? []) as MemberRow[]}
        pages={memberPages}
        registrations={memberRegistrations}
        teams={memberTeams}
      />

      <h2 className="mt-12 text-[16px] font-bold">{t("wallHeading")}</h2>
      <p className="mt-1 text-[14px] text-black/60">{t("wallHint")}</p>
      {messages.length === 0 ? (
        <p className="mt-3 text-[14.5px] text-black/60">{t("wallEmpty")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {messages.map((row) => (
            <li key={row.id} className={`rounded-lg bg-mist px-3.5 py-2.5 text-[14.5px] ${row.is_message_hidden ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-semibold">{row.donor_name ?? "—"}</span>
                <span className="text-[13px] text-black/50">
                  {one(row.fundraiser)?.title ?? "—"} · <span className="font-mono tabular-nums">{row.created_at.slice(0, 10)}</span>
                </span>
                <span className="ml-auto">
                  <MessageHideButton donationId={row.id} hidden={row.is_message_hidden} />
                </span>
              </div>
              <p className="mt-1 text-black/80">{row.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
