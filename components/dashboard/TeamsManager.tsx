"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { deleteMyTeam } from "@/app/[locale]/dashboard/(protected)/actions";
import { Avatar } from "@/components/Avatar";
import { SidePanel } from "@/components/console/SidePanel";
import { useDialog } from "@/components/console/useDialog";
import { TeamPanel, type TeamOption } from "@/components/dashboard/TeamPanel";
import { fundraiserPhotoUrl } from "@/lib/storage";
import { Link } from "@/i18n/navigation";

export interface MyTeam extends TeamOption {
  slug: string;
  causeId: string;
  causeName: string;
  memberCount: number;
  raisedLabel: string;
  /** I captain it, so I may edit or delete it; otherwise a page of mine is a member. */
  captain: boolean;
}

export interface TeamEventChoice {
  id: string;
  name: string;
  /** The runner's own page on this cause, if any — joined on creation. */
  fundraiserId: string | null;
}

/**
 * "My teams": the ones I captain (editable) and the ones a page of mine has
 * joined. The + beside the heading opens the create form in a slide-over.
 */
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
  // The captain made the team, so the captain may delete it; the pages
  // stay. The database refuses a team whose pages took donations.
  const dialog = useDialog();
  const remove = async (team: MyTeam) => {
    if (!(await dialog.confirm(t("teamDeleteAsk", { name: team.name })))) return;
    const result = await deleteMyTeam({ teamId: team.id }).catch(() => null);
    if (!result?.ok) {
      await dialog.alert(result?.blocked ? t("teamDeleteRefused", { count: result.blocked }) : t("teamDeleteFailed"));
      return;
    }
    setOpen("");
    router.refresh();
  };

  const done = () => {
    setOpen("");
    router.refresh();
  };

  return (
    <section>
      {dialog.element}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[17px] font-bold">{t("navTeams")}</h2>
          <p className="mt-0.5 text-[14px] leading-relaxed text-black/60">{t("teamsSub")}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen("new")}
          aria-label={t("newTeam")}
          title={t("newTeam")}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red text-[22px] font-bold leading-none text-paper transition-colors hover:bg-red-dark"
        >
          +
        </button>
      </div>

      {teams.length === 0 ? (
        <p className="mt-3 text-[14.5px] text-black/60">{t("teamsEmpty")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {teams.map((team) => (
            <li key={team.id} className="rounded-lg bg-mist px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar src={fundraiserPhotoUrl(team.photoPath)} name={team.name} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <Link href={`/t/${team.slug}`} className="text-[15px] font-semibold hover:text-sea">
                      {team.name}
                    </Link>
                    {team.captain ? (
                      <span className="rounded-full bg-paper px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-black/60">
                        {t("teamCaptainTag")}
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-[14px] text-black/60">
                    {team.causeName} · {t("memberCountShort", { count: team.memberCount })} ·{" "}
                    <span className="font-mono tabular-nums">{team.raisedLabel}</span>
                  </span>
                </span>
                {team.captain ? (
                  <button
                    type="button"
                    onClick={() => setOpen(open === team.id ? "" : team.id)}
                    className="rounded-lg bg-paper px-2.5 py-1.5 text-[14px] font-semibold transition-colors hover:bg-mist-2"
                  >
                    {t("teamEdit")}
                  </button>
                ) : null}
              </div>
              {open === team.id ? (
                <TeamPanel mode="edit" team={team} onDone={done} onCancel={() => setOpen("")} onDelete={() => void remove(team)} />
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <SidePanel open={open === "new"} title={t("teamCreateHeading")} onClose={() => setOpen("")}>
        {events.length === 0 ? (
          <p className="text-[14.5px] text-black/60">{t("createNoEvents")}</p>
        ) : (
          <>
            <label htmlFor="teamEvent" className="text-[14px] font-semibold">
              {t("causeLabel")}
            </label>
            <select
              id="teamEvent"
              value={eventId}
              onChange={(event) => setEventId(event.target.value)}
              className="mt-1 w-full rounded-lg border-[1.5px] border-line bg-paper px-3.5 py-2.5 text-[15px] outline-none focus:border-sea"
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[14px] text-black/55">{chosen?.fundraiserId ? t("teamJoinsPage") : t("teamNoPageYet")}</p>
            <TeamPanel
              key={eventId}
              mode="create"
              causeId={eventId}
              joinFundraiserId={chosen?.fundraiserId ?? null}
              onDone={done}
              onCancel={() => setOpen("")}
            />
          </>
        )}
      </SidePanel>
    </section>
  );
}
