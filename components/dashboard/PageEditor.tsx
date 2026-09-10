"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import {
  setFundraiserStatus,
  updateFundraiserPage,
} from "@/app/[locale]/dashboard/(protected)/actions";
import { Avatar } from "@/components/Avatar";
import { Editable, PencilIcon } from "@/components/dashboard/Editable";
import { TeamPanel, type TeamOption } from "@/components/dashboard/TeamPanel";
import { Waterline } from "@/components/Waterline";
import { downscaleToJpeg } from "@/lib/images";
import { formatCents, parseEurosToCents, type Cents } from "@/lib/money";
import { fundraiserPhotoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import type { Locale } from "@/i18n/routing";

interface EditorFundraiser {
  id: string;
  slug: string;
  title: string;
  story: string;
  goalCents: Cents | null;
  photoPath: string | null;
  status: "draft" | "active" | "hidden";
  teamId: string | null;
  eventId: string;
  eventName: string;
}

const NEW_TEAM = "__new__";

/**
 * The page editor IS the page (brief §10, owner decision 2026-09): one
 * column that looks like /f/[slug], where the photo, name, goal, story and
 * team are edited in place. Publishing goes through the database gate —
 * photo, goal and a real story, or it stays a draft.
 */
export function PageEditor({
  locale,
  fundraiser,
  teams: initialTeams,
  captainOf,
  presetTeamId,
  raisedCents,
  donorCount,
}: {
  locale: Locale;
  fundraiser: EditorFundraiser;
  teams: TeamOption[];
  /** Team ids this runner captains — those they may edit. */
  captainOf: string[];
  /** From /t/[slug] "Join this team": preselects the team, unsaved. */
  presetTeamId: string | null;
  raisedCents: Cents;
  donorCount: number;
}) {
  const t = useTranslations("dashboard");
  const tRunner = useTranslations("runner");
  const tDonate = useTranslations("donate");
  const router = useRouter();

  const [title, setTitle] = useState(fundraiser.title);
  const [story, setStory] = useState(fundraiser.story);
  const [goalText, setGoalText] = useState(
    fundraiser.goalCents && fundraiser.goalCents > 0
      ? String(fundraiser.goalCents / 100) // cent-exact round-trip: "50.5" parses back to 5050
      : "",
  );
  const [teams, setTeams] = useState(initialTeams);
  const [captains, setCaptains] = useState(captainOf);
  const [teamId, setTeamId] = useState(() => {
    if (presetTeamId && initialTeams.some((team) => team.id === presetTeamId)) {
      return presetTeamId;
    }
    return fundraiser.teamId ?? "";
  });
  const [photoPath, setPhotoPath] = useState(fundraiser.photoPath);
  const [isActive, setIsActive] = useState(fundraiser.status === "active");
  const [editing, setEditing] = useState<"" | "name" | "story" | "goal">("");
  const [teamPanel, setTeamPanel] = useState<"" | "create" | "edit">("");
  const [busy, setBusy] = useState<"" | "save" | "publish" | "photo">("");
  const [notice, setNotice] = useState<"" | "saved" | "error" | "incomplete" | "goal">("");
  const [dirty, setDirty] = useState(Boolean(presetTeamId && presetTeamId !== fundraiser.teamId));
  const fileRef = useRef<HTMLInputElement>(null);
  const storyRef = useRef<HTMLTextAreaElement>(null);

  // Autofocus whichever field just opened for editing.
  useEffect(() => {
    if (editing === "story") storyRef.current?.focus();
  }, [editing]);

  const goalCents = goalText.trim() === "" ? null : parseEurosToCents(goalText);
  // Non-empty text that doesn't parse must never silently wipe the goal.
  const goalInvalid = goalText.trim() !== "" && goalCents === null;
  const photoUrl = fundraiserPhotoUrl(photoPath);
  const selectedTeam = teams.find((team) => team.id === teamId) ?? null;
  const canEditTeam = selectedTeam !== null && captains.includes(selectedTeam.id);
  const money = (cents: Cents) => formatCents(cents, locale, { trimWholeCents: true });

  const touch = () => {
    setDirty(true);
    if (notice === "saved") setNotice("");
  };

  const persist = () =>
    updateFundraiserPage({
      fundraiserId: fundraiser.id,
      title,
      story,
      goalCents,
      teamId: teamId === "" ? null : teamId,
      photoPath,
    }).catch(() => ({ ok: false as const, error: "server" as const }));

  const save = async () => {
    if (goalInvalid) {
      setNotice("goal");
      return;
    }
    setBusy("save");
    setNotice("");
    const result = await persist();
    setBusy("");
    if (result.ok) {
      setNotice("saved");
      setDirty(false);
      router.refresh();
    } else {
      setNotice("error" in result && result.error === "incomplete" ? "incomplete" : "error");
    }
  };

  const togglePublish = async () => {
    if (goalInvalid) {
      setNotice("goal");
      return;
    }
    setBusy("publish");
    setNotice("");
    // Unpublish FIRST when active: the integrity trigger judges edits to an
    // active row, so saving reduced content before leaving 'active' would
    // dead-end. Publishing judges the saved row, so save first there.
    if (isActive) {
      const dropped = await setFundraiserStatus({
        fundraiserId: fundraiser.id,
        publish: false,
      }).catch(
        () => ({ ok: false as const, error: "server" as const }),
      );
      if (!dropped.ok) {
        setBusy("");
        setNotice("error");
        return;
      }
      setIsActive(false);
      const saved = await persist();
      setBusy("");
      setNotice(saved.ok ? "saved" : "error");
      if (saved.ok) setDirty(false);
      router.refresh();
      return;
    }
    const saved = await persist();
    if (!saved.ok) {
      setBusy("");
      setNotice("error" in saved && saved.error === "incomplete" ? "incomplete" : "error");
      return;
    }
    setDirty(false);
    const result = await setFundraiserStatus({
      fundraiserId: fundraiser.id,
      publish: true,
    }).catch(
      () => ({ ok: false as const, error: "server" as const }),
    );
    setBusy("");
    if (result.ok) {
      setIsActive(true);
      setNotice("saved");
      router.refresh();
    } else {
      setNotice(result.error === "incomplete" ? "incomplete" : "error");
    }
  };

  const onPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy("photo");
    setNotice("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("no session");
      const blob = await downscaleToJpeg(file);
      const path = `${user.id}/${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from("fundraiser-photos")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      setPhotoPath(path);
      touch();
    } catch {
      setNotice("error");
    } finally {
      setBusy("");
    }
  };

  const onTeamChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === NEW_TEAM) {
      setTeamPanel("create");
      return;
    }
    setTeamId(value);
    setTeamPanel("");
    touch();
  };

  const onTeamDone = (team: TeamOption) => {
    setTeams((existing) => {
      const others = existing.filter((candidate) => candidate.id !== team.id);
      return [...others, team].sort((a, b) => a.name.localeCompare(b.name));
    });
    setCaptains((existing) => (existing.includes(team.id) ? existing : [...existing, team.id]));
    // createTeamAndJoin already wrote the membership; keep local state in
    // sync so the next Save doesn't write the stale value back.
    setTeamId(team.id);
    setTeamPanel("");
    router.refresh();
  };

  const linkClass = "font-semibold text-ink underline decoration-line underline-offset-[3px]";
  const fieldInput =
    "w-full rounded-[11px] border-[1.5px] border-sea bg-paper px-3 py-2 outline-none";

  return (
    <div>
      {/* status + actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] ${
              isActive ? "bg-sea text-paper" : "border-[1.5px] border-line text-ink/70"
            }`}
          >
            {isActive ? t("statusActive") : t("statusDraft")}
          </span>
          {dirty ? (
            <span className="text-[12px] text-ink/55">{t("unsaved")}</span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy !== ""}
            onClick={save}
            className="rounded-xl border-[1.5px] border-line px-4 py-2 text-[13.5px] font-semibold transition-colors hover:border-sea hover:text-sea disabled:opacity-60"
          >
            {t("save")}
          </button>
          <button
            type="button"
            disabled={busy !== ""}
            onClick={togglePublish}
            className="rounded-xl bg-red px-4 py-2 text-[13.5px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark disabled:opacity-60"
          >
            {isActive ? t("unpublish") : t("publish")}
          </button>
        </div>
      </div>
      <p className="mt-2 text-[12.5px] text-ink/55">{t("editorHint")}</p>

      {notice === "saved" ? (
        <p className="mt-2 text-[13px] font-semibold text-sea">{t("saved")}</p>
      ) : null}
      {notice === "error" ? (
        <p role="alert" className="mt-2 text-[13px] font-semibold text-red-dark">
          {t("actionError")}
        </p>
      ) : null}
      {notice === "incomplete" ? (
        <p role="alert" className="mt-2 text-[13px] font-semibold text-red-dark">
          {t("publishBlocked")}
        </p>
      ) : null}
      {notice === "goal" ? (
        <p role="alert" className="mt-2 text-[13px] font-semibold text-red-dark">
          {t("goalInvalid")}
        </p>
      ) : null}

      {/* the page itself — what a donor sees on /f/[slug], editable in place */}
      <div className="mt-4 rounded-brand border-[1.5px] border-line p-5 sm:p-6">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy === "photo"}
              aria-label={t("photoChange")}
              className="group relative rounded-full outline-none ring-sea/40 ring-offset-2 focus-visible:ring-2"
            >
              <Avatar src={photoUrl} name={title} size={136} />
              <span
                className={`absolute inset-0 flex items-center justify-center rounded-full bg-ink/55 text-[11px] font-bold uppercase tracking-wider text-paper transition-opacity ${
                  photoUrl
                    ? "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                    : "opacity-100"
                }`}
              >
                {busy === "photo"
                  ? t("photoUploading")
                  : photoUrl
                    ? t("photoChange")
                    : t("photoAdd")}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onPhoto}
              className="sr-only"
              tabIndex={-1}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
              {tRunner("eyebrow")}
            </p>

            <Editable
              label={t("nameEdit")}
              editing={editing === "name"}
              onEdit={() => setEditing("name")}
              onDone={() => setEditing("")}
              className="mt-1 inline-block max-w-full"
              view={
                <h1 className="type-display text-3xl leading-tight sm:text-4xl">
                  {title.trim() || <span className="text-ink/35">{t("namePlaceholder")}</span>}
                </h1>
              }
              input={
                <>
                  <label htmlFor="fName" className="sr-only">
                    {t("nameLabel")}
                  </label>
                  <input
                    id="fName"
                    type="text"
                    autoFocus
                    maxLength={80}
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      touch();
                    }}
                    className={`${fieldInput} type-display text-3xl leading-tight sm:text-4xl`}
                  />
                </>
              }
            />

            {/* context line: team picker lives where the team name shows */}
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13.5px] text-ink/70">
              <label htmlFor="fTeam" className="sr-only">
                {t("teamLabel")}
              </label>
              <span>{tRunner("runsWith")}</span>
              <select
                id="fTeam"
                value={teamPanel === "create" ? NEW_TEAM : teamId}
                onChange={onTeamChange}
                className="rounded-lg border-[1.5px] border-line bg-paper px-2 py-1 text-[13px] font-semibold text-ink outline-none focus:border-sea"
              >
                <option value="">{t("noTeam")}</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
                <option value={NEW_TEAM}>{t("newTeamOption")}</option>
              </select>
              {canEditTeam && teamPanel === "" ? (
                <button
                  type="button"
                  onClick={() => setTeamPanel("edit")}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-semibold text-sea hover:bg-mist"
                >
                  <PencilIcon className="h-3 w-3" />
                  {t("teamEdit")}
                </button>
              ) : null}
              <span>·</span>
              <span className={linkClass}>{fundraiser.eventName}</span>
            </div>

            {teamPanel === "create" ? (
              <TeamPanel
                mode="create"
                eventId={fundraiser.eventId}
                joinFundraiserId={fundraiser.id}
                onDone={onTeamDone}
                onCancel={() => setTeamPanel("")}
              />
            ) : null}
            {teamPanel === "edit" && selectedTeam ? (
              <TeamPanel
                mode="edit"
                team={selectedTeam}
                onDone={onTeamDone}
                onCancel={() => setTeamPanel("")}
              />
            ) : null}

            {/* the public actions, shown muted so the preview is honest */}
            <div aria-hidden className="pointer-events-none mt-4 flex items-center gap-2 opacity-50">
              <span className="inline-flex h-11 items-center rounded-xl bg-red px-7 text-[15px] font-bold text-paper">
                {tDonate("payVerb")}
              </span>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-[1.5px] border-line">
                <svg viewBox="0 0 24 24" className="h-5 w-5">
                  <path
                    d="M12 3v12m0-12L8 7m4-4 4 4M5 13v6h14v-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
          </div>
        </header>

        {/* waterline with the goal editable in its corner */}
        <div className="relative mt-7">
          <Waterline
            raisedCents={raisedCents}
            goalCents={goalCents ?? 0}
            donorCount={donorCount}
            locale={locale}
          />
          <div className="absolute right-3 top-3">
            <Editable
              label={t("goalEdit")}
              editing={editing === "goal"}
              onEdit={() => setEditing("goal")}
              onDone={() => setEditing("")}
              view={
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-3 py-1.5 text-[12px] font-semibold ${
                    goalCents
                      ? "border-line bg-paper/90 text-ink"
                      : "border-red bg-paper text-red-dark"
                  }`}
                >
                  <PencilIcon className="h-3 w-3" />
                  {goalCents ? t("goalChip", { amount: money(goalCents) }) : t("goalSet")}
                </span>
              }
              input={
                <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-sea bg-paper px-3 py-1 text-[12px] font-semibold">
                  <label htmlFor="fGoal">{t("goalLabel")}</label>
                  <input
                    id="fGoal"
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    value={goalText}
                    onChange={(event) => {
                      setGoalText(event.target.value);
                      touch();
                    }}
                    className="w-20 bg-transparent font-mono tabular-nums outline-none"
                  />
                </span>
              }
            />
          </div>
        </div>

        {/* story */}
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/60">
          {tRunner("story")}
        </p>
        <Editable
          label={t("storyEdit")}
          editing={editing === "story"}
          onEdit={() => setEditing("story")}
          onDone={() => setEditing("")}
          multiline
          className="mt-2 block"
          view={
            story.trim() ? (
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink/80">
                {story}
              </p>
            ) : (
              <p className="rounded-[11px] border-[1.5px] border-dashed border-line px-4 py-3 text-[14px] leading-relaxed text-ink/45">
                {t("storyPlaceholder")}
              </p>
            )
          }
          input={
            <>
              <label htmlFor="fStory" className="sr-only">
                {t("storyLabel")}
              </label>
              <textarea
                ref={storyRef}
                id="fStory"
                rows={6}
                maxLength={2000}
                value={story}
                onChange={(event) => {
                  setStory(event.target.value);
                  touch();
                }}
                className={`${fieldInput} text-[15px] leading-relaxed`}
              />
              <p className="mt-1 text-[12px] text-ink/50">{t("storyHint")}</p>
            </>
          }
        />
      </div>
    </div>
  );
}
