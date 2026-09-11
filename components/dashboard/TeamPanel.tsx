"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import {
  createTeam,
  updateTeam,
} from "@/app/[locale]/dashboard/(protected)/actions";
import { Avatar } from "@/components/Avatar";
import { downscaleToJpeg } from "@/lib/images";
import { fundraiserPhotoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

export interface TeamOption {
  id: string;
  name: string;
  description: string | null;
  photoPath: string | null;
}

/**
 * The team flow: creating a team (or, for its captain, editing it) is a
 * page of its own — name, photo, description — exactly what a runner gets
 * for their personal page. Mounted inline under the team picker so the
 * runner never leaves the editor.
 */
export function TeamPanel({
  mode,
  team,
  eventId,
  joinFundraiserId = null,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  team?: TeamOption;
  /** Create mode: the event the team belongs to. */
  eventId?: string;
  /** Create mode: join with this page right away. */
  joinFundraiserId?: string | null;
  onDone: (team: TeamOption) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("dashboard");
  const [name, setName] = useState(team?.name ?? "");
  const [description, setDescription] = useState(team?.description ?? "");
  const [photoPath, setPhotoPath] = useState<string | null>(team?.photoPath ?? null);
  const [busy, setBusy] = useState<"" | "photo" | "save">("");
  const [error, setError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const onPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy("photo");
    setError(false);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("no session");
      const blob = await downscaleToJpeg(file);
      const path = `${user.id}/team-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("fundraiser-photos")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;
      setPhotoPath(path);
    } catch {
      setError(true);
    } finally {
      setBusy("");
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy("save");
    setError(false);
    const payload = { name, description, photoPath };
    const result =
      mode === "create"
        ? await createTeam({ ...payload, eventId: eventId ?? "", joinFundraiserId }).catch(
            () => ({ ok: false as const }),
          )
        : await updateTeam({ ...payload, teamId: team!.id }).catch(() => ({
            ok: false as const,
          }));
    setBusy("");
    if (result.ok && "teamId" in result && result.teamId) {
      onDone({ id: result.teamId, name: name.trim(), description, photoPath });
    } else {
      setError(true);
    }
  };

  const inputClass =
    "mt-1 w-full rounded-lg border-[1.5px] border-line bg-paper px-3.5 py-2.5 text-[15px] outline-none focus:border-sea";

  return (
    <form
      onSubmit={submit}
      aria-label={mode === "create" ? t("teamCreateHeading") : t("teamEditHeading")}
      className="mt-3 rounded-brand border-[1.5px] border-ink bg-sand p-4 sm:p-5"
    >
      <p className="text-[15px] font-bold">
        {mode === "create" ? t("teamCreateHeading") : t("teamEditHeading")}
      </p>
      <p className="mt-1 text-[13.5px] leading-relaxed text-black/65">{t("teamCreateSub")}</p>

      <div className="mt-4 flex items-start gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy === "photo"}
          aria-label={t("teamPhotoLabel")}
          className="group relative shrink-0 rounded-full outline-none ring-sea/40 ring-offset-2 focus-visible:ring-2"
        >
          <Avatar src={fundraiserPhotoUrl(photoPath)} name={name || "T"} size={72} />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/55 text-[11px] font-bold uppercase tracking-wider text-paper opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            {busy === "photo" ? "…" : t("photoChange")}
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
        <div className="min-w-0 flex-1">
          <label htmlFor="teamName" className="text-[13.5px] font-semibold">
            {t("teamNameLabel")}
          </label>
          <input
            ref={nameRef}
            id="teamName"
            type="text"
            required
            minLength={2}
            maxLength={60}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="teamDescription" className="text-[13.5px] font-semibold">
          {t("teamDescriptionLabel")}
        </label>
        <textarea
          id="teamDescription"
          rows={3}
          maxLength={600}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t("teamDescriptionPlaceholder")}
          className={inputClass}
        />
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">
          {t("actionError")}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={busy !== "" || name.trim().length < 2}
          className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {mode === "create" ? t("teamCreateSubmit") : t("teamEditSubmit")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border-[1.5px] border-line px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:border-sea hover:text-sea"
        >
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
