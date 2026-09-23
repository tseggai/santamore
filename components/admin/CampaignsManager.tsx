"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type ReactNode, type FormEvent } from "react";

import { deleteCampaigns, saveCampaign, setCampaignsCompleted, setCampaignsPublic } from "@/app/[locale]/admin/(protected)/kampanje/actions";
import { CoverField } from "@/components/admin/CoverField";
import type { Option } from "@/components/admin/EventForm";
import { GalleryManager, type GalleryAdminItem } from "@/components/admin/GalleryManager";
import { Chip, DataTable, Thumb, bulkButton, iconButton, rowButton, type Column } from "@/components/console/DataTable";
import { ExternalIcon, EyeIcon } from "@/components/Icons";
import { formatShortDate } from "@/lib/dates";
import { PageHeader } from "@/components/console/PageHeader";
import { useDialog } from "@/components/console/useDialog";
import { TestFlagButtons } from "@/components/admin/TestFlagButtons";
import { SidePanel } from "@/components/console/SidePanel";
import { PreviewFrame } from "@/components/admin/PreviewFrame";
import { CampaignPageView } from "@/components/campaigns/CampaignPageView";
import { galleryImageUrl } from "@/lib/storage";
import { formatCents, parseEurosToCents } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export interface CampaignRow {
  id: string;
  /** Made in test mode, or marked as test afterwards (migration 0055/0056). */
  is_test?: boolean;
  title: string;
  slug: string;
  chapter_id: string;
  description: string | null;
  goal_cents: number | null;
  starts_at: string | null;
  ends_at: string | null;
  beneficiary_summary: string | null;
  is_public: boolean;
  payment_reference: string;
  suggested_amounts: unknown;
  raised_cents: number;
  events: number;
  cover_path?: string | null;
  /** Closed by staff (migration 0063). */
  completed_at?: string | null;
  gallery: GalleryAdminItem[];
}

interface AmountSet {
  text: string;
  defaultIndex: number;
}

function readSet(value: unknown, key: "oneoff" | "monthly", fallback: string): AmountSet {
  const record = value as { [k: string]: unknown } | null;
  const list = Array.isArray(record?.[key]) ? (record![key] as unknown[]) : [];
  const cents: number[] = [];
  let defaultIndex = 0;
  list.forEach((entry) => {
    const item = entry as { amount_cents?: unknown; default?: unknown };
    if (typeof item?.amount_cents === "number") {
      if (item.default === true) defaultIndex = cents.length;
      cents.push(item.amount_cents);
    }
  });
  if (cents.length === 0) return { text: fallback, defaultIndex: 1 };
  return {
    text: cents.map((amount) => String(amount / 100)).join(", "),
    defaultIndex,
  };
}

function parseAmounts(text: string): number[] | null {
  const parts = text.split(",").map((part) => part.trim()).filter(Boolean);
  const cents = parts.map((part) => parseEurosToCents(part));
  return cents.every((value): value is number => value !== null && value >= 100)
    ? (cents as number[])
    : null;
}

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function fromDateInput(value: string, endOfDay: boolean): string | null {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const inputClass =
  "mt-1 w-full rounded-lg border-[1.5px] border-line bg-paper px-3 py-2.5 text-[15px] outline-none focus:border-sea";
const labelClass = "text-[13.5px] font-semibold";

function CampaignForm({
  campaign,
  chapters,
  onDone,
  extra = null,
}: {
  campaign: CampaignRow | null;
  chapters: Option[];
  onDone: () => void;
  /** Admin-only buttons for an existing cause: the test flag and Delete, at the end of the footer. */
  extra?: ReactNode;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const oneoffInit = readSet(campaign?.suggested_amounts, "oneoff", "10, 25, 50");
  const monthlyInit = readSet(campaign?.suggested_amounts, "monthly", "5, 10, 20");
  const [title, setTitle] = useState(campaign?.title ?? "");
  const [slug, setSlug] = useState(campaign?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(campaign));
  const [chapterId, setChapterId] = useState(campaign?.chapter_id ?? chapters[0]?.id ?? "");
  const [description, setDescription] = useState(campaign?.description ?? "");
  const [goal, setGoal] = useState(campaign?.goal_cents ? String(campaign.goal_cents / 100) : "");
  const [startsAt, setStartsAt] = useState(toDateInput(campaign?.starts_at ?? null));
  const [endsAt, setEndsAt] = useState(toDateInput(campaign?.ends_at ?? null));
  const [summary, setSummary] = useState(campaign?.beneficiary_summary ?? "");
  const [isPublic, setIsPublic] = useState(campaign?.is_public ?? false);
  const [coverPath, setCoverPath] = useState<string | null>(campaign?.cover_path ?? null);
  const [coverFolder] = useState(() => `covers/causes/${campaign?.id ?? `new-${crypto.randomUUID()}`}`);
  const [formId] = useState(() => `camp-${Math.random().toString(36).slice(2, 8)}`);
  const [oneoff, setOneoff] = useState(oneoffInit.text);
  const [oneoffDefault, setOneoffDefault] = useState(oneoffInit.defaultIndex);
  const [monthly, setMonthly] = useState(monthlyInit.text);
  const [monthlyDefault, setMonthlyDefault] = useState(monthlyInit.defaultIndex);
  const [state, setState] = useState<"idle" | "busy" | "error" | "slug" | "invalid">("idle");

  const previewCampaign = {
    slug: slug || slugify(title) || "kampanja",
    title,
    description: description.trim() || null,
    beneficiary_summary: summary.trim() || null,
    goal_cents: goal.trim() === "" ? null : parseEurosToCents(goal),
    raised_cents: campaign?.raised_cents ?? 0,
    donor_count: 0,
    starts_at: fromDateInput(startsAt, false),
    ends_at: fromDateInput(endsAt, true),
    chapter_name: chapters.find((chapter) => chapter.id === chapterId)?.name ?? null,
    events: [],
    cover_path: coverPath,
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const oneoffCents = parseAmounts(oneoff);
    const monthlyCents = parseAmounts(monthly);
    const goalCents = goal.trim() === "" ? null : parseEurosToCents(goal);
    if (!oneoffCents || !monthlyCents || (goal.trim() !== "" && goalCents === null)) {
      setState("invalid");
      return;
    }
    setState("busy");
    const result = await saveCampaign({
      id: campaign?.id,
      title,
      slug: slug || slugify(title),
      chapterId,
      description: description.trim() || null,
      goalCents,
      startsAt: fromDateInput(startsAt, false),
      endsAt: fromDateInput(endsAt, true),
      beneficiarySummary: summary.trim() || null,
      isPublic,
      coverPath,
      oneoffCents,
      oneoffDefaultIndex: Math.min(oneoffDefault, oneoffCents.length - 1),
      monthlyCents,
      monthlyDefaultIndex: Math.min(monthlyDefault, monthlyCents.length - 1),
    }).catch(() => ({ ok: false as const, error: "server" as const }));
    if (result.ok) {
      router.refresh();
      onDone();
    } else {
      setState(result.error === "slug" ? "slug" : result.error === "invalid" ? "invalid" : "error");
    }
  };

  const defaultPicker = (
    id: string,
    text: string,
    value: number,
    onChange: (index: number) => void,
  ) => {
    const options = text.split(",").map((part) => part.trim()).filter(Boolean);
    return (
      <select
        id={id}
        value={Math.min(value, Math.max(0, options.length - 1))}
        onChange={(event) => onChange(Number(event.target.value))}
        className={inputClass}
      >
        {options.map((option, index) => (
          <option key={`${option}-${index}`} value={index}>
            {option} €
          </option>
        ))}
      </select>
    );
  };

  return (
    <div>
    <form id={formId} onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="cTitle" className={labelClass}>
            {t("postTitle")}
          </label>
          <input
            id="cTitle"
            type="text"
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="cSlug" className={labelClass}>
            {t("postSlug")}
          </label>
          <input
            id="cSlug"
            type="text"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className={`${inputClass} font-mono`}
          />
        </div>
        <div>
          <label htmlFor="cChapter" className={labelClass}>
            {t("disbChapter")}
          </label>
          <select
            id="cChapter"
            required
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
            className={inputClass}
          >
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="cDescription" className={labelClass}>
            {t("campDescription")}
          </label>
          <textarea
            id="cDescription"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="cSummary" className={labelClass}>
            {t("campBeneficiary")}
          </label>
          <textarea
            id="cSummary"
            rows={2}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="cGoal" className={labelClass}>
            {t("campGoal")}
          </label>
          <input
            id="cGoal"
            type="text"
            inputMode="numeric"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className={`${inputClass} font-mono`}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="cStarts" className={labelClass}>
              {t("campStarts")}
            </label>
            <input
              id="cStarts"
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="cEnds" className={labelClass}>
              {t("campEnds")}
            </label>
            <input
              id="cEnds"
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor="cOneoff" className={labelClass}>
            {t("campOneoff")}
          </label>
          <input
            id="cOneoff"
            type="text"
            value={oneoff}
            onChange={(e) => setOneoff(e.target.value)}
            className={`${inputClass} font-mono`}
          />
        </div>
        <div>
          <label htmlFor="cOneoffDefault" className={labelClass}>
            {t("campDefault")}
          </label>
          {defaultPicker("cOneoffDefault", oneoff, oneoffDefault, setOneoffDefault)}
        </div>
        <div>
          <label htmlFor="cMonthly" className={labelClass}>
            {t("campMonthly")}
          </label>
          <input
            id="cMonthly"
            type="text"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            className={`${inputClass} font-mono`}
          />
        </div>
        <div>
          <label htmlFor="cMonthlyDefault" className={labelClass}>
            {t("campDefault")}
          </label>
          {defaultPicker("cMonthlyDefault", monthly, monthlyDefault, setMonthlyDefault)}
        </div>
        <label className="flex items-center gap-2 text-[14.5px] sm:col-span-2">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 accent-red"
          />
          {t("campPublic")}
        </label>
        <div className="sm:col-span-2">
          <CoverField value={coverPath} onChange={setCoverPath} folder={coverFolder} />
        </div>
      </div>
      <p className="mt-2 text-[13px] text-black/55">{t("campAmountsHint")}</p>

      {state === "error" ? (
        <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">
          {t("actionError")}
        </p>
      ) : null}
      {state === "slug" ? (
        <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">
          {t("evSlugTaken")}
        </p>
      ) : null}
      {state === "invalid" ? (
        <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">
          {t("evInvalid")}
        </p>
      ) : null}

      <PreviewFrame liveHref={campaign?.is_public ? `/kampanje/${campaign.slug}` : null}>
        <CampaignPageView campaign={previewCampaign} preview />
      </PreviewFrame>
    </form>

    {campaign ? (
      <div className="mt-6 border-t-[0.5px] border-line pt-5">
        <p className={labelClass}>{t("galleryHeading")}</p>
        <p className="text-[13px] text-black/55">{t("galleryHint")}</p>
        <div className="mt-3">
          <GalleryManager items={campaign.gallery} scope={{ campaignId: campaign.id }} inline />
        </div>
      </div>
    ) : null}

    <div className="sticky bottom-0 -mx-5 mt-6 flex gap-2 border-t-[0.5px] border-line bg-paper px-5 py-3 shadow-[0_-8px_24px_rgba(14,58,70,0.08)] sm:-mx-6 sm:px-6">
      <button
        type="submit"
        form={formId}
        disabled={state === "busy"}
        className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {campaign ? t("evSave") : t("campCreate")}
      </button>
      <button
        type="button"
        onClick={onDone}
        className="rounded-lg bg-paper px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:bg-mist-2"
      >
        {t("cancel")}
      </button>
      {extra ? <span className="ml-auto flex flex-wrap items-center gap-2">{extra}</span> : null}
    </div>
    </div>
  );
}

/** Cause list: one row each, filter by status and chapter, the row opens the editor. */
export function CampaignsManager({
  locale,
  campaigns,
  chapters,
  title,
  lead,
  initialOpenId = "",
  canManage = false,
}: {
  /** Left out inside the section: the layout draws the title, the action goes up to it. */
  title?: string;
  lead?: string;
  locale: Locale;
  campaigns: CampaignRow[];
  /** Admin: deleting and the test flag are theirs (delete_campaign, set_record_test). */
  canManage?: boolean;
  chapters: Option[];
  /** A cause to open straight away, e.g. from a year report's "Edit cause". */
  initialOpenId?: string;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [open, setOpen] = useState<"" | "new" | string>(campaigns.some((c) => c.id === initialOpenId) ? initialOpenId : "");
  const [busy, setBusy] = useState(false);
  const openCampaign = campaigns.find((candidate) => candidate.id === open) ?? null;
  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });
  const chapterName = new Map(chapters.map((c) => [c.id, c.name]));

  const dialog = useDialog();
  const setCompleted = async (ids: string[], completed: boolean, clear?: () => void) => {
    if (completed && !(await dialog.confirm(t("caCompleteConfirm", { count: ids.length }), { danger: false, confirmLabel: t("caMarkCompleted") }))) return;
    setBusy(true);
    const result = await setCampaignsCompleted({ ids, completed }).catch(() => null);
    setBusy(false);
    if (!result?.ok) {
      await dialog.alert(t("actionError"));
      return;
    }
    clear?.();
    router.refresh();
  };
  const setPublic = async (ids: string[], isPublic: boolean, clear?: () => void) => {
    setBusy(true);
    await setCampaignsPublic({ ids, isPublic }).catch(() => null);
    setBusy(false);
    clear?.();
    router.refresh();
  };
  // Deleting is for a cause added by mistake; the database refuses one
  // with donations, hand-overs, pages or teams and says why.
  const [notice, setNotice] = useState<string[]>([]);
  const isTest = (id: string) => Boolean(campaigns.find((c) => c.id === id)?.is_test);
  const remove = async (ids: string[], clear: () => void) => {
    if (!(await dialog.confirm(t("caDeleteConfirm", { count: ids.length })))) return;
    setBusy(true);
    setNotice([]);
    const result = await deleteCampaigns({ ids }).catch(() => null);
    setBusy(false);
    if (!result?.ok) {
      await dialog.alert(t("actionError"), result?.detail);
      return;
    }
    setNotice(result.blocked.map((b) => t("caDeleteBlocked", { name: b.name, reason: t(`caDeleteReason_${b.reason}`, { count: b.count }) })));
    clear();
    if (ids.includes(open) && !result.blocked.length) setOpen("");
    router.refresh();
  };

  const columns: Column<CampaignRow>[] = [
    {
      key: "title",
      header: t("table.colTitle"),
      cell: (c) => <span className="block max-w-[260px] truncate font-semibold">{c.title}</span>,
      sort: (c) => c.title,
    },
    {
      key: "status",
      header: t("table.colStatus"),
      cell: (c) => (
        <span className="inline-flex items-center gap-1.5">
          {c.is_public ? <Chip tone="sea">{t("campPublicBadge")}</Chip> : <Chip>{t("postDraft")}</Chip>}
          {c.completed_at ? <Chip tone="ink">{t("caCompletedChip")}</Chip> : null}
          {c.is_test ? <Chip tone="red">{t("testChip")}</Chip> : null}
        </span>
      ),
      sort: (c) => (c.is_public ? 1 : 0),
      filter: {
        options: [
          { value: "public", label: t("campPublicBadge") },
          { value: "draft", label: t("postDraft") },
          { value: "completed", label: t("caCompletedChip") },
        ],
        match: (c, value) => (value === "completed" ? Boolean(c.completed_at) : value === "public" ? c.is_public : !c.is_public),
      },
    },
    {
      key: "chapter",
      header: t("table.colChapter"),
      cell: (c) => <span className="text-black/60">{chapterName.get(c.chapter_id) ?? "—"}</span>,
      sort: (c) => chapterName.get(c.chapter_id) ?? null,
      filter: {
        options: chapters.map((ch) => ({ value: ch.id, label: ch.name })),
        match: (c, value) => c.chapter_id === value,
      },
    },
    { key: "raised", header: t("table.colRaised"), align: "right", cell: (c) => money(c.raised_cents), sort: (c) => c.raised_cents },
    { key: "goal", header: t("table.colGoal"), align: "right", cell: (c) => (c.goal_cents ? money(c.goal_cents) : "—"), sort: (c) => c.goal_cents },
    { key: "events", header: t("table.colEvents"), align: "center", cell: (c) => c.events, sort: (c) => c.events },
    {
      key: "starts",
      header: t("table.colDate"),
      cell: (c) => <span className="font-mono tabular-nums text-black/60">{formatShortDate(c.starts_at, locale)}</span>,
      sort: (c) => c.starts_at,
    },
  ];

  return (
    <div className="space-y-4">
      {dialog.element}
      <PageHeader
        title={title}
        lead={lead}
        action={
          <button type="button" onClick={() => setOpen("new")} className="rounded-lg bg-red px-4 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-red-dark">
            + {t("campNew")}
          </button>
        }
      />
      <SidePanel
        open={open !== ""}
        title={open === "new" ? t("campNew") : (openCampaign?.title ?? "")}
        onClose={() => setOpen("")}
        wide
      >
        <CampaignForm
          key={open}
          campaign={openCampaign}
          chapters={chapters}
          onDone={() => setOpen("")}
          extra={canManage && openCampaign ? (
            <>
              <TestFlagButtons kind="campaign" ids={[openCampaign.id]} isTest={isTest} disabled={busy} className="rounded-lg bg-paper px-3 py-2 text-[14px] font-semibold transition-colors hover:bg-mist-2 disabled:opacity-60" />
              <button type="button" disabled={busy} onClick={() => void remove([openCampaign.id], () => undefined)} className="rounded-lg px-3 py-2 text-[14px] font-semibold text-red-dark transition-colors hover:bg-mist-2 disabled:opacity-60">
                {t("evDelete")}
              </button>
            </>
          ) : null}
        />
      </SidePanel>

      {notice.length > 0 ? (
        <div role="alert" className="rounded-lg bg-mist px-4 py-3 text-[14px] font-semibold text-red-dark">
          {notice.map((line) => <p key={line}>{line}</p>)}
        </div>
      ) : null}
      <DataTable
        rows={campaigns}
        getId={(c) => c.id}
        columns={columns}
        leading={(c) => <Thumb src={galleryImageUrl(c.cover_path ?? null)} initial={c.title.charAt(0).toUpperCase()} />}
        onOpen={(c) => setOpen(c.id)}
        searchText={(c) => `${c.title} ${c.slug} ${c.payment_reference}`}
        emptyLabel={t("campEmpty")}
        rowActions={(c) => (
          <>
            {c.is_public ? (
              <Link href={`/kampanje/${c.slug}`} target="_blank" className={iconButton} aria-label={t("table.view")} title={t("table.view")}>
                <ExternalIcon />
              </Link>
            ) : (
              <button type="button" onClick={() => setOpen(c.id)} className={iconButton} aria-label={t("previewShow")} title={t("previewShow")}>
                <EyeIcon />
              </button>
            )}
            <button type="button" disabled={busy} onClick={() => setPublic([c.id], !c.is_public)} className={rowButton}>
              {c.is_public ? t("galleryUnpublish") : t("galleryPublish")}
            </button>
          </>
        )}
        bulkActions={(ids, clear) => (
          <>
            <button type="button" disabled={busy} onClick={() => setPublic(ids, true, clear)} className={bulkButton}>{t("galleryPublish")}</button>
            <button type="button" disabled={busy} onClick={() => setPublic(ids, false, clear)} className={bulkButton}>{t("galleryUnpublish")}</button>
            <button type="button" disabled={busy} onClick={() => setCompleted(ids, true, clear)} className={bulkButton}>{t("caMarkCompleted")}</button>
            <button type="button" disabled={busy} onClick={() => setCompleted(ids, false, clear)} className={bulkButton}>{t("caReopen")}</button>
            {canManage ? <TestFlagButtons kind="campaign" ids={ids} isTest={isTest} clear={clear} disabled={busy} /> : null}
            {canManage ? <button type="button" disabled={busy} onClick={() => remove(ids, clear)} className={bulkButton}>{t("evDelete")}</button> : null}
          </>
        )}
      />
    </div>
  );
}
