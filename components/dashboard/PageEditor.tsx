"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type ChangeEvent } from "react";

import {
  createTeamAndJoin,
  setFundraiserStatus,
  updateFundraiserPage,
} from "@/app/[locale]/dashboard/(protected)/actions";
import { Waterline } from "@/components/Waterline";
import { formatCents, parseEurosToCents, type Cents } from "@/lib/money";
import { fundraiserPhotoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import type { Locale } from "@/i18n/routing";

interface EditorFundraiser {
  slug: string;
  title: string;
  story: string;
  goalCents: Cents | null;
  photoPath: string | null;
  status: "draft" | "active" | "hidden";
  teamId: string | null;
}

/** Downscale before upload — never ship 4MB phone photos (brief §12). */
async function downscaleToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas unavailable");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))),
      "image/jpeg",
      0.85,
    );
  });
}

/**
 * Live-preview page editor (brief §10): the right half is exactly what a
 * donor will see. Publishing goes through the database gate — photo, goal
 * and a real story, or it stays a draft.
 */
export function PageEditor({
  locale,
  fundraiser,
  teams,
  raisedCents,
  donorCount,
}: {
  locale: Locale;
  fundraiser: EditorFundraiser;
  teams: { id: string; name: string }[];
  raisedCents: Cents;
  donorCount: number;
}) {
  const t = useTranslations("dashboard");
  const router = useRouter();

  const [title, setTitle] = useState(fundraiser.title);
  const [story, setStory] = useState(fundraiser.story);
  const [goalText, setGoalText] = useState(
    fundraiser.goalCents && fundraiser.goalCents > 0
      ? String(fundraiser.goalCents / 100) // cent-exact round-trip: "50.5" parses back to 5050
      : "",
  );
  const [teamId, setTeamId] = useState(fundraiser.teamId ?? "");
  const [newTeamName, setNewTeamName] = useState("");
  const [photoPath, setPhotoPath] = useState(fundraiser.photoPath);
  const [isActive, setIsActive] = useState(fundraiser.status === "active");
  const [busy, setBusy] = useState<"" | "save" | "publish" | "photo" | "team">("");
  const [notice, setNotice] = useState<
    "" | "saved" | "error" | "incomplete" | "goal"
  >("");

  const goalCents = goalText.trim() === "" ? null : parseEurosToCents(goalText);
  // Non-empty text that doesn't parse must never silently wipe the goal.
  const goalInvalid = goalText.trim() !== "" && goalCents === null;
  const photoUrl = fundraiserPhotoUrl(photoPath);

  const inputClass =
    "mt-1 w-full rounded-[11px] border-[1.5px] border-line px-3.5 py-3 text-[15px] outline-none focus:border-sea";
  const labelClass = "text-[13px] font-semibold";

  const persist = () =>
    updateFundraiserPage({
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
    if (result.ok) setNotice("saved");
    else setNotice("error" in result && result.error === "incomplete" ? "incomplete" : "error");
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
      const dropped = await setFundraiserStatus(false).catch(
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
      router.refresh();
      return;
    }
    const saved = await persist();
    if (!saved.ok) {
      setBusy("");
      setNotice("error" in saved && saved.error === "incomplete" ? "incomplete" : "error");
      return;
    }
    const result = await setFundraiserStatus(true).catch(
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
    } catch {
      setNotice("error");
    } finally {
      setBusy("");
    }
  };

  const addTeam = async () => {
    setBusy("team");
    setNotice("");
    const result = await createTeamAndJoin({ name: newTeamName }).catch(() => ({
      ok: false,
    }));
    setBusy("");
    if (result.ok) {
      setNewTeamName("");
      router.refresh();
    } else {
      setNotice("error");
    }
  };

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-4">
        <div>
          <label htmlFor="fTitle" className={labelClass}>
            {t("titleLabel")}
          </label>
          <input
            id="fTitle"
            type="text"
            maxLength={80}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="fStory" className={labelClass}>
            {t("storyLabel")}
          </label>
          <textarea
            id="fStory"
            rows={6}
            maxLength={2000}
            value={story}
            onChange={(event) => setStory(event.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="fGoal" className={labelClass}>
            {t("goalLabel")}
          </label>
          <input
            id="fGoal"
            type="text"
            inputMode="numeric"
            value={goalText}
            onChange={(event) => setGoalText(event.target.value)}
            className={`${inputClass} font-mono tabular-nums`}
          />
        </div>
        <div>
          <label htmlFor="fPhoto" className={labelClass}>
            {t("photoLabel")}
          </label>
          <input
            id="fPhoto"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onPhoto}
            className="mt-1 block w-full text-[13.5px] file:mr-3 file:rounded-lg file:border-0 file:bg-sea file:px-4 file:py-2 file:font-semibold file:text-paper"
          />
          {busy === "photo" ? (
            <p className="mt-1 text-[12.5px] text-ink/60">{t("photoUploading")}</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="fTeam" className={labelClass}>
            {t("teamLabel")}
          </label>
          <select
            id="fTeam"
            value={teamId}
            onChange={(event) => setTeamId(event.target.value)}
            className={`${inputClass} bg-paper`}
          >
            <option value="">{t("noTeam")}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              placeholder={t("newTeamLabel")}
              maxLength={60}
              value={newTeamName}
              onChange={(event) => setNewTeamName(event.target.value)}
              className="w-full rounded-[11px] border-[1.5px] border-line px-3.5 py-2.5 text-[13.5px] outline-none focus:border-sea"
            />
            <button
              type="button"
              disabled={busy === "team" || newTeamName.trim().length < 2}
              onClick={addTeam}
              className="shrink-0 rounded-[11px] border-[1.5px] border-line px-3.5 py-2.5 text-[13px] font-semibold transition-colors hover:border-sea hover:text-sea disabled:opacity-50"
            >
              {t("newTeamSubmit")}
            </button>
          </div>
        </div>

        {notice === "saved" ? (
          <p className="text-[13px] font-semibold text-sea">{t("saved")}</p>
        ) : null}
        {notice === "error" ? (
          <p role="alert" className="text-[13px] font-semibold text-red-dark">
            {t("actionError")}
          </p>
        ) : null}
        {notice === "incomplete" ? (
          <p role="alert" className="text-[13px] font-semibold text-red-dark">
            {t("publishBlocked")}
          </p>
        ) : null}
        {notice === "goal" ? (
          <p role="alert" className="text-[13px] font-semibold text-red-dark">
            {t("goalInvalid")}
          </p>
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy !== ""}
            onClick={save}
            className="flex-1 rounded-xl border-[1.5px] border-line px-5 py-3 text-[14px] font-semibold transition-colors hover:border-sea hover:text-sea disabled:opacity-60"
          >
            {t("save")}
          </button>
          <button
            type="button"
            disabled={busy !== ""}
            onClick={togglePublish}
            className="flex-1 rounded-xl bg-red px-5 py-3 text-[14px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark disabled:opacity-60"
          >
            {isActive ? t("unpublish") : t("publish")}
          </button>
        </div>
      </div>

      {/* live preview — what a donor sees on /f/[slug] */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-sea/80">
          {t("previewHeading")}
        </p>
        <div className="mt-2 rounded-brand border-[1.5px] border-line p-4">
          <div className="flex items-center gap-3">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt=""
                width={52}
                height={52}
                className="h-[52px] w-[52px] shrink-0 rounded-full border-[1.5px] border-ink object-cover"
              />
            ) : (
              <div
                aria-hidden
                className="type-display flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink bg-red text-[21px] font-bold text-paper"
              >
                {title.trim().charAt(0).toUpperCase() || "S"}
              </div>
            )}
            <p className="type-display min-w-0 truncate text-lg">{title}</p>
          </div>
          <div className="mt-3">
            <Waterline
              raisedCents={raisedCents}
              goalCents={goalCents ?? 0}
              donorCount={donorCount}
              locale={locale}
            />
          </div>
          {story.trim() ? (
            <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-ink/70">
              {story}
            </p>
          ) : null}
          {goalCents ? (
            <p className="mt-2 font-mono text-[11px] text-ink/50">
              {formatCents(goalCents, locale, { trimWholeCents: true })}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
