"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent, type ReactNode } from "react";

import {
  addLiveProspects,
  applyProspectCheck,
  checkProspectLive,
  findLiveProspects,
  searchGoogleProspects,
  type LiveSearchResult,
} from "@/app/[locale]/admin/(protected)/podrska/prospekti/actions";
import { GOOGLE_DEPTHS, GOOGLE_SECTORS, GOOGLE_TOWNS, planSearches, type LiveCandidate, type ResearchCheck } from "@/lib/prospect-live";
import { PROSPECT_AREAS, PROSPECT_KINDS, type ProspectArea, type ProspectKind, type ProspectRow, type ProspectSector } from "@/lib/prospects";

const inputClass = "mt-1 w-full rounded-lg bg-paper px-3.5 py-2.5 text-[15px] outline-none ring-sea/40 focus:ring-2";
const chipBase = "rounded-full px-3.5 py-1.5 text-[14px] font-semibold transition-colors";
const primary = "rounded-lg bg-red px-5 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-red-dark disabled:opacity-50";
const ghost = "rounded-lg bg-paper px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:bg-mist-2 disabled:opacity-50";
const MAX_SEARCHES = 12;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`${chipBase} ${active ? "bg-sea text-paper" : "bg-paper text-black/80 hover:bg-mist-2"}`}>
      {children}
    </button>
  );
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Says what is missing when a live source has no key, in place of its form. */
function NotSetUp({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-sand px-4 py-3.5 text-[14.5px] leading-relaxed">{children}</p>;
}

type SearchError = Extract<LiveSearchResult, { ok: false }>;

/**
 * The finds of a live search, to pick from before anything joins the list:
 * one that is already there is shown and cannot be picked twice.
 */
function CandidatePicker({ candidates, kind, google, onAdded, onBack }: { candidates: LiveCandidate[]; kind: ProspectKind; google: boolean; onAdded: (added: number) => void; onBack: () => void }) {
  const t = useTranslations("admin.prospects");
  const fresh = candidates.filter((c) => !c.exists);
  const [picked, setPicked] = useState<string[]>(fresh.map((c) => c.ref));
  const [enrich, setEnrich] = useState(true);
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");

  const add = async () => {
    setState("busy");
    const items = candidates.filter((c) => picked.includes(c.ref)).map((candidate) => {
      const { exists, ...item } = candidate;
      void exists;
      return item;
    });
    const result = await addLiveProspects({ kind, enrich: google && enrich, items }).catch(() => ({ ok: false as const, error: "server" as const }));
    if (!result.ok) {
      setState("error");
      return;
    }
    onAdded(result.added ?? 0);
  };

  if (candidates.length === 0) {
    return (
      <div>
        <p className="text-[14.5px] text-black/65">{t("liveNone")}</p>
        <button type="button" onClick={onBack} className={`${ghost} mt-3`}>{t("liveBack")}</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-[15.5px] font-bold">{t("liveFound", { count: candidates.length, fresh: fresh.length })}</p>
        <p className="flex gap-3 text-[14px]">
          <button type="button" onClick={() => setPicked(fresh.map((c) => c.ref))} className="font-semibold text-sea underline-offset-2 hover:underline">{t("pickAll")}</button>
          <button type="button" onClick={() => setPicked([])} className="font-semibold text-sea underline-offset-2 hover:underline">{t("pickNone")}</button>
        </p>
      </div>
      <ul className="mt-3 space-y-2">
        {candidates.map((c) => (
          <li key={c.ref} className={`rounded-lg bg-paper px-4 py-3 ${c.exists ? "opacity-60" : ""}`}>
            <label className="flex items-start gap-3">
              <input type="checkbox" disabled={c.exists} checked={picked.includes(c.ref)} onChange={() => setPicked((list) => toggle(list, c.ref))} className="mt-1 h-4 w-4 shrink-0 accent-red" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-[15.5px] font-bold leading-snug">{c.name}</span>
                  {c.exists ? <span className="rounded-full bg-mist px-2 py-0.5 text-[13px] font-semibold text-black/70">{t("onListAlready")}</span> : null}
                </span>
                <span className="mt-0.5 block text-[14px] text-black/60">
                  {[t(`sector.${c.sector}`), c.town, c.rating !== null ? t("rating", { rating: c.rating.toFixed(1), count: c.rating_count ?? 0 }) : null].filter(Boolean).join(" · ")}
                </span>
                {c.contact_name ? <span className="mt-1 block text-[14.5px]"><span className="font-semibold">{c.contact_name}</span>{c.contact_role ? <span className="text-black/60">, {c.contact_role}</span> : null}</span> : null}
                {c.why ? <span className="mt-1 block text-[14.5px] leading-relaxed text-black/80">{c.why}</span> : null}
                <span className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[14px]">
                  {c.phone ? <span className="font-mono tabular-nums">{c.phone}</span> : null}
                  {c.email ? <span className="break-all">{c.email}</span> : null}
                  {c.website ? <a href={c.website} target="_blank" rel="noopener" className="text-sea underline-offset-2 hover:underline">{t("website")} ↗</a> : null}
                  {c.sources.filter((s) => s !== c.website).slice(0, 2).map((source, i) => (
                    <a key={source} href={source} target="_blank" rel="noopener" className="text-sea underline-offset-2 hover:underline">{t("sourceN", { n: i + 1 })} ↗</a>
                  ))}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      {google ? (
        <label className="mt-4 flex items-start gap-2.5 text-[14.5px]">
          <input type="checkbox" checked={enrich} onChange={(e) => setEnrich(e.target.checked)} className="mt-0.5 h-4 w-4 accent-red" />
          <span>
            <span className="font-semibold">{t("enrich")}</span>
            <span className="block text-[13.5px] text-black/55">{t("enrichHint")}</span>
          </span>
        </label>
      ) : null}
      {state === "error" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("failed")}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={state === "busy" || picked.length === 0} onClick={() => void add()} className={primary}>
          {state === "busy" ? t("developing") : t("developCount", { count: picked.length })}
        </button>
        <button type="button" disabled={state === "busy"} onClick={onBack} className={ghost}>{t("liveBack")}</button>
      </div>
    </div>
  );
}

function searchErrorText(t: ReturnType<typeof useTranslations>, error: SearchError): string {
  if (error.error === "refused") return t("googleRefused");
  if (error.error === "unconfigured") return t("liveUnconfigured");
  return error.detail ? `${t("failed")} (${error.detail})` : t("failed");
}

/** Google, live: businesses of a type in a town, as Google Maps lists them. */
export function GoogleSearchForm({ configured, onAdded }: { configured: boolean; onAdded: (added: number) => void }) {
  const t = useTranslations("admin.prospects");
  const [kind, setKind] = useState<ProspectKind>("sponsor");
  const [sectors, setSectors] = useState<ProspectSector[]>([]);
  const [towns, setTowns] = useState<string[]>(["Tivat"]);
  const [customTown, setCustomTown] = useState("");
  const [extra, setExtra] = useState("");
  const [depth, setDepth] = useState<(typeof GOOGLE_DEPTHS)[number]>(20);
  const [state, setState] = useState<"idle" | "busy">("idle");
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<LiveCandidate[] | null>(null);

  if (!configured) return <NotSetUp>{t.rich("googleSetup", { code: (chunks) => <code className="rounded bg-paper px-1.5 py-0.5 font-mono text-[13.5px]">{chunks}</code> })}</NotSetUp>;
  if (found) return <CandidatePicker candidates={found} kind={kind} google onAdded={onAdded} onBack={() => setFound(null)} />;

  const plan = planSearches(sectors, towns, extra);
  const tooMany = plan.length > MAX_SEARCHES;
  const townNames = [...new Set([...GOOGLE_TOWNS.map((town) => town.name), ...towns])];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("busy");
    setError(null);
    const result = await searchGoogleProspects({ sectors, towns, extra, depth }).catch(() => ({ ok: false as const, error: "server" as const }));
    setState("idle");
    if (result.ok) setFound(result.candidates);
    else setError(searchErrorText(t, result));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <p className="text-[14.5px] leading-relaxed text-black/65">{t("googleLead")}</p>
      <div>
        <p className="text-[15.5px] font-bold">1. {t("kindLabel")}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PROSPECT_KINDS.filter((k) => k !== "funder").map((k) => <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{t(`kind.${k}`)}</Chip>)}
        </div>
      </div>
      <div>
        <p className="text-[15.5px] font-bold">2. {t("googleWhat")}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {GOOGLE_SECTORS.map((s) => <Chip key={s} active={sectors.includes(s)} onClick={() => setSectors((list) => toggle(list, s))}>{t(`sector.${s}`)}</Chip>)}
        </div>
        <label className="mt-3 block text-[13.5px] font-semibold">
          {t("googleExtra")}
          <input type="text" maxLength={80} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder={t("googleExtraPlaceholder")} className={inputClass} />
        </label>
      </div>
      <div>
        <p className="text-[15.5px] font-bold">3. {t("googleWhere")}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {townNames.map((name) => <Chip key={name} active={towns.includes(name)} onClick={() => setTowns((list) => toggle(list, name))}>{name}</Chip>)}
        </div>
        <div className="mt-3 flex gap-2">
          <label className="flex-1">
            <span className="sr-only">{t("googleAddTown")}</span>
            <input type="text" maxLength={60} value={customTown} onChange={(e) => setCustomTown(e.target.value)} placeholder={t("googleAddTown")} className={`${inputClass} mt-0`} />
          </label>
          <button
            type="button"
            disabled={customTown.trim().length < 2}
            onClick={() => {
              setTowns((list) => (list.includes(customTown.trim()) ? list : [...list, customTown.trim()]));
              setCustomTown("");
            }}
            className={ghost}
          >
            {t("googleAdd")}
          </button>
        </div>
      </div>
      <label className="block text-[15.5px] font-bold">
        4. {t("googleDepth")}
        <select value={depth} onChange={(e) => setDepth(Number(e.target.value) as (typeof GOOGLE_DEPTHS)[number])} className={`${inputClass} block max-w-xs text-[15px] font-medium`}>
          {GOOGLE_DEPTHS.map((d) => <option key={d} value={d}>{t("googleDepthValue", { count: d })}</option>)}
        </select>
      </label>

      <p className="rounded-lg bg-paper px-4 py-3 text-[14.5px] leading-relaxed" role="status">
        {t.rich(tooMany ? "googleTooMany" : "googleSummary", {
          searches: plan.length,
          max: MAX_SEARCHES,
          towns: towns.length,
          up: plan.length * depth,
          requests: plan.length * (depth / 20),
          b: (chunks) => <strong className="font-mono tabular-nums">{chunks}</strong>,
        })}
      </p>
      {error ? <p role="alert" className="text-[14px] font-semibold text-red-dark">{error}</p> : null}
      <div>
        <button type="submit" disabled={state === "busy" || plan.length === 0 || tooMany} className={primary}>
          {state === "busy" ? t("searching") : t("googleSearch")}
        </button>
      </div>
    </form>
  );
}

/** Live research: who has sponsored or supported events like ours, found on the web now. */
export function LiveResearchForm({ configured, onAdded }: { configured: boolean; onAdded: (added: number) => void }) {
  const t = useTranslations("admin.prospects");
  const [kind, setKind] = useState<ProspectKind>("sponsor");
  const [area, setArea] = useState<ProspectArea>("boka");
  const [focus, setFocus] = useState("");
  const [state, setState] = useState<"idle" | "busy">("idle");
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<LiveCandidate[] | null>(null);

  if (!configured) return <NotSetUp>{t.rich("researchSetup", { code: (chunks) => <code className="rounded bg-paper px-1.5 py-0.5 font-mono text-[13.5px]">{chunks}</code> })}</NotSetUp>;
  if (found) return <CandidatePicker candidates={found} kind={kind} google={false} onAdded={onAdded} onBack={() => setFound(null)} />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("busy");
    setError(null);
    const result = await findLiveProspects({ kind, area, focus }).catch(() => ({ ok: false as const, error: "server" as const }));
    setState("idle");
    if (result.ok) setFound(result.candidates);
    else setError(searchErrorText(t, result));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <p className="text-[14.5px] leading-relaxed text-black/65">{t("researchLead")}</p>
      <div>
        <p className="text-[15.5px] font-bold">1. {t("kindLabel")}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PROSPECT_KINDS.map((k) => <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{t(`kind.${k}`)}</Chip>)}
        </div>
        <p className="mt-2 text-[13.5px] text-black/55">{t(`researchKind.${kind}`)}</p>
      </div>
      <div>
        <p className="text-[15.5px] font-bold">2. {t("areaLabel")}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PROSPECT_AREAS.map((a) => <Chip key={a} active={area === a} onClick={() => setArea(a)}>{t(`area.${a}`)}</Chip>)}
        </div>
      </div>
      <label className="block text-[15.5px] font-bold">
        3. {t("researchFocus")}
        <input type="text" maxLength={200} value={focus} onChange={(e) => setFocus(e.target.value)} placeholder={t("researchFocusPlaceholder")} className={`${inputClass} block text-[15px] font-medium`} />
      </label>
      {error ? <p role="alert" className="text-[14px] font-semibold text-red-dark">{error}</p> : null}
      <div>
        <button type="submit" disabled={state === "busy"} className={primary}>
          {state === "busy" ? t("researching") : t("researchSearch")}
        </button>
        <p className="mt-2 text-[13.5px] leading-relaxed text-black/55">{t("researchHint")}</p>
      </div>
    </form>
  );
}

/**
 * A live check of one prospect: the finding as a proposal beside what is
 * on file. The check is logged the moment it runs; the details change only
 * when Apply is pressed.
 */
export function LiveCheck({ row, configured, checkedLabel, onChanged }: { row: ProspectRow; configured: boolean; checkedLabel: string | null; onChanged: () => void }) {
  const t = useTranslations("admin.prospects");
  const [state, setState] = useState<"idle" | "busy" | "applying" | "applied">("idle");
  const [check, setCheck] = useState<ResearchCheck | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setState("busy");
    setError(null);
    setCheck(null);
    const result = await checkProspectLive({ id: row.id }).catch(() => ({ ok: false as const, error: "server" as const, detail: undefined }));
    setState("idle");
    if (result.ok) {
      setCheck(result.check);
      onChanged();
    } else {
      setError(result.error === "nothing" ? t("checkNothing") : result.error === "unconfigured" ? t("liveUnconfigured") : result.detail ? `${t("failed")} (${result.detail})` : t("failed"));
    }
  };

  const apply = async () => {
    if (!check) return;
    setState("applying");
    const result = await applyProspectCheck({ id: row.id, check }).catch(() => ({ ok: false as const, error: "server" as const }));
    if (!result.ok) {
      setState("idle");
      setError(t("failed"));
      return;
    }
    setState("applied");
    setCheck(null);
    onChanged();
  };

  // What the check found that differs from what is on file.
  const changes: [string, string | null | undefined, string][] = check
    ? ([
        [t("contactNameField"), row.contact_name, [check.contact_name, check.contact_role].filter(Boolean).join(", ")],
        [t("contactEmailField"), row.contact_email, check.contact_email ?? ""],
        [t("contactPhoneField"), row.contact_phone, check.contact_phone ?? ""],
        [t("emailField"), row.email, check.email ?? ""],
        [t("phoneField"), row.phone, check.phone ?? ""],
        [t("websiteField"), row.website, check.website ?? ""],
        [t("instagramField"), row.instagram, check.instagram ?? ""],
      ] as [string, string | null | undefined, string][]).filter(([, was, now]) => now !== "" && now !== (was ?? "") && !(was && now.startsWith(was)))
    : [];

  return (
    <div className="mt-4 rounded-lg bg-paper px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-[15px] font-bold">{t("checkHeading")}</p>
          <p className="text-[13.5px] text-black/55">{checkedLabel ? t("checkedOn", { when: checkedLabel }) : t("checkNever")}</p>
        </div>
        <button type="button" disabled={!configured || state === "busy" || state === "applying"} onClick={() => void run()} className="rounded-lg bg-ink px-4 py-2 text-[14px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-50">
          {state === "busy" ? t("researching") : t("checkNow")}
        </button>
      </div>
      {!configured ? <p className="mt-2 text-[13.5px] text-black/60">{t("liveUnconfigured")}</p> : state === "busy" ? <p className="mt-2 text-[13.5px] text-black/60" role="status">{t("researchHint")}</p> : null}
      {error ? <p role="alert" className="mt-2 text-[14px] font-semibold text-red-dark">{error}</p> : null}
      {state === "applied" ? <p role="status" className="mt-2 text-[14px] font-semibold text-sea">{t("checkApplied")}</p> : null}

      {check ? (
        <div className="mt-3 border-t-[0.5px] border-line pt-3">
          <p className="flex flex-wrap items-center gap-2 text-[14.5px]">
            <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-bold ${check.status === "closed" ? "bg-red/15 text-red-dark" : check.status === "changed" ? "bg-sand text-black" : "bg-mist text-black/75"}`}>{t(`checkStatus.${check.status}`)}</span>
          </p>
          {check.summary ? <p className="mt-2 text-[14.5px] leading-relaxed">{check.summary}</p> : null}
          {check.sponsorship_record ? (
            <p className="mt-2 text-[14.5px] leading-relaxed"><span className="font-semibold">{t("checkRecord")}</span> {check.sponsorship_record}</p>
          ) : null}
          {changes.length > 0 ? (
            <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-[14.5px] sm:grid-cols-[auto_1fr]">
              {changes.map(([label, was, now]) => (
                <div key={label} className="contents">
                  <dt className="text-black/55">{label}</dt>
                  <dd className="break-words"><span className="font-semibold">{now}</span>{was ? <span className="text-black/50"> ({t("checkWas", { value: was })})</span> : null}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-[14px] text-black/60">{t("checkNoChanges")}</p>
          )}
          <p className="mt-2.5 text-[13px] text-black/55">
            {t("sources")}{" "}
            {check.sources.slice(0, 6).map((source, i) => (
              <a key={source} href={source} target="_blank" rel="noopener" className="mr-2 underline underline-offset-2 hover:text-sea">{t("sourceN", { n: i + 1 })}</a>
            ))}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {changes.length > 0 || check.sponsorship_record ? (
              <button type="button" disabled={state === "applying"} onClick={() => void apply()} className="rounded-lg bg-red px-4 py-2 text-[14px] font-bold text-paper transition-colors hover:bg-red-dark disabled:opacity-50">{t("checkApply")}</button>
            ) : null}
            <button type="button" onClick={() => setCheck(null)} className="rounded-lg bg-mist px-4 py-2 text-[14px] font-semibold transition-colors hover:bg-mist-2">{t("checkDismiss")}</button>
          </div>
          <p className="mt-2 text-[13px] text-black/55">{t("checkLoggedHint")}</p>
        </div>
      ) : null}
    </div>
  );
}
