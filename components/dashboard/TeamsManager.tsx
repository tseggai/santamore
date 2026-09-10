"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Avatar } from "@/components/Avatar";
import { TeamPanel, type TeamOption } from "@/components/dashboard/TeamPanel";
import { fundraiserPhotoUrl } from "@/lib/storage";
import { Link } from "@/i18n/navigation";

export interface MyTeam extends TeamOption {
  slug: string;
  eventId: string;
  eventName: string;
  memberCount: number;
  raisedLabel: string;
}

export interface TeamEventChoice {
  id: string;
  name: string;
  /** The runner's own page on this event, if any — joined on creation. */
  fundraiserId: string | null;
}

/** Teams I captain: edit each, or create another on any open event. */
export function TeamsManager({
  teams,
  events,
}: {
  teams: MyTeam[];
  events: TeamEventChoice[];
}) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [open, setOpen] = useState<"" | "new" | string>("");
  const [eventId, setEventId] = useState(events[0]?.id ?? "");

  const chosen = events.find((event) => event.id === eventId) ?? null;

  const done = () => {
    setOpen("");
    router.refresh();
  };

  return (
    <div className="mt-5 space-y-6">
      {teams.length === 0 ? (
        <p className="text-[13.5px] text-ink/60">{t("teamsEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {teams.map((team) => (
            <li key={team.id} className="rounded-[11px] border-[1.5px] border-line px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar src={fundraiserPhotoUrl(team.photoPath)} name={team.name} size={40} />
                <span className="min-w-0 flex-1">
                  <Link href={`/t/${team.slug}`} className="block text-[14px] font-semibold hover:text-sea">
                    {team.name}
                  </Link>
                  <span className="block text-[12.5px] text-ink/60">
                    {team.eventName} · {t("memberCountShort", { count: team.memberCount })} ·{" "}
                    <span className="font-mono tabular-nums">{team.raisedLabel}</span>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(open === team.id ? "" : team.id)}
                  className="rounded-lg border-[1.5px] border-line px-2.5 py-1 text-[12px] font-semibold hover:border-sea hover:text-sea"
                >
                  {t("teamEdit")}
                </button>
              </div>
              {open === team.id ? (
                <TeamPanel mode="edit" team={team} onDone={done} onCancel={() => setOpen("")} />
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <section className="rounded-brand border-[1.5px] border-line p-5">
        <h2 className="text-[15px] font-bold">{t("teamCreateHeading")}</h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink/65">{t("teamCreateSub")}</p>
        {events.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-ink/60">{t("createNoEvents")}</p>
        ) : open === "new" ? (
          <>
            <div className="mt-4">
              <label htmlFor="teamEvent" className="text-[12.5px] font-semibold">
                {t("eventLabel")}
              </label>
              <select
                id="teamEvent"
                value={eventId}
                onChange={(event) => setEventId(event.target.value)}
                className="mt-1 w-full rounded-[11px] border-[1.5px] border-line bg-paper px-3.5 py-2.5 text-[14px] outline-none focus:border-sea"
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
              {chosen?.fundraiserId ? (
                <p className="mt-1 text-[12.5px] text-ink/55">{t("teamJoinsPage")}</p>
              ) : (
                <p className="mt-1 text-[12.5px] text-ink/55">{t("teamNoPageYet")}</p>
              )}
            </div>
            <TeamPanel
              key={eventId}
              mode="create"
              eventId={eventId}
              joinFundraiserId={chosen?.fundraiserId ?? null}
              onDone={done}
              onCancel={() => setOpen("")}
            />
          </>
        ) : (
          <button
            type="button"
            onClick={() => setOpen("new")}
            className="mt-4 rounded-xl bg-red px-4 py-2.5 text-[13.5px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark"
          >
            + {t("newTeamOption").replace(/^\+\s*/, "")}
          </button>
        )}
      </section>
    </div>
  );
}
