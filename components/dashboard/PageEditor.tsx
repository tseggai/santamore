"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";

import {
  setFundraiserStatus,
  updateFundraiserPage,
} from "@/app/[locale]/dashboard/(protected)/actions";
import { Avatar } from "@/components/Avatar";
import { useSidePanel } from "@/components/console/SidePanel";
import { Editable, PencilIcon } from "@/components/dashboard/Editable";
import { TeamPanel, type TeamOption } from "@/components/dashboard/TeamPanel";
import { ShareButton } from "@/components/ShareButton";
import { Waterline } from "@/components/Waterline";
import { downscaleToJpeg } from "@/lib/images";
import { parseEurosToCents, type Cents } from "@/lib/money";
import { fundraiserPhotoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
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
  causeId: string;
  causeTitle: string;
  /** For the link to the cause; null when it could not be read. */
  causeSlug: string | null;
  /** Staff have published the cause; until then it is named but not linked. */
  causePublic: boolean;
}

export interface CauseChoice {
  id: string;
  title: string;
}

const NEW_TEAM = "__new__";

/**
 * The page editor IS the page (brief §10, owner decision 2026-09): one
 * column that looks like /f/[slug], where the photo, name, story and team
 * are edited in place and the goal in a small overlay. Status and Share
 * head it, Save and Publish stick to the foot (owner decision 2026-11-25). Publishing
 * goes through the database gate — photo, goal and a real story, or it
 * stays a draft.
 */
export function PageEditor({
  locale,
  fundraiser,
  causes,
  teams: initialTeams,
  captainOf,
  presetTeamId,
  raisedCents,
  donorCount,
  inPanel = false,
  children,
}: {
  locale: Locale;
  fundraiser: EditorFundraiser;
  /** The published causes still open, plus the page's own; the page may move between them until a gift comes in. */
  causes: CauseChoice[];
  teams: TeamOption[];
  /** Team ids this runner captains — those they may edit. */
  captainOf: string[];
  /** From /t/[slug] "Join this team": preselects the team, unsaved. */
  presetTeamId: string | null;
  raisedCents: Cents;
  donorCount: number;
  /** In the hub's slide-over: no box of its own, and the first row keeps clear of the ×. */
  inPanel?: boolean;
  /** What follows the page — the challenge and cash logs — above the sticky Save bar. */
  children?: ReactNode;
}) {
  const t = useTranslations("dashboard");
  const tRunner = useTranslations("runner");
  const tDonate = useTranslations("donate");
  const router = useRouter();

  const [title, setTitle] = useState(fundraiser.title);
  const [story, setStory] = useState(fundraiser.story);
  const [goalCents, setGoalCents] = useState<Cents | null>(
    fundraiser.goalCents && fundraiser.goalCents > 0 ? fundraiser.goalCents : null,
  );
  const [goalDraft, setGoalDraft] = useState("");
  const [goalError, setGoalError] = useState(false);
  const goalRef = useRef<HTMLDialogElement>(null);
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
  const [editing, setEditing] = useState<"" | "name" | "story">("");
  const [teamPanel, setTeamPanel] = useState<"" | "create" | "edit">("");
  const [busy, setBusy] = useState<"" | "save" | "publish" | "photo">("");
  const [notice, setNotice] = useState<"" | "saved" | "error" | "incomplete" | "causeLocked" | "causeTaken">("");
  const [causeId, setCauseId] = useState(fundraiser.causeId);
  // Gifts came in: the money stays where it was given, so the page stays with its cause.
  const causeLocked = donorCount > 0;
  const [dirty, setDirty] = useState(Boolean(presetTeamId && presetTeamId !== fundraiser.teamId));
  const fileRef = useRef<HTMLInputElement>(null);
  const storyRef = useRef<HTMLTextAreaElement>(null);

  // Saved: the slide-over has nothing left to ask about on close.
  const panel = useSidePanel();
  useEffect(() => {
    if (!dirty) panel.markClean();
  }, [dirty, panel]);

  // Autofocus whichever field just opened for editing.
  useEffect(() => {
    if (editing === "story") storyRef.current?.focus();
  }, [editing]);

  const photoUrl = fundraiserPhotoUrl(photoPath);
  // Mirrors the database gate (photo, goal, story ≥ 80 chars) so the notice
  // names only what is actually missing.
  const missing = [
    ...(photoPath ? [] : [t("needPhoto")]),
    ...(goalCents && goalCents > 0 ? [] : [t("needGoal")]),
    ...(story.trim().length >= 80 ? [] : [t("needStory")]),
  ];
  const teamsForCause = teams.filter((team) => !team.causeId || team.causeId === causeId);
  const selectedTeam = teamsForCause.find((team) => team.id === teamId) ?? null;
  const canEditTeam = selectedTeam !== null && captains.includes(selectedTeam.id);

  const touch = () => {
    setDirty(true);
    if (notice === "saved") setNotice("");
  };

  const persist = (goal: Cents | null = goalCents) =>
    updateFundraiserPage({
      fundraiserId: fundraiser.id,
      title,
      story,
      goalCents: goal,
      teamId: teamId === "" ? null : teamId,
      photoPath,
      causeId,
    }).catch(() => ({ ok: false as const, error: "server" as const }));

  /** `goal` is the value just confirmed in the goal overlay, before its state has landed. */
  const save = async (goal: Cents | null = goalCents) => {
    setBusy("save");
    setNotice("");
    const result = await persist(goal);
    setBusy("");
    if (result.ok) {
      setNotice("saved");
      setDirty(false);
      router.refresh();
    } else {
      const reason = "error" in result ? result.error : "server";
      setNotice(reason === "incomplete" || reason === "causeLocked" || reason === "causeTaken" ? reason : "error");
    }
  };

  const onCauseChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setCauseId(event.target.value);
    // Teams belong to a cause; the old one's team cannot follow.
    setTeamId("");
    setTeamPanel("");
    touch();
  };

  const togglePublish = async () => {
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
      if (!saved.ok) {
        setBusy("");
        setNotice("error");
        router.refresh();
        return;
      }
      // And it stays a draft: that is what the button says. (It used to
      // publish again straight after, so the page never left "published".)
      setBusy("");
      setDirty(false);
      setNotice("saved");
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

  const onTeamDone = (option: TeamOption) => {
    const team = { ...option, causeId };
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

  const openGoal = () => {
    setGoalDraft(goalCents ? String(goalCents / 100) : ""); // cent-exact round-trip: "50.5" parses back to 5050
    setGoalError(false);
    goalRef.current?.showModal();
  };

  const submitGoal = (event: FormEvent) => {
    event.preventDefault();
    const next = goalDraft.trim() === "" ? null : parseEurosToCents(goalDraft);
    // Non-empty text that doesn't parse must never silently wipe the goal.
    if (goalDraft.trim() !== "" && (next === null || next <= 0)) {
      setGoalError(true);
      return;
    }
    goalRef.current?.close();
    if (next === goalCents) return;
    setGoalCents(next);
    touch();
    void save(next);
  };

  const linkClass = "font-semibold text-black underline decoration-black/30 underline-offset-[3px]";
  const fieldInput =
    "w-full rounded-lg border-[1.5px] border-sea bg-paper px-3 py-2 outline-none";
  const selectClass =
    "h-10 min-w-0 flex-1 rounded-lg border-[1.5px] border-line bg-paper px-2 text-[14.5px] font-semibold text-black outline-none focus:border-sea";
  return (
    <div>
      {/* status on the left, Share on the right; in the slide-over the row
          sits level with the × in the corner and keeps clear of it */}
      <div className={`flex min-h-9 items-center justify-between gap-3 ${inPanel ? "-mt-1 pr-12" : ""}`}>
        <span
          className={`rounded-full px-2.5 py-1 font-mono text-[11.5px] uppercase tracking-[0.14em] ${
            isActive ? "bg-sea text-paper" : "border-[1.5px] border-line text-black/70"
          }`}
        >
          {isActive ? t("statusActive") : t("statusDraft")}
        </span>
        {isActive ? (
          <ShareButton
            title={title}
            path={`/${locale}/f/${fundraiser.slug}`}
            text={t("shareMessageShort", { title })}
            label={tRunner("share")}
            copiedLabel={tDonate("copied")}
            variant="icon"
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-black/70 transition-colors hover:bg-mist-2 hover:text-sea ${
              inPanel ? "bg-paper" : "bg-mist"
            }`}
          />
        ) : null}
      </div>

      {/* the page itself — what a donor sees on /f/[slug], editable in place.
          The slide-over is one mist surface already, so no box inside it. */}
      <div className={inPanel ? "mt-5" : "mt-4 rounded-brand bg-mist p-5 sm:p-6"}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy === "photo"}
          aria-label={photoUrl ? t("photoChange") : t("photoAdd")}
          title={photoUrl ? t("photoChange") : t("photoAdd")}
          className="group relative block rounded-full outline-none ring-sea/40 ring-offset-2 focus-visible:ring-2"
        >
          <Avatar src={photoUrl} name={title} size={104} />
          <span
            aria-hidden
            className="absolute bottom-0 right-0 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[13px] font-bold leading-none text-paper"
          >
            {busy === "photo" ? "…" : <PencilIcon />}
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

        <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.16em] text-black/60">
          {tRunner("eyebrow")}
        </p>

        <Editable
          label={t("nameEdit")}
          editing={editing === "name"}
          onEdit={() => setEditing("name")}
          onDone={() => setEditing("")}
          className="mt-1 inline-block max-w-full"
          view={
            <h1 className="type-display text-2xl leading-tight">
              {title.trim() || <span className="text-black/35">{t("namePlaceholder")}</span>}
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
                data-field="large"
                className={`${fieldInput} type-display text-2xl leading-tight`}
              />
            </>
          }
        />

        {/* context: team and cause side by side, each under its own label */}
        <div className="mt-3 grid grid-cols-2 gap-3 text-[14.5px] text-black/70">
          <div className="flex min-w-0 items-center gap-2">
            <label htmlFor="fTeam" className="shrink-0">{tRunner("team")}:</label>
            <select
              id="fTeam"
              value={teamPanel === "create" ? NEW_TEAM : teamId}
              onChange={onTeamChange}
              className={selectClass}
            >
              <option value="">{t("noTeam")}</option>
              {teamsForCause.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
              <option value={NEW_TEAM}>{t("newTeamOption")}</option>
            </select>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            {causeLocked || causes.length <= 1 ? (
              <>
                <span className="shrink-0">{t("causeLabel")}:</span>
                {/* One cause to raise for: a link to it, not a picker. */}
                {fundraiser.causePublic && fundraiser.causeSlug ? (
                  <Link
                    href={`/kampanje/${fundraiser.causeSlug}`}
                    target="_blank"
                    title={causeLocked ? t("causeLocked") : undefined}
                    className={`${linkClass} min-w-0 truncate`}
                  >
                    {fundraiser.causeTitle}
                  </Link>
                ) : (
                  <span className="min-w-0 truncate font-semibold text-black" title={causeLocked ? t("causeLocked") : t("causeDraft")}>
                    {fundraiser.causeTitle}
                  </span>
                )}
              </>
            ) : (
              <>
                <label htmlFor="fCause" className="shrink-0">{t("causeLabel")}:</label>
                <select id="fCause" value={causeId} onChange={onCauseChange} className={selectClass}>
                  {causes.map((cause) => (
                    <option key={cause.id} value={cause.id}>
                      {cause.title}
                      {cause.id === fundraiser.causeId && !fundraiser.causePublic ? ` — ${t("causeDraft")}` : ""}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>
        {canEditTeam && teamPanel === "" ? (
          <button
            type="button"
            onClick={() => setTeamPanel("edit")}
            className="mt-2 inline-flex items-center gap-1 rounded-md py-0.5 text-[14px] font-semibold text-sea hover:underline"
          >
            <PencilIcon className="h-3 w-3" />
            {t("teamEdit")}
          </button>
        ) : null}

        {teamPanel === "create" ? (
          <TeamPanel
            mode="create"
            causeId={fundraiser.causeId}
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

        {/* waterline; the goal is edited from the pencil in its top corner,
            clear of the plate that grows from the top left */}
        <div className="relative mt-6">
          <Waterline
            raisedCents={raisedCents}
            goalCents={goalCents ?? 0}
            donorCount={donorCount}
            locale={locale}
            surface="paper"
            stacked
          />
          <button
            type="button"
            onClick={openGoal}
            aria-label={goalCents ? t("goalEdit") : t("goalSet")}
            title={goalCents ? t("goalEdit") : t("goalSet")}
            className={`absolute right-3 top-3 z-10 inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border-[1.5px] bg-paper/90 text-[14px] font-semibold transition-colors hover:border-sea hover:text-sea ${
              goalCents ? "w-10 border-line text-black" : "border-red px-3 text-red-dark"
            }`}
          >
            <PencilIcon />
            {goalCents ? null : t("goalSet")}
          </button>
        </div>

        {/* story */}
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-black/60">
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
              <p className="whitespace-pre-line text-[16px] leading-relaxed text-black/80">
                {story}
              </p>
            ) : (
              <p className="rounded-lg bg-paper px-4 py-3 text-[15px] leading-relaxed text-black/45">
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
                className={`${fieldInput} text-[16px] leading-relaxed`}
              />
              <p className="mt-1 text-[14px] text-black/50">{t("storyHint")}</p>
            </>
          }
        />
      </div>

      {children}

      {/* Save and publish stay in reach at the foot of the screen */}
      <div
        className={`sticky z-10 mt-8 border-t-[0.5px] border-line pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 ${
          // The slide-over pads its scroller by 20px; the bar goes through that to the edge.
          inPanel ? "-bottom-5 -mx-5 -mb-5 bg-mist px-5 sm:-mx-6 sm:px-6" : "bottom-0 bg-paper"
        }`}
      >
        {dirty && notice === "" ? <p className="mb-2 text-[14px] text-black/55">{t("unsaved")}</p> : null}
        {notice === "saved" ? <p role="status" className="mb-2 text-[14px] font-semibold text-sea">{t("saved")}</p> : null}
        {notice === "error" ? (
          <p role="alert" className="mb-2 text-[14px] font-semibold text-red-dark">{t("actionError")}</p>
        ) : null}
        {notice === "incomplete" ? (
          <p role="alert" className="mb-2 text-[14px] font-semibold text-red-dark">
            {missing.length > 0 ? t("publishNeeds", { items: missing.join(", ") }) : t("publishBlocked")}
          </p>
        ) : null}
        {notice === "causeLocked" ? (
          <p role="alert" className="mb-2 text-[14px] font-semibold text-red-dark">{t("causeLocked")}</p>
        ) : null}
        {notice === "causeTaken" ? (
          <p role="alert" className="mb-2 text-[14px] font-semibold text-red-dark">{t("causeTakenNotice")}</p>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy !== ""}
            onClick={() => void save()}
            className="h-11 rounded-lg border-[1.5px] border-line bg-paper text-[15px] font-semibold transition-colors hover:border-sea hover:text-sea disabled:opacity-60"
          >
            {t("save")}
          </button>
          <button
            type="button"
            disabled={busy !== ""}
            onClick={togglePublish}
            className="h-11 rounded-lg bg-red text-[15px] font-bold text-paper transition-colors hover:bg-red-dark disabled:opacity-60"
          >
            {isActive ? t("unpublish") : t("publish")}
          </button>
        </div>
      </div>

      {/* the goal, in an overlay of its own; saving it saves the page */}
      <dialog
        ref={goalRef}
        aria-labelledby="goal-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) goalRef.current?.close();
        }}
        className="m-auto w-[calc(100%-32px)] max-w-sm rounded-lg bg-paper p-0 ring-[100vmax] ring-ink/55"
      >
        <form onSubmit={submitGoal} className="p-5">
          <h2 id="goal-title" className="text-[17px] font-bold">{t("goalEdit")}</h2>
          <label htmlFor="fGoal" className="mt-4 block text-[14px] font-semibold">
            {t("goalLabel")}
          </label>
          <input
            id="fGoal"
            type="text"
            inputMode="decimal"
            autoFocus
            value={goalDraft}
            onChange={(event) => {
              setGoalDraft(event.target.value);
              setGoalError(false);
            }}
            aria-invalid={goalError}
            className="mt-1 w-full rounded-lg border-[1.5px] border-line bg-paper px-3.5 py-2.5 font-mono text-[16px] font-semibold tabular-nums outline-none focus:border-sea"
          />
          {goalError ? (
            <p role="alert" className="mt-2 text-[14px] font-semibold text-red-dark">
              {t("goalInvalid")}
            </p>
          ) : null}
          <div className="mt-5 flex gap-2">
            <button type="submit" className="rounded-lg bg-red px-5 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-red-dark">
              {t("save")}
            </button>
            <button
              type="button"
              onClick={() => goalRef.current?.close()}
              className="rounded-lg bg-mist px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:bg-mist-2"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
