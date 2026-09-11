"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { saveCampaign } from "@/app/[locale]/admin/(protected)/kampanje/actions";
import type { Option } from "@/components/admin/EventForm";
import { PreviewFrame } from "@/components/admin/PreviewFrame";
import { CampaignPageView } from "@/components/campaigns/CampaignPageView";
import { formatCents, parseEurosToCents } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export interface CampaignRow {
  id: string;
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
}: {
  campaign: CampaignRow | null;
  chapters: Option[];
  onDone: () => void;
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
    <form
      onSubmit={submit}
      className="rounded-brand border-[1.5px] border-line bg-mist/40 p-4 sm:p-5"
    >
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
      </div>
      <p className="mt-2 text-[13px] text-ink/55">{t("campAmountsHint")}</p>

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

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={state === "busy"}
          className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {campaign ? t("evSave") : t("campCreate")}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border-[1.5px] border-line px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:border-sea hover:text-sea"
        >
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}

/** Campaign list with inline create/edit (one form open at a time). */
export function CampaignsManager({
  locale,
  campaigns,
  chapters,
}: {
  locale: Locale;
  campaigns: CampaignRow[];
  chapters: Option[];
}) {
  const t = useTranslations("admin");
  const [open, setOpen] = useState<"" | "new" | string>("");
  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });

  return (
    <div className="mt-5 space-y-4">
      {open === "new" ? (
        <CampaignForm campaign={null} chapters={chapters} onDone={() => setOpen("")} />
      ) : (
        <button
          type="button"
          onClick={() => setOpen("new")}
          className="rounded-lg bg-red px-4 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-red-dark"
        >
          + {t("campNew")}
        </button>
      )}

      {campaigns.length === 0 ? (
        <p className="text-[14.5px] text-ink/60">{t("campEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {campaigns.map((campaign) => (
            <li key={campaign.id} className="rounded-brand border-[1.5px] border-line px-4 py-3.5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[15.5px] font-bold">
                    {campaign.is_public ? (
                      <Link href={`/kampanje/${campaign.slug}`} className="hover:underline">
                        {campaign.title}
                      </Link>
                    ) : (
                      campaign.title
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${
                        campaign.is_public
                          ? "bg-sea text-paper"
                          : "border border-line text-ink/60"
                      }`}
                    >
                      {campaign.is_public ? t("campPublicBadge") : t("postDraft")}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[13.5px] text-ink/60">
                    <span className="font-mono">{campaign.payment_reference}</span>
                    {" · "}
                    {t("campRaised", { amount: money(campaign.raised_cents) })}
                    {campaign.goal_cents ? <> / {money(campaign.goal_cents)}</> : null}
                    {" · "}
                    {t("campEvents", { count: campaign.events })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(open === campaign.id ? "" : campaign.id)}
                  className="rounded-lg border-[1.5px] border-line px-2.5 py-1 text-[13px] font-semibold hover:border-sea hover:text-sea"
                >
                  {t("evEdit")}
                </button>
              </div>
              {open === campaign.id ? (
                <div className="mt-3">
                  <CampaignForm
                    campaign={campaign}
                    chapters={chapters}
                    onDone={() => setOpen("")}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
