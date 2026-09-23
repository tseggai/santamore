"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState, type FormEvent } from "react";

import { deleteSupporters, saveSponsorship, saveSupporter, setSupportersActive } from "@/app/[locale]/admin/(protected)/podrska/actions";
import type { Option } from "@/components/admin/EventForm";
import { downscaleToPng } from "@/lib/images";
import { formatCents, parseEurosToCents } from "@/lib/money";
import { Chip, DataTable, Thumb, bulkButton, rowButton, type Column } from "@/components/console/DataTable";
import { PageHeader } from "@/components/console/PageHeader";
import { SidePanel } from "@/components/console/SidePanel";
import { useDialog } from "@/components/console/useDialog";
import { TestFlagButtons } from "@/components/admin/TestFlagButtons";
import { supporterLogoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export interface SupporterRow {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  is_active: boolean;
  logo_path: string | null;
  kind: "sponsor" | "donor";
  is_test?: boolean;
}

export interface SponsorshipRow {
  id: string;
  supporter_id: string | null;
  tier: string | null;
  chapter_id: string | null;
  campaign_id: string | null;
  event_id: string | null;
  amount_cents: number | null;
  is_in_kind: boolean;
  status: "prospect" | "negotiating" | "signed" | "active" | "ended";
  year: number | null;
  fund: "operations" | "impact";
  is_test?: boolean;
}

interface OfferRow {
  id: string;
  supporter_id: string | null;
  title: string;
  reward_label: string;
  is_active: boolean;
  event_id: string | null;
}

const STATUSES = ["prospect", "negotiating", "signed", "active", "ended"] as const;
const inputClass =
  "mt-1 w-full rounded-lg border-[1.5px] border-line bg-paper px-3 py-2.5 text-[15px] outline-none focus:border-sea";
const labelClass = "text-[13.5px] font-semibold";
const ghost = "rounded-lg bg-paper px-3 py-1.5 text-[13.5px] font-semibold transition-colors hover:bg-mist-2";

/** The organisation itself: name, website, who to call. */
export function SupporterForm({
  supporter,
  onDone,
  onCreated,
  formId,
  campaigns = [],
  events = [],
}: {
  supporter: SupporterRow | null;
  onDone: () => void;
  onCreated?: (created: { id: string; name: string }) => void;
  /** When set, the panel renders the Save/Cancel footer for this form id. */
  formId?: string;
  /** For a new supporter: the cause or event their first gift goes on. */
  campaigns?: Option[];
  events?: Option[];
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [name, setName] = useState(supporter?.name ?? "");
  const [kind, setKind] = useState<SupporterRow["kind"]>(supporter?.kind ?? "sponsor");
  // A new supporter usually comes with a gift: amount and where, in one go.
  const [giftAmount, setGiftAmount] = useState("");
  const [giftInKind, setGiftInKind] = useState(false);
  const [giftTier, setGiftTier] = useState("");
  const [giftCampaignId, setGiftCampaignId] = useState("");
  const [giftEventId, setGiftEventId] = useState("");
  const [giftYear, setGiftYear] = useState(String(new Date().getFullYear()));
  const [website, setWebsite] = useState(supporter?.website ?? "");
  const [contactName, setContactName] = useState(supporter?.contact_name ?? "");
  const [contactEmail, setContactEmail] = useState(supporter?.contact_email ?? "");
  const [contactPhone, setContactPhone] = useState(supporter?.contact_phone ?? "");
  const [notes, setNotes] = useState(supporter?.notes ?? "");
  const [active, setActive] = useState(supporter?.is_active ?? true);
  const [logoPath, setLogoPath] = useState<string | null | undefined>(undefined);
  const [logoBusy, setLogoBusy] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  // A new supporter has no id yet; its logo lives under a fresh folder.
  const [logoFolder] = useState(() => supporter?.id ?? `new-${crypto.randomUUID()}`);
  const [state, setState] = useState<"idle" | "busy" | "error" | "invalid">("idle");
  const currentLogo = logoPath === undefined ? (supporter?.logo_path ?? null) : logoPath;

  // Logos go straight to the public bucket; the path is saved with the form.
  const uploadLogo = async (file: File) => {
    setLogoBusy(true);
    try {
      // PNG: a logo on a transparent background must stay transparent.
      const blob = await downscaleToPng(file, 800);
      const path = `${logoFolder}/logo-${Date.now()}.png`;
      const { error } = await createClient().storage.from("supporter-logos").upload(path, blob, { contentType: "image/png" });
      if (error) throw error;
      setLogoPath(path);
    } catch {
      setState("error");
    } finally {
      setLogoBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (state === "busy" || logoBusy) return;
    const giftCents = giftAmount.trim() === "" ? null : parseEurosToCents(giftAmount);
    if (giftAmount.trim() !== "" && giftCents === null) {
      setState("invalid");
      return;
    }
    const gift = !supporter && (giftCents !== null || giftInKind)
      ? {
          amountCents: giftInKind ? null : giftCents,
          isInKind: giftInKind,
          tier: giftTier.trim() || null,
          campaignId: giftCampaignId || null,
          eventId: giftEventId || null,
          year: /^\d{4}$/.test(giftYear.trim()) ? Number(giftYear.trim()) : new Date().getFullYear(),
        }
      : undefined;
    setState("busy");
    const result = await saveSupporter({
      id: supporter?.id,
      name,
      kind,
      website: website.trim() || null,
      contactName: contactName.trim() || null,
      contactEmail: contactEmail.trim() || null,
      contactPhone: contactPhone.trim() || null,
      notes: notes.trim() || null,
      isActive: active,
      ...(logoPath !== undefined ? { logoPath } : {}),
      ...(gift ? { sponsorship: gift } : {}),
    }).catch(() => ({ ok: false as const, error: "server" as const }));
    if (result.ok) {
      router.refresh();
      if (result.supporter && onCreated) onCreated(result.supporter);
      onDone();
    } else {
      setState(result.error === "invalid" ? "invalid" : "error");
    }
  };

  return (
    <form id={formId} onSubmit={submit}>
      <fieldset className="mb-4">
        <legend className={labelClass}>{t("suKind")}</legend>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
          {(["sponsor", "donor"] as const).map((value) => (
            <label key={value} className={`flex cursor-pointer items-start gap-2.5 rounded-lg px-3.5 py-3 text-[14.5px] ${kind === value ? "bg-paper ring-2 ring-sea" : "bg-paper/60 hover:bg-paper"}`}>
              <input type="radio" name="suKind" value={value} checked={kind === value} onChange={() => setKind(value)} className="mt-1 h-4 w-4 accent-red" />
              <span>
                <span className="block font-bold">{t(`suKindValue.${value}`)}</span>
                <span className="block text-[13.5px] text-black/60">{t(`suKindHint.${value}`)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="suName" className={labelClass}>{kind === "donor" ? t("suNameDonor") : t("suName")}</label>
          <input id="suName" type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="suWebsite" className={labelClass}>{t("spWebsite")}</label>
          <input id="suWebsite" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" className={inputClass} />
        </div>
        <div>
          <label htmlFor="suContact" className={labelClass}>{t("suContact")}</label>
          <input id="suContact" type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="suEmail" className={labelClass}>{t("suEmail")}</label>
          <input id="suEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="suPhone" className={labelClass}>{t("suPhone")}</label>
          <input id="suPhone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="suNotes" className={labelClass}>{t("suNotes")}</label>
          <textarea id="suNotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          {currentLogo ? (
            // eslint-disable-next-line @next/next/no-img-element -- public bucket, arbitrary sizes
            <img src={supporterLogoUrl(currentLogo) ?? ""} alt="" className="h-14 w-14 rounded-lg bg-paper object-contain" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-paper text-[20px] font-bold text-black/40">{name.charAt(0).toUpperCase() || "?"}</span>
          )}
          <div className="text-[14px] font-semibold">
            <span className="block">{t("suLogo")}</span>
            <input
              ref={logoInput}
              id="suLogoFile"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadLogo(file);
              }}
            />
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <button type="button" disabled={logoBusy} onClick={() => logoInput.current?.click()} className="rounded-lg bg-paper px-3 py-1.5 text-[13.5px] font-semibold transition-colors hover:bg-mist-2 disabled:opacity-60">
                {logoBusy ? t("photoUploading") : currentLogo ? t("suLogoReplace") : t("suLogoChoose")}
              </button>
              {currentLogo ? (
                <button type="button" disabled={logoBusy} onClick={() => setLogoPath(null)} className="text-[13px] font-semibold text-black/60 underline underline-offset-2 hover:text-sea">
                  {t("suLogoRemove")}
                </button>
              ) : null}
            </div>
            <span className="mt-1 block text-[13px] font-normal text-black/55">{t("suLogoHint")}</span>
          </div>
        </div>
        <label className="flex items-center gap-2 text-[14.5px] sm:col-span-2">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-red" />
          {t("suActive")}
        </label>
      </div>
      {supporter ? null : (
        <fieldset className="mt-5 rounded-lg bg-paper p-4">
          <legend className="px-1 text-[14.5px] font-bold">{t("suGiftHeading")}</legend>
          <p className="text-[13.5px] text-black/60">{t("suGiftHint")}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="suGiftAmount" className={labelClass}>{t("spAmount")}</label>
              <input id="suGiftAmount" type="text" inputMode="decimal" value={giftAmount} onChange={(e) => setGiftAmount(e.target.value)} disabled={giftInKind} placeholder="500" className={`${inputClass} font-mono disabled:opacity-50`} />
            </div>
            <div>
              <label htmlFor="suGiftYear" className={labelClass}>{t("spYear")}</label>
              <input id="suGiftYear" type="text" inputMode="numeric" pattern="[0-9]{4}" value={giftYear} onChange={(e) => setGiftYear(e.target.value)} className={`${inputClass} font-mono`} />
            </div>
            <div>
              <label htmlFor="suGiftTier" className={labelClass}>{t("spTier")}</label>
              <input id="suGiftTier" type="text" value={giftTier} onChange={(e) => setGiftTier(e.target.value)} placeholder={t("spTierHint")} className={inputClass} />
            </div>
            <div>
              <label htmlFor="suGiftCampaign" className={labelClass}>{t("spCampaign")}</label>
              <select id="suGiftCampaign" value={giftCampaignId} onChange={(e) => setGiftCampaignId(e.target.value)} className={inputClass}>
                <option value="">—</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="suGiftEvent" className={labelClass}>{t("spEvent")}</label>
              <select id="suGiftEvent" value={giftEventId} onChange={(e) => setGiftEventId(e.target.value)} className={inputClass}>
                <option value="">—</option>
                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-[14.5px] sm:col-span-2">
              <input type="checkbox" checked={giftInKind} onChange={(e) => setGiftInKind(e.target.checked)} className="h-4 w-4 accent-red" />
              {t("spInKind")}
            </label>
          </div>
        </fieldset>
      )}
      {state === "error" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("actionError")}</p> : null}
      {state === "invalid" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("evInvalid")}</p> : null}
      {formId ? null : (
        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={state === "busy" || logoBusy} className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60">
            {supporter ? t("evSave") : t("suCreate")}
          </button>
          <button type="button" onClick={onDone} className="rounded-lg bg-paper px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:bg-mist-2">
            {t("cancel")}
          </button>
        </div>
      )}
    </form>
  );
}

/** One deal: money or in kind, on a cause or an event, with its pipeline status. */
function SponsorshipForm({
  supporterId,
  sponsorship,
  chapters,
  campaigns,
  events,
  onDone,
}: {
  supporterId: string;
  sponsorship: SponsorshipRow | null;
  chapters: Option[];
  campaigns: Option[];
  events: Option[];
  onDone: () => void;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [tier, setTier] = useState(sponsorship?.tier ?? "");
  const [chapterId, setChapterId] = useState(sponsorship?.chapter_id ?? "");
  const [campaignId, setCampaignId] = useState(sponsorship?.campaign_id ?? "");
  const [eventId, setEventId] = useState(sponsorship?.event_id ?? "");
  const [amount, setAmount] = useState(sponsorship?.amount_cents ? String(sponsorship.amount_cents / 100) : "");
  const [year, setYear] = useState(sponsorship?.year != null ? String(sponsorship.year) : String(new Date().getFullYear()));
  const [fund, setFund] = useState<SponsorshipRow["fund"]>(sponsorship?.fund ?? "operations");
  const [inKind, setInKind] = useState(sponsorship?.is_in_kind ?? false);
  const [status, setStatus] = useState<SponsorshipRow["status"]>(sponsorship?.status ?? "signed");
  const [state, setState] = useState<"idle" | "busy" | "error" | "invalid">("idle");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amountCents = inKind || amount.trim() === "" ? null : parseEurosToCents(amount);
    if (!inKind && amount.trim() !== "" && amountCents === null) {
      setState("invalid");
      return;
    }
    setState("busy");
    const result = await saveSponsorship({
      id: sponsorship?.id,
      supporterId,
      tier: tier.trim() || null,
      chapterId: chapterId || null,
      campaignId: campaignId || null,
      eventId: eventId || null,
      amountCents,
      isInKind: inKind,
      status,
      year: /^\d{4}$/.test(year.trim()) ? Number(year.trim()) : null,
      fund,
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
        <div>
          <label htmlFor="spAmount" className={labelClass}>{t("spAmount")}</label>
          <input id="spAmount" type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={inKind} placeholder="500" className={`${inputClass} font-mono disabled:opacity-50`} />
        </div>
        <label className="flex items-center gap-2 self-end pb-2.5 text-[14.5px]">
          <input type="checkbox" checked={inKind} onChange={(e) => setInKind(e.target.checked)} className="h-4 w-4 accent-red" />
          {t("spInKind")}
        </label>
        <div className="sm:col-span-2">
          <label htmlFor="spFund" className={labelClass}>{t("spFund")}</label>
          <select id="spFund" value={fund} onChange={(e) => setFund(e.target.value as SponsorshipRow["fund"])} disabled={inKind} className={`${inputClass} disabled:opacity-50`}>
            <option value="operations">{t("spFundValue.operations")}</option>
            <option value="impact">{t("spFundValue.impact")}</option>
          </select>
          <p className="mt-1 text-[13px] text-black/50">{t("spFundHint")}</p>
        </div>
        <div>
          <label htmlFor="spCampaign" className={labelClass}>{t("spCampaign")}</label>
          <select id="spCampaign" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className={inputClass}>
            <option value="">—</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="spEvent" className={labelClass}>{t("spEvent")}</label>
          <select id="spEvent" value={eventId} onChange={(e) => setEventId(e.target.value)} className={inputClass}>
            <option value="">—</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="spYear" className={labelClass}>{t("spYear")}</label>
          <input id="spYear" type="text" inputMode="numeric" pattern="[0-9]{4}" required value={year} onChange={(e) => setYear(e.target.value)} className={`${inputClass} font-mono`} />
          <p className="mt-1 text-[13px] text-black/50">{t("spYearHint")}</p>
        </div>
        <div>
          <label htmlFor="spTier" className={labelClass}>{t("spTier")}</label>
          <input id="spTier" type="text" value={tier} onChange={(e) => setTier(e.target.value)} placeholder={t("spTierHint")} className={inputClass} />
        </div>
        <div>
          <label htmlFor="spStatus" className={labelClass}>{t("spStatus")}</label>
          <select id="spStatus" value={status} onChange={(e) => setStatus(e.target.value as SponsorshipRow["status"])} className={inputClass}>
            {STATUSES.map((s) => <option key={s} value={s}>{t(`spStatusValue.${s}`)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="spChapter" className={labelClass}>{t("disbChapter")}</label>
          <select id="spChapter" value={chapterId} onChange={(e) => setChapterId(e.target.value)} className={inputClass}>
            <option value="">—</option>
            {chapters.map((ch) => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
          </select>
        </div>
      </div>
      <p className="mt-2 text-[13px] text-black/55">{t("spOpsNote")}</p>
      {state === "error" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("actionError")}</p> : null}
      {state === "invalid" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("goalInvalidAdmin")}</p> : null}
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={state === "busy"} className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60">
          {sponsorship ? t("evSave") : t("spCreate")}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg bg-paper px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:bg-mist-2">
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}

/** Supporter list: one row each; the row opens details, deals and offers in the panel. */
export function SupportersManager({
  locale,
  supporters,
  sponsorships,
  offers,
  chapters,
  campaigns,
  events,
  title,
  lead,
  canManage = false,
}: {
  /** Left out inside a section: the layout draws the title, the action goes up to it. */
  title?: string;
  lead?: string;
  locale: Locale;
  /** Admin: the test flag is theirs (set_record_test). */
  canManage?: boolean;
  supporters: SupporterRow[];
  sponsorships: SponsorshipRow[];
  offers: OfferRow[];
  chapters: Option[];
  campaigns: Option[];
  events: Option[];
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [open, setOpen] = useState<"" | "new" | string>("");
  // The sponsorship form is its own overlay: for a row's "+ Sponsorship" and for edits inside the supporter panel.
  const [dealPanel, setDealPanel] = useState<{ supporterId: string; deal: SponsorshipRow | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const supporter = supporters.find((s) => s.id === open) ?? null;
  const campaignName = new Map(campaigns.map((c) => [c.id, c.name]));
  const eventName = new Map(events.map((e) => [e.id, e.name]));
  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });
  // The year in view: "all", or one year the deals name. Sponsorships and
  // Given follow it, and only supporters with a deal that year are listed.
  const [yearFilter, setYearFilter] = useState<"all" | number>("all");
  const dealYears = [...new Set(sponsorships.map((d) => d.year).filter((y): y is number => y != null))].sort((a, b) => b - a);
  const inYear = (d: SponsorshipRow) => yearFilter === "all" || d.year === yearFilter;
  const dealsOf = (id: string) => sponsorships.filter((d) => d.supporter_id === id && inYear(d));
  const offersOf = (id: string) => offers.filter((o) => o.supporter_id === id);
  const listed = yearFilter === "all" ? supporters : supporters.filter((s) => dealsOf(s.id).length > 0);
  const signedCents = (id: string) =>
    dealsOf(id)
      .filter((d) => (d.status === "signed" || d.status === "active") && !d.is_in_kind)
      .reduce((sum, d) => sum + (d.amount_cents ?? 0), 0);

  const openSupporter = (id: string) => setOpen(id);
  const close = () => setOpen("");
  const dealSupporter = dealPanel ? supporters.find((s) => s.id === dealPanel.supporterId) : null;
  const setActive = async (ids: string[], active: boolean, clear?: () => void) => {
    setBusy(true);
    await setSupportersActive({ ids, active }).catch(() => null);
    setBusy(false);
    clear?.();
    router.refresh();
  };
  // Deleting is for a supporter added by mistake; hiding one is "deactivate".
  const dialog = useDialog();
  const remove = async (ids: string[], clear?: () => void) => {
    if (!(await dialog.confirm(t("suDeleteConfirm", { count: ids.length })))) return;
    setBusy(true);
    const result = await deleteSupporters({ ids }).catch(() => null);
    setBusy(false);
    if (!result?.ok) {
      await dialog.alert(t("actionError"));
      return;
    }
    clear?.();
    if (ids.includes(open)) close();
    router.refresh();
  };

  const columns: Column<SupporterRow>[] = [
    {
      key: "name",
      header: t("table.colName"),
      cell: (s) => <span className="block max-w-[220px] truncate font-semibold">{s.name}</span>,
      sort: (s) => s.name,
    },
    {
      key: "kind",
      header: t("suKind"),
      cell: (s) => (s.kind === "donor" ? <Chip>{t("suKindValue.donor")}</Chip> : <Chip tone="sea">{t("suKindValue.sponsor")}</Chip>),
      sort: (s) => s.kind,
      filter: {
        options: [
          { value: "sponsor", label: t("suKindValue.sponsor") },
          { value: "donor", label: t("suKindValue.donor") },
        ],
        match: (s, value) => s.kind === value,
      },
    },
    {
      key: "status",
      header: t("table.colStatus"),
      cell: (s) => (
        <span className="inline-flex items-center gap-1.5">
          {s.is_active ? <Chip tone="sea">{t("table.statusActive")}</Chip> : <Chip>{t("suInactive")}</Chip>}
          {s.is_test ? <Chip tone="red">{t("testChip")}</Chip> : null}
        </span>
      ),
      sort: (s) => (s.is_active ? 1 : 0),
      filter: {
        options: [
          { value: "active", label: t("table.statusActive") },
          { value: "inactive", label: t("suInactive") },
        ],
        match: (s, value) => (value === "active" ? s.is_active : !s.is_active),
      },
    },
    {
      key: "deals",
      header: t("table.colSponsorships"),
      align: "center",
      cell: (s) => dealsOf(s.id).length || "—",
      sort: (s) => dealsOf(s.id).length,
      filter: {
        options: [
          { value: "deals", label: t("table.hasSponsorship") },
          { value: "none", label: t("table.hasNeither") },
        ],
        match: (s, value) =>
          value === "deals" ? dealsOf(s.id).length > 0 : value === "offers" ? offersOf(s.id).length > 0 : dealsOf(s.id).length === 0 && offersOf(s.id).length === 0,
      },
    },
    {
      key: "signed",
      header: t("table.colSigned"),
      align: "right",
      cell: (s) => (signedCents(s.id) > 0 ? money(signedCents(s.id)) : "—"),
      sort: (s) => signedCents(s.id),
    },
    {
      key: "website",
      header: t("table.colWebsite"),
      cell: (s) =>
        s.website ? (
          <a href={s.website} target="_blank" rel="noopener" className="block max-w-[180px] truncate text-black/60 underline underline-offset-2 hover:text-sea">
            {s.website.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          <span className="text-black/40">—</span>
        ),
      sort: (s) => s.website,
    },
    {
      key: "contact",
      header: t("table.colContact"),
      cell: (s) => (
        <span className="block max-w-[240px] truncate text-black/60">
          {[s.contact_name, s.contact_email, s.contact_phone].filter(Boolean).join(" · ") || "—"}
        </span>
      ),
      sort: (s) => s.contact_name,
    },
  ];

  const deals = supporter ? dealsOf(supporter.id) : [];
  const theirOffers = supporter ? offersOf(supporter.id) : [];

  return (
    <div className="space-y-4">
      {dialog.element}
      <PageHeader
        title={title}
        lead={lead}
        action={
          <button type="button" onClick={() => openSupporter("new")} className="rounded-lg bg-red px-4 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-red-dark">
            + {t("suNew")}
          </button>
        }
      />

      <SidePanel open={open !== ""} title={open === "new" ? t("suNew") : (supporter?.name ?? "")} onClose={close} wide>
        <div>
          <SupporterForm key={open} supporter={supporter} onDone={close} formId="supporter-form" campaigns={campaigns} events={events} />

          {supporter ? (
            <>
              <div className="mt-6 border-t-[0.5px] border-line pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={labelClass}>
                    {t("suDealsHeading")}
                    {signedCents(supporter.id) > 0 ? (
                      <span className="ml-2 font-mono text-[14px] font-bold tabular-nums text-sea">{t("suGiven", { amount: money(signedCents(supporter.id)) })}</span>
                    ) : null}
                  </p>
                  <button type="button" onClick={() => setDealPanel({ supporterId: supporter.id, deal: null })} className={ghost}>+ {t("spNew")}</button>
                </div>
                {deals.length === 0 ? (
                  <p className="mt-2 text-[14px] text-black/60">{t("suDealsEmpty")}</p>
                ) : null}
                {deals.length > 0 ? (
                  <ul className="mt-3 space-y-1.5">
                    {deals.map((deal) => (
                      <li key={deal.id} className="rounded-lg bg-paper px-3.5 py-2.5 text-[14px]">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <Chip tone={deal.status === "active" || deal.status === "signed" ? "sea" : "paper"}>{t(`spStatusValue.${deal.status}`)}</Chip>
                          {deal.is_test ? <Chip tone="red">{t("testChip")}</Chip> : null}
                          {deal.tier ? <span className="font-semibold">{deal.tier}</span> : null}
                          {deal.amount_cents ? (
                            <span className="font-mono tabular-nums">
                              {money(deal.amount_cents)}
                              {deal.is_in_kind ? ` · ${t("spInKindShort")}` : ""}
                            </span>
                          ) : deal.is_in_kind ? <span>{t("spInKindShort")}</span> : null}
                          <span className="text-black/60">
                            {deal.campaign_id ? campaignName.get(deal.campaign_id) : null}
                            {deal.campaign_id && deal.event_id ? " · " : ""}
                            {deal.event_id ? eventName.get(deal.event_id) : null}
                          </span>
                          <button type="button" onClick={() => setDealPanel({ supporterId: supporter.id, deal })} className={`ml-auto ${rowButton} bg-mist`}>
                            {t("evEdit")}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="mt-6 border-t-[0.5px] border-line pt-5">
                <p className={labelClass}>{t("suOffersHeading")}</p>
                {theirOffers.length === 0 ? (
                  <p className="mt-2 text-[14px] text-black/60">{t("suOffersEmpty")}</p>
                ) : (
                  <ul className="mt-3 space-y-1.5">
                    {theirOffers.map((offer) => (
                      <li key={offer.id} className="flex flex-wrap items-center gap-x-3 rounded-lg bg-paper px-3.5 py-2.5 text-[14px]">
                        <span className="font-semibold">{offer.reward_label}</span>
                        <span className="text-black/60">{offer.title}</span>
                        <Chip tone={offer.is_active ? "sea" : "paper"}>{offer.is_active ? t("perkActiveBadge") : t("postDraft")}</Chip>
                        <Link href="/admin/dogadjaji" className="ml-auto text-[13px] font-semibold text-sea underline underline-offset-2">
                          {t("suOfferOnEvent")}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}

          <div className="sticky bottom-0 -mx-5 mt-6 flex gap-2 border-t-[0.5px] border-line bg-paper px-5 py-3 shadow-[0_-8px_24px_rgba(14,58,70,0.08)] sm:-mx-6 sm:px-6">
            <button type="submit" form="supporter-form" className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90">
              {supporter ? t("evSave") : t("suCreate")}
            </button>
            <button type="button" onClick={close} className="rounded-lg bg-paper px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:bg-mist-2">
              {t("cancel")}
            </button>
            {supporter ? (
              <button type="button" disabled={busy} onClick={() => remove([supporter.id])} className="ml-auto rounded-lg px-3 py-2.5 text-[14.5px] font-semibold text-red-dark transition-colors hover:bg-mist-2 disabled:opacity-60">
                {t("suDelete")}
              </button>
            ) : null}
          </div>
        </div>
      </SidePanel>

      <SidePanel
        open={dealPanel !== null}
        title={dealPanel?.deal ? t("spEditTitle") : `${t("spNew")}${dealSupporter ? ` · ${dealSupporter.name}` : ""}`}
        onClose={() => setDealPanel(null)}
      >
        {dealPanel ? (
          <SponsorshipForm
            key={dealPanel.deal?.id ?? `new:${dealPanel.supporterId}`}
            supporterId={dealPanel.supporterId}
            sponsorship={dealPanel.deal}
            chapters={chapters}
            campaigns={campaigns}
            events={events}
            onDone={() => setDealPanel(null)}
          />
        ) : null}
      </SidePanel>

      <DataTable
        rows={listed}
        getId={(s) => s.id}
        columns={columns}
        leading={(s) => <Thumb src={supporterLogoUrl(s.logo_path)} initial={s.name.charAt(0).toUpperCase()} />}
        onOpen={(s) => openSupporter(s.id)}
        searchText={(s) => `${s.name} ${s.website ?? ""} ${s.contact_name ?? ""} ${s.contact_email ?? ""}`}
        emptyLabel={t("suEmpty")}
        filterSlot={
          <label className="inline-flex items-center gap-2 text-[14px]">
            <span className="text-black/60">{t("spYear")}</span>
            <select
              value={String(yearFilter)}
              onChange={(e) => setYearFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="rounded-lg bg-mist px-3 py-2 text-[14px] font-semibold outline-none ring-sea/40 focus:ring-2"
            >
              <option value="all">{t("spYearAll")}</option>
              {dealYears.map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </label>
        }
        rowActions={(s) => (
          <button type="button" onClick={() => setDealPanel({ supporterId: s.id, deal: null })} className={rowButton}>+ {t("spNew")}</button>
        )}
        bulkActions={(ids, clear) => (
          <>
            <button type="button" disabled={busy} onClick={() => setActive(ids, true, clear)} className={bulkButton}>{t("table.activate")}</button>
            <button type="button" disabled={busy} onClick={() => setActive(ids, false, clear)} className={bulkButton}>{t("table.deactivate")}</button>
            {canManage ? <TestFlagButtons kind="supporter" ids={ids} isTest={(id) => Boolean(supporters.find((s) => s.id === id)?.is_test)} clear={clear} disabled={busy} /> : null}
            <button type="button" disabled={busy} onClick={() => remove(ids, clear)} className={`${bulkButton} text-red-dark`}>{t("suDelete")}</button>
          </>
        )}
      />
    </div>
  );
}
