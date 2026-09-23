"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState, type FormEvent } from "react";

import { deleteTeamMember, saveTeamMember } from "@/app/[locale]/admin/(protected)/osoblje/team-actions";
import { Chip, DataTable, Thumb, rowButton, type Column } from "@/components/console/DataTable";
import { HeaderAction } from "@/components/console/HeaderAction";
import { SidePanel } from "@/components/console/SidePanel";
import { useDialog } from "@/components/console/useDialog";
import { describeUploadError, downscaleToJpeg } from "@/lib/images";
import { teamPhotoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";

export const TEAM_KINDS = ["officer", "staff", "board", "committee", "volunteer"] as const;
export type TeamKind = (typeof TEAM_KINDS)[number];

export interface TeamRow {
  id: string;
  kind: TeamKind;
  full_name: string;
  title: string | null;
  quote: string | null;
  photo_path: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  years: number[];
  is_public: boolean;
  sort_order: number;
  user_id: string | null;
}

export interface AccountOption {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "member" | "accounting" | "chapter_lead" | "admin";
}

const labelClass = "text-[13.5px] font-semibold";
const inputClass = "mt-1 w-full rounded-lg bg-paper px-3.5 py-2.5 text-[15px] outline-none ring-sea/40 focus:ring-2";

/** The team, one row each; the panel holds the person and their link to an account. */
export function TeamManager({ rows, accounts, initialOpenId = "" }: { rows: TeamRow[]; accounts: AccountOption[]; initialOpenId?: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [open, setOpen] = useState<"" | "new" | string>(rows.some((r) => r.id === initialOpenId) ? initialOpenId : "");
  const [busy, setBusy] = useState(false);
  const current = rows.find((r) => r.id === open) ?? null;
  const accountById = new Map(accounts.map((a) => [a.id, a]));

  const dialog = useDialog();
  const remove = async (row: TeamRow) => {
    if (!(await dialog.confirm(t("teamDeleteConfirm", { name: row.full_name })))) return;
    setBusy(true);
    const result = await deleteTeamMember({ id: row.id }).catch(() => null);
    setBusy(false);
    if (!result?.ok) {
      await dialog.alert(t("actionError"), result?.detail ?? null);
      return;
    }
    if (open === row.id) setOpen("");
    router.refresh();
  };

  const columns: Column<TeamRow>[] = [
    {
      key: "name",
      header: t("table.colName"),
      cell: (r) => (
        <span className="block max-w-[260px] truncate">
          <span className="font-semibold">{r.full_name}</span>
          {r.title ? <span className="text-black/55"> · {r.title}</span> : null}
        </span>
      ),
      sort: (r) => r.full_name,
    },
    {
      key: "kind",
      header: t("teamKind"),
      cell: (r) => <Chip tone={r.kind === "volunteer" ? "paper" : "sea"}>{t(`teamKindValue.${r.kind}`)}</Chip>,
      sort: (r) => TEAM_KINDS.indexOf(r.kind),
      filter: { options: TEAM_KINDS.map((k) => ({ value: k, label: t(`teamKindValue.${k}`) })), match: (r, value) => r.kind === value },
    },
    {
      key: "public",
      header: t("table.colStatus"),
      cell: (r) => (r.is_public ? <Chip tone="sea">{t("bnPublished")}</Chip> : <Chip>{t("teamPrivate")}</Chip>),
      sort: (r) => (r.is_public ? 1 : 0),
      filter: {
        options: [
          { value: "public", label: t("bnPublished") },
          { value: "private", label: t("teamPrivate") },
        ],
        match: (r, value) => (value === "public" ? r.is_public : !r.is_public),
      },
    },
    { key: "years", header: t("teamYears"), cell: (r) => <span className="font-mono text-[13.5px] tabular-nums">{r.years.length ? r.years.join(", ") : "—"}</span> },
    {
      key: "account",
      header: t("teamAccount"),
      cell: (r) => {
        const account = r.user_id ? accountById.get(r.user_id) : null;
        return account ? <span className="text-[13.5px]">{t(`memberRole.${account.role}`)}</span> : <span className="text-black/40">—</span>;
      },
      sort: (r) => (r.user_id ? 1 : 0),
    },
  ];

  return (
    <>
      {dialog.element}
      <HeaderAction>
        <button type="button" onClick={() => setOpen("new")} className="rounded-lg bg-red px-4 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-red-dark">
          + {t("teamNew")}
        </button>
      </HeaderAction>
      <div className="mt-4">
        <DataTable
          rows={rows}
          getId={(r) => r.id}
          columns={columns}
          leading={(r) => <Thumb src={teamPhotoUrl(r.photo_path)} initial={r.full_name.charAt(0).toUpperCase()} />}
          onOpen={(r) => setOpen(r.id)}
          searchText={(r) => `${r.full_name} ${r.title ?? ""} ${r.email ?? ""}`}
          emptyLabel={t("teamEmpty")}
          rowActions={(r) => (
            <button type="button" disabled={busy} onClick={() => remove(r)} className={`${rowButton} text-red-dark`}>{t("suDelete")}</button>
          )}
        />
      </div>

      <SidePanel open={open !== ""} title={open === "new" ? t("teamNew") : (current?.full_name ?? "")} onClose={() => setOpen("")} wide>
        <TeamForm key={open} row={current} accounts={accounts} onDone={() => setOpen("")} />
      </SidePanel>
    </>
  );
}

function TeamForm({ row, accounts, onDone }: { row: TeamRow | null; accounts: AccountOption[]; onDone: () => void }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [kind, setKind] = useState<TeamKind>(row?.kind ?? "staff");
  const [fullName, setFullName] = useState(row?.full_name ?? "");
  const [title, setTitle] = useState(row?.title ?? "");
  const [quote, setQuote] = useState(row?.quote ?? "");
  const [email, setEmail] = useState(row?.email ?? "");
  const [phone, setPhone] = useState(row?.phone ?? "");
  const [notes, setNotes] = useState(row?.notes ?? "");
  const [years, setYears] = useState((row?.years ?? []).join(", "));
  const [isPublic, setIsPublic] = useState(row?.is_public ?? false);
  const [sortOrder, setSortOrder] = useState(String(row?.sort_order ?? 0));
  const [userId, setUserId] = useState(row?.user_id ?? "");
  const [photoPath, setPhotoPath] = useState<string | null | undefined>(undefined);
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const [folder] = useState(() => row?.id ?? `new-${crypto.randomUUID()}`);
  const [state, setState] = useState<"idle" | "busy" | "error" | "invalid" | "account_taken">("idle");
  const [detail, setDetail] = useState<string | null>(null);
  const currentPhoto = photoPath === undefined ? (row?.photo_path ?? null) : photoPath;
  const photo = teamPhotoUrl(currentPhoto);
  const linked = userId ? accounts.find((a) => a.id === userId) : null;

  const uploadPhoto = async (file: File) => {
    setPhotoBusy(true);
    try {
      const blob = await downscaleToJpeg(file, 800);
      const path = `${folder}/photo-${Date.now()}.jpg`;
      const { error } = await createClient().storage.from("team-photos").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      setPhotoPath(path);
    } catch (error) {
      const why = describeUploadError(error);
      setState("error");
      setDetail(why.key === "uploadFailed" ? t(why.key, { detail: why.detail }) : t(why.key));
    } finally {
      setPhotoBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (state === "busy" || photoBusy) return;
    const yearList = years.split(/[,\s]+/).map((v) => v.trim()).filter(Boolean);
    if (yearList.some((v) => !/^\d{4}$/.test(v))) {
      setState("invalid");
      return;
    }
    setState("busy");
    setDetail(null);
    const result = await saveTeamMember({
      id: row?.id,
      kind,
      fullName,
      title: title.trim() || null,
      quote: quote.trim() || null,
      ...(photoPath !== undefined ? { photoPath } : {}),
      email: email.trim() || null,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
      years: yearList.map(Number),
      isPublic,
      sortOrder: Number.parseInt(sortOrder, 10) || 0,
      userId: userId || null,
    }).catch(() => ({ ok: false as const, error: "server" as const }));
    if (result.ok) {
      router.refresh();
      onDone();
    } else {
      setState(result.error === "invalid" ? "invalid" : result.error === "account_taken" ? "account_taken" : "error");
      setDetail("detail" in result && result.detail ? result.detail : null);
    }
  };

  return (
    <form onSubmit={submit}>
      <fieldset>
        <legend className={labelClass}>{t("teamKind")}</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {TEAM_KINDS.map((value) => (
            <label key={value} className={`cursor-pointer rounded-lg px-3 py-2 text-[14px] font-semibold ${kind === value ? "bg-ink text-paper" : "bg-paper hover:bg-mist-2"}`}>
              <input type="radio" name="teamKind" value={value} checked={kind === value} onChange={() => setKind(value)} className="sr-only" />
              {t(`teamKindValue.${value}`)}
            </label>
          ))}
        </div>
        <p className="mt-1 text-[13px] text-black/50">{t(`teamKindHint.${kind}`)}</p>
      </fieldset>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="tmName" className={labelClass}>{t("memberName")}</label>
          <input id="tmName" type="text" required minLength={2} maxLength={120} value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="tmTitle" className={labelClass}>{t("memberTitle")}</label>
          <input id="tmTitle" type="text" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("memberTitleHint")} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="tmQuote" className={labelClass}>{t("memberQuote")}</label>
          <textarea id="tmQuote" rows={3} maxLength={600} value={quote} onChange={(e) => setQuote(e.target.value)} className={inputClass} />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- public bucket, arbitrary sizes
            <img src={photo} alt="" className="h-14 w-14 rounded-lg object-cover" />
          ) : (
            <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-lg bg-paper text-[20px] text-sea">{(fullName || "?").charAt(0).toUpperCase()}</span>
          )}
          <div className="flex flex-wrap gap-2">
            <input ref={photoInput} type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadPhoto(f); e.target.value = ""; }} />
            <button type="button" disabled={photoBusy} onClick={() => photoInput.current?.click()} className="rounded-lg bg-paper px-3 py-2 text-[14px] font-semibold transition-colors hover:bg-mist-2 disabled:opacity-60">
              {photoBusy ? "…" : photo ? t("memberPhotoReplace") : t("memberPhotoAdd")}
            </button>
            {photo ? <button type="button" onClick={() => setPhotoPath(null)} className="rounded-lg bg-paper px-3 py-2 text-[14px] font-semibold text-red-dark transition-colors hover:bg-mist-2">{t("memberPhotoRemove")}</button> : null}
          </div>
        </div>
        <div>
          <label htmlFor="tmEmail" className={labelClass}>{t("suEmail")}</label>
          <input id="tmEmail" type="email" maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="tmPhone" className={labelClass}>{t("suPhone")}</label>
          <input id="tmPhone" type="tel" maxLength={40} value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="tmYears" className={labelClass}>{t("teamYears")}</label>
          <input id="tmYears" type="text" inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value)} placeholder="2025, 2026" className={`${inputClass} font-mono`} />
          <p className="mt-1 text-[13px] text-black/50">{t("teamYearsHint")}</p>
        </div>
        <div>
          <label htmlFor="tmOrder" className={labelClass}>{t("memberOrder")}</label>
          <input id="tmOrder" type="number" min={0} max={999} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={`${inputClass} font-mono`} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="tmAccount" className={labelClass}>{t("teamAccount")}</label>
          <select id="tmAccount" value={userId} onChange={(e) => setUserId(e.target.value)} className={inputClass}>
            <option value="">{t("teamNoAccount")}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.full_name ?? a.email ?? a.id}{a.email && a.full_name ? ` · ${a.email}` : ""}</option>
            ))}
          </select>
          <p className="mt-1 text-[13px] text-black/50">
            {linked ? (
              <>
                {t("teamAccountLevel", { level: t(`memberRole.${linked.role}`) })}{" "}
                <Link href="/admin/osoblje/nalozi" className="font-semibold text-sea underline underline-offset-2">{t("teamChangeAccess")}</Link>
              </>
            ) : (
              t("teamAccountHint")
            )}
          </p>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="tmNotes" className={labelClass}>{t("suNotes")}</label>
          <textarea id="tmNotes" rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </div>
        <label className="flex items-center gap-2 text-[14.5px] sm:col-span-2">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-4 w-4 accent-red" />
          {t("teamPublic")}
        </label>
      </div>
      {state === "error" ? (
        <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">
          {t("actionError")}
          {detail ? <span className="mt-1 block font-mono text-[12.5px] font-normal text-black/60">{detail}</span> : null}
        </p>
      ) : null}
      {state === "account_taken" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("teamAccountTaken")}</p> : null}
      {state === "invalid" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("evInvalid")}</p> : null}
      <div className="sticky bottom-0 -mx-5 mt-6 flex gap-2 border-t-[0.5px] border-black/25 bg-mist px-5 py-3 sm:-mx-6 sm:px-6">
        <button type="submit" disabled={state === "busy" || photoBusy} className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60">
          {row ? t("evSave") : t("teamCreate")}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg bg-paper px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:bg-mist-2">{t("cancel")}</button>
      </div>
    </form>
  );
}
