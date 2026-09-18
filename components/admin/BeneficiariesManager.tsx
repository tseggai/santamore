"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState, type FormEvent } from "react";

import { deleteBeneficiary, saveBeneficiary } from "@/app/[locale]/admin/(protected)/sadrzaj/beneficiaries-actions";
import { Chip, DataTable, Thumb, rowButton, type Column } from "@/components/console/DataTable";
import { SidePanel } from "@/components/console/SidePanel";
import { downscaleToJpeg } from "@/lib/images";
import { beneficiaryPhotoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { routing, type Locale } from "@/i18n/routing";

export interface BeneficiaryRow {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  photo_path: string | null;
  story: Partial<Record<Locale, string>>;
  campaign_id: string | null;
  is_published: boolean;
  sort_order: number;
}

export interface CauseOption {
  id: string;
  title: string;
}

const labelClass = "text-[13.5px] font-semibold";
const inputClass = "mt-1 w-full rounded-lg bg-paper px-3.5 py-2.5 text-[15px] outline-none ring-sea/40 focus:ring-2";

/** Who the money reached: one row each, the story in the panel. */
export function BeneficiariesManager({ rows, causes }: { rows: BeneficiaryRow[]; causes: CauseOption[] }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [open, setOpen] = useState<"" | "new" | string>("");
  const [busy, setBusy] = useState(false);
  const current = rows.find((r) => r.id === open) ?? null;
  const causeTitle = new Map(causes.map((c) => [c.id, c.title]));

  const remove = async (row: BeneficiaryRow) => {
    if (!window.confirm(t("bnDeleteConfirm", { name: row.name }))) return;
    setBusy(true);
    const result = await deleteBeneficiary({ id: row.id }).catch(() => null);
    setBusy(false);
    if (!result?.ok) {
      window.alert(t("actionError"));
      return;
    }
    if (open === row.id) setOpen("");
    router.refresh();
  };

  const columns: Column<BeneficiaryRow>[] = [
    { key: "name", header: t("table.colName"), cell: (r) => <span className="block max-w-[260px] truncate font-semibold">{r.name}</span>, sort: (r) => r.name },
    {
      key: "status",
      header: t("table.colStatus"),
      cell: (r) => (r.is_published ? <Chip tone="sea">{t("bnPublished")}</Chip> : <Chip>{t("bnDraft")}</Chip>),
      sort: (r) => (r.is_published ? 1 : 0),
      filter: {
        options: [
          { value: "published", label: t("bnPublished") },
          { value: "draft", label: t("bnDraft") },
        ],
        match: (r, value) => (value === "published" ? r.is_published : !r.is_published),
      },
    },
    { key: "cause", header: t("spCampaign"), cell: (r) => (r.campaign_id ? causeTitle.get(r.campaign_id) ?? "—" : "—"), sort: (r) => (r.campaign_id ? causeTitle.get(r.campaign_id) ?? "" : "") },
    {
      key: "languages",
      header: t("bnLanguages"),
      cell: (r) => <span className="font-mono text-[12.5px] uppercase tracking-wider text-black/60">{routing.locales.filter((loc) => (r.story[loc] ?? "").trim()).join(" · ") || "—"}</span>,
    },
    { key: "order", header: t("memberOrder"), align: "right", cell: (r) => r.sort_order, sort: (r) => r.sort_order },
  ];

  return (
    <>
      <div className="flex justify-end">
        <button type="button" onClick={() => setOpen("new")} className="rounded-lg bg-red px-4 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-red-dark">
          + {t("bnNew")}
        </button>
      </div>
      <div className="mt-4">
        <DataTable
          rows={rows}
          getId={(r) => r.id}
          columns={columns}
          leading={(r) => <Thumb src={beneficiaryPhotoUrl(r.photo_path)} initial={r.name.charAt(0).toUpperCase()} />}
          onOpen={(r) => setOpen(r.id)}
          searchText={(r) => `${r.name} ${r.website ?? ""}`}
          emptyLabel={t("bnEmpty")}
          rowActions={(r) => (
            <button type="button" disabled={busy} onClick={() => remove(r)} className={`${rowButton} text-red-dark`}>{t("suDelete")}</button>
          )}
        />
      </div>

      <SidePanel open={open !== ""} title={open === "new" ? t("bnNew") : (current?.name ?? "")} onClose={() => setOpen("")} wide>
        <BeneficiaryForm key={open} row={current} causes={causes} onDone={() => setOpen("")} />
      </SidePanel>
    </>
  );
}

function BeneficiaryForm({ row, causes, onDone }: { row: BeneficiaryRow | null; causes: CauseOption[]; onDone: () => void }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [name, setName] = useState(row?.name ?? "");
  const [website, setWebsite] = useState(row?.website ?? "");
  const [campaignId, setCampaignId] = useState(row?.campaign_id ?? "");
  const [isPublished, setIsPublished] = useState(row?.is_published ?? false);
  const [sortOrder, setSortOrder] = useState(String(row?.sort_order ?? 0));
  const [tab, setTab] = useState<Locale>(routing.defaultLocale as Locale);
  const [story, setStory] = useState<Record<Locale, string>>({ me: row?.story.me ?? "", en: row?.story.en ?? "", ru: row?.story.ru ?? "" });
  const [photoPath, setPhotoPath] = useState<string | null | undefined>(undefined);
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const [folder] = useState(() => row?.id ?? `new-${crypto.randomUUID()}`);
  const [state, setState] = useState<"idle" | "busy" | "error" | "invalid">("idle");
  const currentPhoto = photoPath === undefined ? (row?.photo_path ?? null) : photoPath;
  const photo = beneficiaryPhotoUrl(currentPhoto);

  const uploadPhoto = async (file: File) => {
    setPhotoBusy(true);
    try {
      const blob = await downscaleToJpeg(file, 1600);
      const path = `${folder}/photo-${Date.now()}.jpg`;
      const { error } = await createClient().storage.from("beneficiary-photos").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      setPhotoPath(path);
    } catch {
      setState("error");
    } finally {
      setPhotoBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (state === "busy" || photoBusy) return;
    setState("busy");
    const result = await saveBeneficiary({
      id: row?.id,
      name,
      website: website.trim() || null,
      ...(photoPath !== undefined ? { photoPath } : {}),
      story,
      campaignId: campaignId || null,
      isPublished,
      sortOrder: Number.parseInt(sortOrder, 10) || 0,
    }).catch(() => ({ ok: false as const, error: "server" as const }));
    if (result.ok) {
      router.refresh();
      onDone();
    } else {
      setState(result.error === "invalid" ? "invalid" : "error");
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="bnName" className={labelClass}>{t("bnName")}</label>
          <input id="bnName" type="text" required minLength={2} maxLength={160} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="bnWebsite" className={labelClass}>{t("spWebsite")}</label>
          <input id="bnWebsite" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" className={inputClass} />
          <p className="mt-1 text-[13px] text-black/50">{t("bnWebsiteHint")}</p>
        </div>
        <div>
          <label htmlFor="bnCause" className={labelClass}>{t("spCampaign")}</label>
          <select id="bnCause" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className={inputClass}>
            <option value="">—</option>
            {causes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <p className="mt-1 text-[13px] text-black/50">{t("bnCauseHint")}</p>
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- public bucket, arbitrary sizes
            <img src={photo} alt="" className="h-20 w-28 rounded-lg object-cover" />
          ) : (
            <span aria-hidden className="flex h-20 w-28 items-center justify-center rounded-lg bg-paper text-[24px] text-sea">{(name || "?").charAt(0).toUpperCase()}</span>
          )}
          <div className="flex flex-wrap gap-2">
            <input ref={photoInput} type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadPhoto(f); e.target.value = ""; }} />
            <button type="button" disabled={photoBusy} onClick={() => photoInput.current?.click()} className="rounded-lg bg-paper px-3 py-2 text-[14px] font-semibold transition-colors hover:bg-mist-2 disabled:opacity-60">
              {photoBusy ? "…" : photo ? t("memberPhotoReplace") : t("memberPhotoAdd")}
            </button>
            {photo ? (
              <button type="button" onClick={() => setPhotoPath(null)} className="rounded-lg bg-paper px-3 py-2 text-[14px] font-semibold text-red-dark transition-colors hover:bg-mist-2">{t("memberPhotoRemove")}</button>
            ) : null}
          </div>
        </div>
        <div className="sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={labelClass}>{t("bnStory")}</p>
            <div role="tablist" aria-label={t("sitePageLanguage")} className="flex gap-1">
              {routing.locales.map((loc) => (
                <button key={loc} type="button" role="tab" aria-selected={tab === loc} onClick={() => setTab(loc)} className={`rounded-lg px-2.5 py-1 font-mono text-[12.5px] uppercase tracking-wider transition-colors ${tab === loc ? "bg-ink text-paper" : "bg-paper hover:bg-mist-2"}`}>
                  {loc}{(story[loc] ?? "").trim() ? "" : " ·"}
                </button>
              ))}
            </div>
          </div>
          <textarea rows={8} maxLength={6000} value={story[tab]} onChange={(e) => setStory((s) => ({ ...s, [tab]: e.target.value }))} className={inputClass} />
          <p className="mt-1 text-[13px] text-black/50">{t("bnStoryHint")}</p>
        </div>
        <div>
          <label htmlFor="bnOrder" className={labelClass}>{t("memberOrder")}</label>
          <input id="bnOrder" type="number" min={0} max={999} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={`${inputClass} font-mono`} />
        </div>
        <label className="flex items-center gap-2 self-end pb-2.5 text-[14.5px]">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4 accent-red" />
          {t("bnPublish")}
        </label>
      </div>
      {state === "error" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("actionError")}</p> : null}
      {state === "invalid" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("evInvalid")}</p> : null}
      <div className="sticky bottom-0 -mx-5 mt-6 flex gap-2 border-t-[0.5px] border-line bg-mist px-5 py-3 sm:-mx-6 sm:px-6">
        <button type="submit" disabled={state === "busy" || photoBusy} className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60">
          {row ? t("evSave") : t("bnCreate")}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg bg-paper px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:bg-mist-2">{t("cancel")}</button>
      </div>
    </form>
  );
}
