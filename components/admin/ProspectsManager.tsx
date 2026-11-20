"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";

import {
  addProspectNote,
  deleteProspects,
  developProspects,
  logProspectMessage,
  prospectToSupporter,
  saveProspect,
  setProspectFollowUp,
  setProspectStage,
} from "@/app/[locale]/admin/(protected)/podrska/prospekti/actions";
import { GoogleSearchForm, LiveCheck, LiveResearchForm } from "@/components/admin/ProspectsLive";
import { SidePanel, useSidePanel } from "@/components/console/SidePanel";
import { useDialog } from "@/components/console/useDialog";
import { Link } from "@/i18n/navigation";
import { htmlLang, type Locale } from "@/i18n/routing";
import {
  PROSPECT_AREAS,
  PROSPECT_KINDS,
  PROSPECT_SECTORS,
  PROSPECT_STAGES,
  PROSPECT_TEMPLATES,
  PROSPECT_TIERS,
  composeMessage,
  followUpDays,
  instagramLink,
  isDue,
  isMobile,
  mailtoLink,
  matchesCriteria,
  whatsappLink,
  type CatalogueFacet,
  type ProspectActivityRow,
  type ProspectArea,
  type ProspectChannel,
  type ProspectCriteria,
  type ProspectKind,
  type ProspectLang,
  type ProspectRow,
  type ProspectSector,
  type ProspectStage,
  type ProspectTemplate,
  type ProspectTier,
} from "@/lib/prospects";

interface Links {
  /** The sponsor page: tiers and the pledge form. */
  pledge: string;
  site: string;
  /** The sponsorship sheet (PDF). */
  pdf: string;
}

const inputClass = "mt-1 w-full rounded-lg bg-paper px-3.5 py-2.5 text-[15px] outline-none ring-sea/40 focus:ring-2";
const labelClass = "text-[13.5px] font-semibold";
const chipBase = "rounded-full px-3.5 py-1.5 text-[14px] font-semibold transition-colors";
const ghost = "rounded-lg bg-mist px-3 py-1.5 text-[13.5px] font-semibold text-black/80 transition-colors hover:bg-mist-2 disabled:opacity-50";

const STAGE_TONE: Record<ProspectStage, string> = {
  new: "bg-mist-2 text-black/80",
  contacted: "bg-sand text-black",
  engaged: "bg-sea-2 text-paper",
  pledged: "bg-sea text-paper",
  won: "bg-red text-paper",
  declined: "bg-mist text-black/50",
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * Prospects in the console: the funnel in numbers, the list as cards that
 * read on a phone, the criteria form that develops the list from the
 * researched catalogue, and a panel per prospect with the contact, the
 * message composer and the log.
 */
export function ProspectsManager({
  locale,
  prospects,
  activities,
  facets,
  sender,
  today,
  links,
  live,
}: {
  locale: Locale;
  prospects: ProspectRow[];
  activities: ProspectActivityRow[];
  /** The researched catalogue, reduced to what the criteria count with. */
  facets: CatalogueFacet[];
  /** Who signs the messages: the signed-in person's name. */
  sender: string;
  /** Today in Podgorica, YYYY-MM-DD. */
  today: string;
  links: Links;
  /** Which live sources have their key: Google search, and live research. */
  live: { google: boolean; research: boolean };
}) {
  const t = useTranslations("admin.prospects");
  const router = useRouter();
  const [panel, setPanel] = useState<"" | "develop" | "new" | "edit">("");
  const [source, setSource] = useState<"file" | "research" | "google">("file");
  const [openId, setOpenId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<"all" | "due" | ProspectStage>("all");
  const [kindFilter, setKindFilter] = useState<"" | ProspectKind>("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState<"" | ProspectArea>("");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const open = prospects.find((p) => p.id === openId) ?? null;
  const lastByProspect = useMemo(() => {
    const map = new Map<string, ProspectActivityRow>();
    for (const activity of activities) if (activity.kind === "message" && !map.has(activity.prospect_id)) map.set(activity.prospect_id, activity);
    return map;
  }, [activities]);

  const counts = useMemo(() => {
    const by = Object.fromEntries(PROSPECT_STAGES.map((s) => [s, 0])) as Record<ProspectStage, number>;
    let due = 0;
    for (const p of prospects) {
      by[p.stage] += 1;
      if (isDue(p, today)) due += 1;
    }
    return { by, due };
  }, [prospects, today]);
  // The funnel counts everyone who got at least that far.
  const reached = {
    contacted: prospects.filter((p) => p.stage !== "new" || p.last_contacted_at).length,
    engaged: counts.by.engaged + counts.by.pledged + counts.by.won,
    pledged: counts.by.pledged + counts.by.won,
    won: counts.by.won,
  };

  const sectorsInList = useMemo(() => [...new Set(prospects.map((p) => p.sector))].sort(), [prospects]);
  const needle = query.trim().toLowerCase();
  const shown = prospects.filter((p) => {
    if (stageFilter === "due" ? !isDue(p, today) : stageFilter !== "all" && p.stage !== stageFilter) return false;
    if (kindFilter && p.kind !== kindFilter) return false;
    if (sectorFilter && p.sector !== sectorFilter) return false;
    if (areaFilter && p.area !== areaFilter) return false;
    if (needle && ![p.name, p.town, p.contact_name, p.contact_role, p.email, p.contact_email].some((v) => v?.toLowerCase().includes(needle))) return false;
    return true;
  });

  const sectorLabel = (sector: string) => ((PROSPECT_SECTORS as readonly string[]).includes(sector) ? t(`sector.${sector as ProspectSector}`) : sector);
  /** "Sponsor · Banks · Podgorica"; the kind and the sector are said once when they are the same word. */
  const describe = (p: ProspectRow) => [...new Set([t(`kind.${p.kind}`), sectorLabel(p.sector)]), p.town].filter(Boolean).join(" · ");
  const dateFormat = new Intl.DateTimeFormat(htmlLang(locale), { day: "numeric", month: "short" });
  const relative = new Intl.RelativeTimeFormat(htmlLang(locale), { numeric: "auto" });
  const ago = (iso: string) => {
    const days = Math.round((Date.parse(iso) - Date.now()) / 86_400_000);
    return Math.abs(days) < 1 ? relative.format(0, "day") : Math.abs(days) < 30 ? relative.format(days, "day") : dateFormat.format(new Date(iso));
  };

  const changeStage = async (id: string, stage: ProspectStage) => {
    setBusyId(id);
    const result = await setProspectStage({ id, stage }).catch(() => ({ ok: false as const, error: "server" as const }));
    setBusyId(null);
    if (!result.ok) setNotice(t("failed"));
    router.refresh();
  };

  const dueChip = (p: ProspectRow) => {
    if (p.stage === "won" || p.stage === "declined") return null;
    const days = followUpDays(p.next_follow_up, today);
    if (days === null) return null;
    if (days < 0) return <span className="rounded-full bg-red/15 px-2.5 py-0.5 text-[13px] font-bold text-red-dark">{t("overdue", { days: -days })}</span>;
    if (days === 0) return <span className="rounded-full bg-sand px-2.5 py-0.5 text-[13px] font-bold text-black">{t("dueToday")}</span>;
    return <span className="rounded-full bg-mist px-2.5 py-0.5 text-[13px] font-semibold text-black/70">{t("followUpOn", { date: dateFormat.format(new Date(`${p.next_follow_up}T00:00:00`)) })}</span>;
  };

  const stat = (label: string, value: number, sub?: string) => (
    <div className="rounded-lg bg-mist px-4 py-3.5">
      <p className="text-[13.5px] font-semibold text-black/60">{label}</p>
      <p className="mt-0.5 font-mono text-[26px] font-extrabold leading-none tabular-nums">{value}</p>
      {sub ? <p className="mt-1.5 text-[13px] text-black/55">{sub}</p> : null}
    </div>
  );
  const share = (part: number, whole: number) => (whole > 0 ? t("share", { pct: Math.round((part / whole) * 100) }) : undefined);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <p className="max-w-2xl text-[15px] leading-relaxed text-black/65">{t("lead")}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setPanel("develop")} className="rounded-lg bg-red px-4 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-red-dark">
            + {t("develop")}
          </button>
          <button type="button" onClick={() => setPanel("new")} className="rounded-lg bg-mist px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:bg-mist-2">
            {t("addByHand")}
          </button>
        </div>
      </div>

      {/* the funnel */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {stat(t("statAll"), prospects.length, t("statAllSub", { count: prospects.filter((p) => p.contact_name).length }))}
        {stat(t("statContacted"), reached.contacted, share(reached.contacted, prospects.length))}
        {stat(t("statEngaged"), reached.engaged, share(reached.engaged, reached.contacted))}
        {stat(t("statPledged"), reached.pledged, share(reached.pledged, reached.contacted))}
        {stat(t("statWon"), reached.won, share(reached.won, reached.contacted))}
      </div>

      {/* where they stand */}
      <div className="mt-5 flex flex-wrap gap-1.5" role="group" aria-label={t("stageFilter")}>
        {([["all", prospects.length], ["due", counts.due], ...PROSPECT_STAGES.map((s) => [s, counts.by[s]] as const)] as const).map(([key, count]) => {
          const active = stageFilter === key;
          const label = key === "all" ? t("all") : key === "due" ? t("due") : t(`stage.${key}`);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setStageFilter(key)}
              className={`${chipBase} ${active ? "bg-ink text-paper" : key === "due" && count > 0 ? "bg-sand text-black hover:bg-mist-2" : "bg-mist text-black/75 hover:bg-mist-2"}`}
            >
              {label} <span className="font-mono tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select aria-label={t("kindLabel")} value={kindFilter} onChange={(e) => setKindFilter(e.target.value as "" | ProspectKind)} className={`${inputClass} mt-0 bg-mist`}>
          <option value="">{t("allKinds")}</option>
          {PROSPECT_KINDS.map((k) => <option key={k} value={k}>{t(`kind.${k}`)}</option>)}
        </select>
        <select aria-label={t("sectorLabel")} value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)} className={`${inputClass} mt-0 bg-mist`}>
          <option value="">{t("allSectors")}</option>
          {sectorsInList.map((s) => <option key={s} value={s}>{sectorLabel(s)}</option>)}
        </select>
        <select aria-label={t("areaLabel")} value={areaFilter} onChange={(e) => setAreaFilter(e.target.value as "" | ProspectArea)} className={`${inputClass} mt-0 bg-mist`}>
          <option value="">{t("allAreas")}</option>
          {PROSPECT_AREAS.map((a) => <option key={a} value={a}>{t(`area.${a}`)}</option>)}
        </select>
        <input type="search" aria-label={t("search")} placeholder={t("search")} value={query} onChange={(e) => setQuery(e.target.value)} className={`${inputClass} mt-0 bg-mist`} style={{ minWidth: 0 }} />
      </div>

      {notice ? <p role="status" className="mt-3 text-[14px] font-semibold text-sea">{notice}</p> : null}

      {/* the list */}
      {prospects.length === 0 ? (
        <div className="mt-6 rounded-lg bg-mist px-5 py-8 text-center">
          <p className="text-[16px] font-bold">{t("emptyTitle")}</p>
          <p className="mx-auto mt-1 max-w-md text-[14.5px] leading-relaxed text-black/65">{t("emptyBody", { count: facets.length })}</p>
          <button type="button" onClick={() => setPanel("develop")} className="mt-4 rounded-lg bg-red px-4 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-red-dark">
            + {t("develop")}
          </button>
        </div>
      ) : shown.length === 0 ? (
        <p className="mt-6 text-[14.5px] text-black/60">{t("noMatches")}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {shown.map((p) => {
            const last = lastByProspect.get(p.id);
            const phone = p.contact_phone ?? p.phone;
            const email = p.contact_email ?? p.email;
            return (
              <li key={p.id} className="rounded-lg bg-mist px-4 py-4 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button type="button" onClick={() => setOpenId(p.id)} className="text-left text-[16.5px] font-bold leading-snug underline-offset-2 hover:underline">
                      {p.name}
                    </button>
                    <p className="mt-0.5 text-[14px] text-black/60">
                      {describe(p)}
                    </p>
                  </div>
                  {p.tier_fit ? <span className="shrink-0 rounded-full bg-paper px-2.5 py-1 text-[13px] font-bold">{t(`tier.${p.tier_fit}`)}</span> : null}
                </div>

                {p.contact_name ? (
                  <p className="mt-2.5 text-[14.5px]">
                    <span className="font-semibold">{p.contact_name}</span>
                    {p.contact_role ? <span className="text-black/60">, {p.contact_role}</span> : null}
                  </p>
                ) : null}
                <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[14.5px]">
                  {phone ? <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="font-mono tabular-nums text-sea underline-offset-2 hover:underline">{phone}</a> : null}
                  {email ? <a href={`mailto:${email}`} className="break-all text-sea underline-offset-2 hover:underline">{email}</a> : null}
                  {p.instagram ? <a href={`https://instagram.com/${p.instagram}`} target="_blank" rel="noopener" className="text-sea underline-offset-2 hover:underline">@{p.instagram}</a> : null}
                  {!phone && !email && !p.instagram ? <span className="text-black/50">{t("noContact")}</span> : null}
                </p>

                <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13.5px] text-black/60">
                  {last ? <span>{t("lastMessage", { channel: t(`channel.${last.channel ?? "copy"}`), when: ago(last.created_at) })}</span> : <span>{t("notContacted")}</span>}
                  {dueChip(p)}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    aria-label={t("stageLabel")}
                    value={p.stage}
                    disabled={busyId === p.id}
                    onChange={(e) => void changeStage(p.id, e.target.value as ProspectStage)}
                    className={`rounded-full px-3 py-1.5 text-[14px] font-bold outline-none ring-sea/40 focus:ring-2 disabled:opacity-60 ${STAGE_TONE[p.stage]}`}
                  >
                    {PROSPECT_STAGES.map((s) => <option key={s} value={s}>{t(`stage.${s}`)}</option>)}
                  </select>
                  <button type="button" onClick={() => setOpenId(p.id)} className="ml-auto rounded-lg bg-ink px-4 py-2 text-[14px] font-bold text-paper transition-opacity hover:opacity-90">
                    {last ? t("followUpCta") : t("messageCta")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <SidePanel open={panel === "develop"} title={t("develop")} onClose={() => setPanel("")} wide>
        {/* three ways to the same list: what we researched, what the web says now, what Google lists */}
        <div className="mb-5 grid gap-2 sm:grid-cols-3" role="tablist" aria-label={t("sourceLabel")}>
          {(["file", "research", "google"] as const).map((key) => (
            <button key={key} type="button" role="tab" aria-selected={source === key} onClick={() => setSource(key)} className={`rounded-lg px-4 py-3 text-left transition-colors ${source === key ? "bg-ink text-paper" : "bg-paper hover:bg-mist-2"}`}>
              <span className="block text-[15px] font-bold">{t(`source.${key}`)}</span>
              <span className={`mt-0.5 block text-[13px] ${source === key ? "text-paper/70" : "text-black/60"}`}>{t(`sourceHint.${key}`)}</span>
            </button>
          ))}
        </div>
        {(() => {
          const added = (count: number | null) => {
            setPanel("");
            setNotice(count === null ? null : t("developed", { count }));
            setStageFilter("all");
            router.refresh();
          };
          if (source === "research") return <LiveResearchForm configured={live.research} onAdded={added} />;
          if (source === "google") return <GoogleSearchForm configured={live.google} onAdded={added} />;
          return <DevelopForm facets={facets} existing={new Set(prospects.map((p) => p.catalogue_key).filter((k): k is string => Boolean(k)))} onDone={added} />;
        })()}
      </SidePanel>

      <SidePanel open={panel === "new" || (panel === "edit" && open !== null)} title={panel === "edit" ? t("edit") : t("addByHand")} onClose={() => setPanel("")}>
        <ProspectForm
          row={panel === "edit" ? open : null}
          onDone={() => {
            setPanel("");
            router.refresh();
          }}
        />
      </SidePanel>

      <SidePanel open={open !== null && panel !== "edit"} title={open?.name ?? ""} onClose={() => setOpenId(null)} wide>
        {open ? (
          <ProspectDetail
            key={open.id}
            locale={locale}
            row={open}
            activities={activities.filter((a) => a.prospect_id === open.id)}
            sender={sender}
            today={today}
            links={links}
            liveResearch={live.research}
            summary={describe(open)}
            dueChip={dueChip(open)}
            onEdit={() => setPanel("edit")}
            onDeleted={() => {
              setOpenId(null);
              router.refresh();
            }}
          />
        ) : null}
      </SidePanel>
    </div>
  );
}

/** The criteria form: who, which sectors, where, how big; a live count of what joins the list. */
function DevelopForm({ facets, existing, onDone }: { facets: CatalogueFacet[]; existing: Set<string>; onDone: (added: number | null) => void }) {
  const t = useTranslations("admin.prospects");
  const [criteria, setCriteria] = useState<ProspectCriteria>({ kinds: ["sponsor"], sectors: [], areas: [], tiers: [], personOnly: false });
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");

  // Sectors and tiers on offer follow the kinds picked, counted from the catalogue.
  const ofKind = facets.filter((f) => criteria.kinds.length === 0 || criteria.kinds.includes(f.kind));
  const sectors = PROSPECT_SECTORS.filter((s) => ofKind.some((f) => f.sector === s));
  const tiers = PROSPECT_TIERS.filter((tier) => ofKind.some((f) => f.tier_fit === tier));
  const count = (pick: (f: CatalogueFacet) => boolean) => ofKind.filter(pick).length;
  const effective: ProspectCriteria = {
    ...criteria,
    sectors: criteria.sectors.filter((s) => sectors.includes(s)),
    tiers: criteria.tiers.filter((tier) => tiers.includes(tier)),
  };
  const matched = facets.filter((f) => matchesCriteria(f, effective));
  const fresh = matched.filter((f) => !existing.has(f.key));

  // A choice the research holds nothing for is shown, greyed, so the gap is visible.
  const chip = (active: boolean, label: ReactNode, onClick: () => void, key: string, none = false) => (
    <button key={key} type="button" aria-pressed={active} disabled={none && !active} onClick={onClick} className={`${chipBase} disabled:opacity-40 ${active ? "bg-sea text-paper" : "bg-paper text-black/80 hover:bg-mist-2"}`}>
      {label}
    </button>
  );
  const n = (value: number) => <span className="font-mono tabular-nums opacity-70">{value}</span>;
  const heading = (step: number, label: string, picked: number) => (
    <div className="flex items-baseline justify-between gap-3">
      <p className="text-[15.5px] font-bold">{step}. {label}</p>
      <p className="text-[13.5px] text-black/55">{picked > 0 ? t("picked", { count: picked }) : t("any")}</p>
    </div>
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("busy");
    const result = await developProspects(effective).catch(() => ({ ok: false as const, error: "server" as const }));
    if (!result.ok) {
      setState("error");
      return;
    }
    onDone(result.added ?? 0);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <p className="text-[14.5px] leading-relaxed text-black/65">{t("developLead", { count: facets.length })}</p>

      <div>
        {heading(1, t("kindLabel"), criteria.kinds.length)}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PROSPECT_KINDS.map((k) => {
            const total = facets.filter((f) => f.kind === k).length;
            return chip(criteria.kinds.includes(k), <>{t(`kind.${k}`)} {n(total)}</>, () => setCriteria((c) => ({ ...c, kinds: toggle(c.kinds, k) })), k, total === 0);
          })}
        </div>
        <p className="mt-2 text-[13.5px] text-black/55">{criteria.kinds.length === 1 ? t(`kindHint.${criteria.kinds[0]}`) : t("kindHintMany")}</p>
      </div>

      <div>
        {heading(2, t("sectorLabel"), effective.sectors.length)}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {sectors.map((s) => chip(effective.sectors.includes(s), <>{t(`sector.${s}`)} {n(count((f) => f.sector === s))}</>, () => setCriteria((c) => ({ ...c, sectors: toggle(c.sectors, s) })), s))}
        </div>
      </div>

      <div>
        {heading(3, t("areaLabel"), criteria.areas.length)}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PROSPECT_AREAS.map((a) => {
            const total = count((f) => f.area === a);
            return chip(criteria.areas.includes(a), <>{t(`area.${a}`)} {n(total)}</>, () => setCriteria((c) => ({ ...c, areas: toggle(c.areas, a) })), a, total === 0);
          })}
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
          <button type="button" onClick={() => setCriteria((c) => ({ ...c, areas: ["tivat", "boka"] }))} className="font-semibold text-sea underline-offset-2 hover:underline">{t("presetLocal")}</button>
          <button type="button" onClick={() => setCriteria((c) => ({ ...c, areas: ["national"] }))} className="font-semibold text-sea underline-offset-2 hover:underline">{t("presetNational")}</button>
          <button type="button" onClick={() => setCriteria({ kinds: [], sectors: [], areas: [], tiers: [], personOnly: false })} className="font-semibold text-sea underline-offset-2 hover:underline">{t("presetEverything")}</button>
        </p>
      </div>

      {tiers.length > 0 ? (
        <div>
          {heading(4, t("tierLabel"), effective.tiers.length)}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tiers.map((tier) => chip(effective.tiers.includes(tier), <>{t(`tier.${tier}`)} {n(count((f) => f.tier_fit === tier))}</>, () => setCriteria((c) => ({ ...c, tiers: toggle(c.tiers, tier) })), tier))}
          </div>
          <p className="mt-2 text-[13.5px] text-black/55">{t("tierHint")}</p>
        </div>
      ) : null}

      <label className="flex items-start gap-2.5 text-[14.5px]">
        <input type="checkbox" checked={criteria.personOnly} onChange={(e) => setCriteria((c) => ({ ...c, personOnly: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-red" />
        <span>
          <span className="font-semibold">{t("personOnly")}</span>
          <span className="block text-[13.5px] text-black/55">{t("personOnlyHint")}</span>
        </span>
      </label>

      <p className="rounded-lg bg-paper px-4 py-3 text-[14.5px] leading-relaxed" role="status">
        {t.rich("developSummary", {
          matched: matched.length,
          have: matched.length - fresh.length,
          fresh: fresh.length,
          people: fresh.filter((f) => f.hasPerson).length,
          b: (chunks) => <strong className="font-mono tabular-nums">{chunks}</strong>,
        })}
      </p>
      {state === "error" ? <p role="alert" className="text-[14px] font-semibold text-red-dark">{t("failed")}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={state === "busy" || fresh.length === 0} className="rounded-lg bg-red px-5 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-red-dark disabled:opacity-50">
          {state === "busy" ? t("developing") : t("developCount", { count: fresh.length })}
        </button>
        <button type="button" onClick={() => onDone(null)} className="rounded-lg bg-paper px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:bg-mist-2">
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}

/** Add an organisation by hand, or correct one: the warmer contact a board member knows beats the published one. */
function ProspectForm({ row, onDone }: { row: ProspectRow | null; onDone: () => void }) {
  const t = useTranslations("admin.prospects");
  const [values, setValues] = useState({
    kind: row?.kind ?? ("sponsor" as ProspectKind),
    name: row?.name ?? "",
    sector: ((PROSPECT_SECTORS as readonly string[]).includes(row?.sector ?? "") ? row?.sector : "local_shop") as ProspectSector,
    area: row?.area ?? ("tivat" as ProspectArea),
    town: row?.town ?? "",
    tierFit: row?.tier_fit ?? ("" as "" | ProspectTier),
    website: row?.website ?? "",
    email: row?.email ?? "",
    phone: row?.phone ?? "",
    instagram: row?.instagram ?? "",
    contactName: row?.contact_name ?? "",
    contactRole: row?.contact_role ?? "",
    contactEmail: row?.contact_email ?? "",
    contactPhone: row?.contact_phone ?? "",
    notes: row?.notes ?? "",
  });
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => setValues((v) => ({ ...v, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("busy");
    const blank = (value: string) => value.trim() || null;
    const result = await saveProspect({
      id: row?.id ?? null,
      kind: values.kind,
      name: values.name,
      sector: values.sector,
      area: values.area,
      town: blank(values.town),
      website: blank(values.website),
      email: blank(values.email),
      phone: blank(values.phone),
      instagram: blank(values.instagram),
      contactName: blank(values.contactName),
      contactRole: blank(values.contactRole),
      contactEmail: blank(values.contactEmail),
      contactPhone: blank(values.contactPhone),
      tierFit: values.tierFit || null,
      notes: blank(values.notes),
    }).catch(() => ({ ok: false as const, error: "server" as const }));
    if (!result.ok) {
      setState("error");
      return;
    }
    onDone();
  };

  const field = (id: keyof typeof values, label: string, type = "text", extra = "") => (
    <label className={`${labelClass} ${extra}`}>
      {label}
      <input type={type} value={values[id]} onChange={(e) => set(id, e.target.value as never)} className={inputClass} />
    </label>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className={labelClass}>
        {t("nameField")}
        <input type="text" required maxLength={200} value={values.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          {t("kindLabel")}
          <select value={values.kind} onChange={(e) => set("kind", e.target.value as ProspectKind)} className={inputClass}>
            {PROSPECT_KINDS.map((k) => <option key={k} value={k}>{t(`kind.${k}`)}</option>)}
          </select>
        </label>
        <label className={labelClass}>
          {t("sectorLabel")}
          <select value={values.sector} onChange={(e) => set("sector", e.target.value as ProspectSector)} className={inputClass}>
            {PROSPECT_SECTORS.map((s) => <option key={s} value={s}>{t(`sector.${s}`)}</option>)}
          </select>
        </label>
        <label className={labelClass}>
          {t("areaLabel")}
          <select value={values.area} onChange={(e) => set("area", e.target.value as ProspectArea)} className={inputClass}>
            {PROSPECT_AREAS.map((a) => <option key={a} value={a}>{t(`area.${a}`)}</option>)}
          </select>
        </label>
        {field("town", t("townField"))}
        <label className={labelClass}>
          {t("tierLabel")}
          <select value={values.tierFit} onChange={(e) => set("tierFit", e.target.value as "" | ProspectTier)} className={inputClass}>
            <option value="">—</option>
            {PROSPECT_TIERS.map((tier) => <option key={tier} value={tier}>{t(`tier.${tier}`)}</option>)}
          </select>
        </label>
        {field("website", t("websiteField"), "url")}
        {field("email", t("emailField"), "email")}
        {field("phone", t("phoneField"), "tel")}
        {field("instagram", t("instagramField"))}
      </div>
      <fieldset className="rounded-lg bg-paper p-4">
        <legend className="px-1 text-[14.5px] font-bold">{t("personHeading")}</legend>
        <p className="text-[13.5px] text-black/55">{t("personHint")}</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {field("contactName", t("contactNameField"))}
          {field("contactRole", t("contactRoleField"))}
          {field("contactEmail", t("contactEmailField"), "email")}
          {field("contactPhone", t("contactPhoneField"), "tel")}
        </div>
      </fieldset>
      <label className={labelClass}>
        {t("notesField")}
        <textarea rows={3} maxLength={4000} value={values.notes} onChange={(e) => set("notes", e.target.value)} className={inputClass} />
      </label>
      {state === "error" ? <p role="alert" className="text-[14px] font-semibold text-red-dark">{t("failed")}</p> : null}
      <div>
        <button type="submit" disabled={state === "busy"} className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60">
          {state === "busy" ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}

/** One prospect: who to reach, the message to send and through what, when to come back, and what was done. */
function ProspectDetail({
  locale,
  row,
  activities,
  sender,
  today,
  links,
  liveResearch,
  summary,
  dueChip,
  onEdit,
  onDeleted,
}: {
  locale: Locale;
  row: ProspectRow;
  activities: ProspectActivityRow[];
  sender: string;
  today: string;
  links: Links;
  /** Whether live research has its key. */
  liveResearch: boolean;
  /** Kind, sector and town in one line. */
  summary: string;
  dueChip: ReactNode;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const t = useTranslations("admin.prospects");
  const router = useRouter();
  const panel = useSidePanel();
  const confirmBox = useDialog();
  const tiered = row.kind === "sponsor" || row.kind === "in_kind";

  // The number WhatsApp can reach: the person's mobile first, then the organisation's.
  const waPhone = [row.contact_phone, row.phone].find((p) => isMobile(p)) ?? null;
  const email = row.contact_email ?? row.email;
  const igLink = instagramLink(row.instagram);
  const available: Record<ProspectChannel, boolean> = { whatsapp: waPhone !== null, email: Boolean(email), instagram: igLink !== null, copy: true };
  const firstChannel = (["whatsapp", "email", "instagram", "copy"] as const).find((c) => available[c]) ?? "copy";

  const [tab, setTab] = useState<"message" | "activity">("message");
  const [template, setTemplate] = useState<ProspectTemplate>(activities.some((a) => a.kind === "message") ? "follow_up" : "first");
  const [channel, setChannel] = useState<ProspectChannel>(firstChannel);
  const [lang, setLang] = useState<ProspectLang>(locale === "en" ? "en" : "me");
  const [withPdf, setWithPdf] = useState(tiered);
  const [edited, setEdited] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [note, setNote] = useState("");

  const message = composeMessage({
    kind: row.kind,
    template,
    lang,
    org: row.name,
    contactName: row.contact_name,
    tierFit: row.tier_fit,
    sender,
    pledgeUrl: links.pledge,
    siteUrl: links.site,
    pdfUrl: withPdf ? links.pdf : null,
  });
  const body = edited ?? message.body;
  // A control changed: the words start again from the template.
  const reset = () => {
    setEdited(null);
    setState("idle");
  };

  const dateTime = new Intl.DateTimeFormat(htmlLang(locale), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const send = async () => {
    // Open the app first, inside the click, or the browser blocks it.
    if (channel === "whatsapp") window.open(whatsappLink(waPhone, body) ?? "", "_blank", "noopener");
    else if (channel === "email") window.location.href = mailtoLink(email, message.subject, body) ?? "";
    else {
      void navigator.clipboard?.writeText(body);
      if (channel === "instagram" && igLink) window.open(igLink, "_blank", "noopener");
    }
    setState("busy");
    const result = await logProspectMessage({ id: row.id, channel, template, lang, body }).catch(() => ({ ok: false as const, error: "server" as const }));
    setState(result.ok ? "sent" : "error");
    if (result.ok) {
      panel.markClean();
      router.refresh();
    }
  };

  const act = async (run: () => Promise<{ ok: boolean }>) => {
    const result = await run().catch(() => ({ ok: false }));
    if (!result.ok) setState("error");
    router.refresh();
  };

  const remove = async () => {
    if (!(await confirmBox.confirm(t("confirmDelete", { name: row.name }), { confirmLabel: t("delete"), danger: true }))) return;
    const result = await deleteProspects({ ids: [row.id] }).catch(() => ({ ok: false }));
    if (result.ok) onDeleted();
    else setState("error");
  };

  const seg = "px-3.5 py-2 text-[14px] font-semibold transition-colors disabled:opacity-35";
  const segOn = "bg-sea text-paper";
  const segOff = "bg-paper text-black/75 hover:bg-mist-2";
  const sendLabel = { whatsapp: t("sendWhatsapp"), email: t("sendEmail"), instagram: t("sendInstagram"), copy: t("sendCopy") }[channel];

  return (
    <div>
      {confirmBox.element}
      <p className="text-[14.5px] text-black/65">
        {summary}
        {row.website ? <> · <a href={row.website} target="_blank" rel="noopener" className="font-semibold text-sea underline-offset-2 hover:underline">{t("website")} ↗</a></> : null}
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-2">
        {row.tier_fit ? <span className="rounded-full bg-paper px-2.5 py-1 text-[13px] font-bold">{t(`tier.${row.tier_fit}`)}</span> : null}
        {dueChip}
      </p>
      {row.why ? <p className="mt-3 text-[14.5px] leading-relaxed text-black/80">{row.why}</p> : null}

      {/* who to reach */}
      <div className="mt-4 rounded-lg bg-paper px-4 py-3.5">
        {row.contact_name ? (
          <p className="text-[15px]"><span className="font-bold">{row.contact_name}</span>{row.contact_role ? <span className="text-black/60">, {row.contact_role}</span> : null}</p>
        ) : (
          <p className="text-[14.5px] text-black/60">{t("noPerson")}</p>
        )}
        <dl className="mt-2 grid gap-x-4 gap-y-1.5 text-[14.5px] sm:grid-cols-[auto_1fr]">
          {[
            [t("contactPhoneField"), row.contact_phone, row.contact_phone ? `tel:${row.contact_phone.replace(/[^\d+]/g, "")}` : null],
            [t("contactEmailField"), row.contact_email, row.contact_email ? `mailto:${row.contact_email}` : null],
            [t("phoneField"), row.phone, row.phone ? `tel:${row.phone.replace(/[^\d+]/g, "")}` : null],
            [t("emailField"), row.email, row.email ? `mailto:${row.email}` : null],
            [t("instagramField"), row.instagram ? `@${row.instagram}` : null, row.instagram ? `https://instagram.com/${row.instagram}` : null],
          ].map(([label, value, href]) =>
            value ? (
              <div key={label} className="contents">
                <dt className="text-black/55">{label}</dt>
                <dd><a href={href ?? undefined} target={href?.startsWith("http") ? "_blank" : undefined} rel="noopener" className="break-all font-semibold text-sea underline-offset-2 hover:underline">{value}</a></dd>
              </div>
            ) : null,
          )}
        </dl>
        {row.sources.length > 0 ? (
          <p className="mt-2.5 text-[13px] text-black/55">
            {t("sources")}{" "}
            {row.sources.slice(0, 4).map((source, i) => (
              <a key={source} href={source} target="_blank" rel="noopener" className="mr-2 underline underline-offset-2 hover:text-sea">{t("sourceN", { n: i + 1 })}</a>
            ))}
          </p>
        ) : null}
        {row.notes ? <p className="mt-2.5 whitespace-pre-line text-[14px] text-black/75">{row.notes}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={onEdit} className={ghost}>{t("edit")}</button>
          {row.supporter_id ? (
            <Link href="/admin/podrska" className={ghost}>{t("isSupporter")} →</Link>
          ) : row.kind === "sponsor" || row.kind === "in_kind" ? (
            <button type="button" onClick={() => void act(() => prospectToSupporter({ id: row.id }))} className={ghost}>{t("toSupporter")}</button>
          ) : null}
        </div>
      </div>

      <LiveCheck row={row} configured={liveResearch} checkedLabel={row.checked_at ? dateTime.format(new Date(row.checked_at)) : null} onChanged={() => router.refresh()} />

      {/* where it stands */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          {t("stageLabel")}
          <select value={row.stage} onChange={(e) => void act(() => setProspectStage({ id: row.id, stage: e.target.value }))} className={inputClass}>
            {PROSPECT_STAGES.map((s) => <option key={s} value={s}>{t(`stage.${s}`)}</option>)}
          </select>
        </label>
        <label className={labelClass}>
          {t("followUpField")}
          <input type="date" min={today} value={row.next_follow_up ?? ""} onChange={(e) => void act(() => setProspectFollowUp({ id: row.id, date: e.target.value || null }))} className={inputClass} />
        </label>
      </div>

      <div className="mt-5 flex gap-1 border-b-[0.5px] border-line" role="tablist">
        {(["message", "activity"] as const).map((key) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`-mb-px rounded-t-lg px-4 py-2.5 text-[14.5px] font-semibold ${tab === key ? "border-b-2 border-ink text-black" : "text-black/55 hover:text-black"}`}>
            {key === "message" ? t("tabMessage") : <>{t("tabActivity")} <span className="font-mono tabular-nums opacity-70">{activities.length}</span></>}
          </button>
        ))}
      </div>

      {tab === "message" ? (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label={t("templateLabel")} value={template} onChange={(e) => { setTemplate(e.target.value as ProspectTemplate); reset(); }} className="rounded-lg bg-paper px-3.5 py-2 text-[14px] font-semibold outline-none ring-sea/40 focus:ring-2">
              {PROSPECT_TEMPLATES.map((key) => <option key={key} value={key}>{t(`template.${key}`)}</option>)}
            </select>
            <div className="inline-flex overflow-hidden rounded-lg" role="group" aria-label={t("channelLabel")}>
              {(["whatsapp", "email", "instagram", "copy"] as const).map((c) => (
                <button key={c} type="button" aria-pressed={channel === c} disabled={!available[c]} title={available[c] ? undefined : t(`channelMissing.${c}`)} onClick={() => { setChannel(c); setState("idle"); }} className={`${seg} ${channel === c ? segOn : segOff}`}>
                  {t(`channel.${c}`)}
                </button>
              ))}
            </div>
            <div className="inline-flex overflow-hidden rounded-lg" role="group" aria-label={t("langLabel")}>
              {(["me", "en"] as const).map((l) => (
                <button key={l} type="button" aria-pressed={lang === l} onClick={() => { setLang(l); reset(); }} className={`${seg} ${lang === l ? segOn : segOff}`}>
                  {l === "me" ? "CG" : "EN"}
                </button>
              ))}
            </div>
          </div>

          <label className="mt-3 flex items-start gap-2.5 text-[14.5px]">
            <input type="checkbox" checked={withPdf} onChange={(e) => { setWithPdf(e.target.checked); reset(); }} className="mt-0.5 h-4 w-4 accent-red" />
            <span>
              <span className="font-semibold">{t("attachPdf")}</span>
              <span className="block text-[13.5px] text-black/55">
                {t("attachPdfHint")}{" "}
                <a href={links.pdf} target="_blank" rel="noopener" className="font-semibold text-sea underline underline-offset-2">{t("openPdf")}</a>
              </span>
            </span>
          </label>

          {channel === "email" ? <p className="mt-3 text-[14px] text-black/65"><span className="font-semibold">{t("subject")}</span> {message.subject}</p> : null}
          <label className="mt-2 block">
            <span className="sr-only">{t("messageLabel")}</span>
            <textarea rows={12} value={body} onChange={(e) => { setEdited(e.target.value); setState("idle"); }} className={`${inputClass} leading-relaxed`} />
          </label>
          {!available.whatsapp && channel !== "whatsapp" && (row.contact_phone || row.phone) ? <p className="mt-1.5 text-[13.5px] text-black/55">{t("landlineNote")}</p> : null}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" disabled={state === "busy" || body.trim() === ""} onClick={() => void send()} className="rounded-lg bg-red px-5 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-red-dark disabled:opacity-50">
              {sendLabel}
            </button>
            {state === "sent" ? <p role="status" className="text-[14px] font-semibold text-sea">{channel === "instagram" || channel === "copy" ? t("copiedLogged") : t("logged")}</p> : null}
            {state === "error" ? <p role="alert" className="text-[14px] font-semibold text-red-dark">{t("failed")}</p> : null}
          </div>
          <p className="mt-2 text-[13.5px] leading-relaxed text-black/55">{t("sendHint")}</p>
        </div>
      ) : (
        <div className="mt-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!note.trim()) return;
              void act(() => addProspectNote({ id: row.id, body: note })).then(() => { setNote(""); panel.markClean(); });
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <label className="flex-1">
              <span className="sr-only">{t("noteLabel")}</span>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("notePlaceholder")} maxLength={4000} className={`${inputClass} mt-0`} />
            </label>
            <button type="submit" disabled={!note.trim()} className="rounded-lg bg-ink px-4 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-50">{t("addNote")}</button>
          </form>
          {activities.length === 0 ? (
            <p className="mt-4 text-[14.5px] text-black/60">{t("noActivity")}</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {activities.map((a) => (
                <li key={a.id} className="rounded-lg bg-paper px-4 py-3">
                  <p className="text-[13.5px] font-semibold text-black/60">
                    {a.kind === "message" ? t("activityMessage", { channel: t(`channel.${a.channel ?? "copy"}`) }) : a.kind === "stage" ? t("activityStage") : a.kind === "research" ? t("activityResearch") : t("activityNote")}
                    {" · "}{dateTime.format(new Date(a.created_at))}
                  </p>
                  {a.body ? (
                    <p className="mt-1 whitespace-pre-line break-words text-[14.5px] leading-relaxed">
                      {a.kind === "stage" && (PROSPECT_STAGES as readonly string[]).includes(a.body) ? t(`stage.${a.body as ProspectStage}`) : a.body}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-8 border-t-[0.5px] border-line pt-4">
        <button type="button" onClick={() => void remove()} className="text-[14px] font-semibold text-red-dark underline-offset-2 hover:underline">{t("delete")}</button>
      </p>
    </div>
  );
}
