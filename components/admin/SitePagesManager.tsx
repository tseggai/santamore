"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { saveSitePage } from "@/app/[locale]/admin/(protected)/sadrzaj/pages-actions";
import { TranslateBar } from "@/components/admin/TranslateBar";
import { SidePanel } from "@/components/console/SidePanel";
import { EMPTY_IDS, EMPTY_PEOPLE, PAGE_FIELDS, TEAM_KINDS, isAttachment, parseField, serializeField, type IdPick, type PageContent, type PeoplePick, type SitePage, type TeamKind } from "@/lib/site-pages";
import { routing, type Locale } from "@/i18n/routing";

export interface SitePageRow {
  page: SitePage;
  locale: Locale;
  content: PageContent;
  updated_at: string;
}

/** What the attachment pickers offer: the records that exist. */
export interface PickOptions {
  team: { id: string; full_name: string; kind: TeamKind; is_public: boolean }[];
  supporters: { id: string; name: string }[];
  beneficiaries: { id: string; name: string; is_published: boolean }[];
}

const PAGES: { page: SitePage; href: string }[] = [
  { page: "about", href: "/o-nama" },
  { page: "how", href: "/kako-radimo" },
];

const inputClass = "mt-1 w-full rounded-lg bg-paper px-3.5 py-2.5 text-[15px] outline-none ring-sea/40 focus:ring-2";

/**
 * The editorial pages, one card each; a card opens the editor with a tab
 * per language. Every field starts from the shipped copy, so staff edit
 * what is there rather than start from blank.
 */
export function SitePagesManager({ rows, shipped, locale, options }: { rows: SitePageRow[]; shipped: Record<SitePage, Record<Locale, PageContent>>; locale: Locale; options: PickOptions }) {
  const t = useTranslations("admin");
  const [open, setOpen] = useState<SitePage | null>(null);
  const saved = (page: SitePage, loc: Locale) => rows.find((r) => r.page === page && r.locale === loc) ?? null;

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2">
        {PAGES.map(({ page, href }) => {
          const latest = routing.locales.map((loc) => saved(page, loc)?.updated_at ?? "").sort().at(-1) || null;
          return (
            <li key={page}>
              <button type="button" onClick={() => setOpen(page)} className="w-full rounded-lg bg-mist px-4 py-4 text-left transition-colors hover:bg-mist-2">
                <p className="text-[15.5px] font-bold">{t(`sitePage.${page}`)}</p>
                <p className="mt-1 text-[13.5px] text-black/60">
                  {latest ? t("sitePageEdited", { date: latest.slice(0, 10) }) : t("sitePageShipped")} · <span className="font-mono">{href}</span>
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      <SidePanel open={open !== null} title={open ? t(`sitePage.${open}`) : ""} onClose={() => setOpen(null)} wide>
        {open ? <PageEditor key={open} page={open} rows={rows} shipped={shipped[open]} locale={locale} options={options} onDone={() => setOpen(null)} /> : null}
      </SidePanel>
    </>
  );
}

function PageEditor({ page, rows, shipped, locale, options, onDone }: { page: SitePage; rows: SitePageRow[]; shipped: Record<Locale, PageContent>; locale: Locale; options: PickOptions; onDone: () => void }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [tab, setTab] = useState<Locale>(locale);
  const fields = PAGE_FIELDS[page];
  const textFields = fields.filter((spec) => !isAttachment(spec));
  const attachmentFields = fields.filter(isAttachment);
  // Attachments are the same in every language: read from whichever row has them.
  const savedAttachment = (key: string) => rows.find((r) => r.page === page && r.content[key] !== undefined)?.content[key];
  const [attachments, setAttachments] = useState<Record<string, PeoplePick | IdPick>>(() =>
    Object.fromEntries(
      attachmentFields.map((spec) => [spec.key, (savedAttachment(spec.key) as PeoplePick | IdPick | undefined) ?? (spec.kind === "people" ? EMPTY_PEOPLE : EMPTY_IDS)]),
    ),
  );
  const setPeople = (key: string, patch: Partial<PeoplePick>) => setAttachments((a) => ({ ...a, [key]: { ...(a[key] as PeoplePick), ...patch } }));
  const toggleId = (key: string, id: string) =>
    setAttachments((a) => {
      const current = a[key] as IdPick;
      const ids = current.ids.includes(id) ? current.ids.filter((v) => v !== id) : [...current.ids, id];
      return { ...a, [key]: { ...current, ids } };
    });
  // One draft per language, each field as text; the saved value wins, else the shipped copy.
  const initial = (): Record<Locale, Record<string, string>> =>
    Object.fromEntries(
      routing.locales.map((loc) => {
        const saved = rows.find((r) => r.page === page && r.locale === loc)?.content ?? {};
        return [loc, Object.fromEntries(textFields.map((spec) => [spec.key, serializeField(spec, saved[spec.key] ?? shipped[loc]?.[spec.key])]))];
      }),
    ) as Record<Locale, Record<string, string>>;
  const [drafts, setDrafts] = useState(initial);
  const [state, setState] = useState<"idle" | "busy" | "error" | "invalid">("idle");
  const set = (key: string, value: string) => setDrafts((d) => ({ ...d, [tab]: { ...d[tab], [key]: value } }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (state === "busy") return;
    setState("busy");
    // Every language saves; a field left empty falls back to the shipped copy.
    const results = await Promise.all(
      routing.locales.map((loc) =>
        saveSitePage({
          page,
          locale: loc,
          content: {
            ...Object.fromEntries(textFields.map((spec) => [spec.key, parseField(spec, drafts[loc][spec.key] ?? "")]).filter(([, v]) => v !== undefined)),
            ...attachments,
          },
        }).catch(() => ({ ok: false as const, error: "server" as const })),
      ),
    );
    if (results.every((r) => r.ok)) {
      router.refresh();
      onDone();
    } else {
      setState(results.some((r) => !r.ok && r.error === "invalid") ? "invalid" : "error");
    }
  };

  return (
    <form onSubmit={submit}>
      <p className="text-[14px] leading-relaxed text-black/60">{t("sitePageHint")}</p>
      <div role="tablist" aria-label={t("sitePageLanguage")} className="mt-3 flex gap-1 border-b-[0.5px] border-line pb-3">
        {routing.locales.map((loc) => (
          <button
            key={loc}
            type="button"
            role="tab"
            aria-selected={tab === loc}
            onClick={() => setTab(loc)}
            className={`rounded-lg px-3 py-1.5 font-mono text-[13px] uppercase tracking-wider transition-colors ${tab === loc ? "bg-ink text-paper" : "bg-paper hover:bg-mist-2"}`}
          >
            {loc}
          </button>
        ))}
      </div>
      <TranslateBar
        className="mt-3"
        source={tab}
        getFields={() => Object.fromEntries(textFields.map((spec) => [spec.key, drafts[tab][spec.key] ?? ""]))}
        apply={(loc, translated) => setDrafts((d) => ({ ...d, [loc]: { ...d[loc], ...translated } }))}
      />
      <div className="mt-4 space-y-4">
        {textFields.map((spec) => {
          const id = `sp-${page}-${spec.key}`;
          const value = drafts[tab][spec.key] ?? "";
          const hint =
            spec.kind === "lines" ? t("sitePageLinesHint") : spec.kind === "records" ? t("sitePageRecordsHint", { parts: (spec.parts ?? []).map((p) => t(`pagePart.${p}`)).join(" · ") }) : null;
          return (
            <div key={spec.key}>
              <label htmlFor={id} className="text-[13.5px] font-semibold">{t(`pageField.${page}.${spec.key}`)}</label>
              {spec.kind === "text" ? (
                <input id={id} type="text" value={value} onChange={(e) => set(spec.key, e.target.value)} className={inputClass} />
              ) : (
                <textarea
                  id={id}
                  rows={spec.kind === "long" ? 3 : Math.min(12, Math.max(3, value.split("\n").length + 1))}
                  value={value}
                  onChange={(e) => set(spec.key, e.target.value)}
                  className={`${inputClass} ${spec.kind === "records" ? "font-mono text-[14px]" : ""}`}
                />
              )}
              {hint ? <p className="mt-1 text-[13px] text-black/50">{hint}</p> : null}
            </div>
          );
        })}
      </div>
      {attachmentFields.length > 0 ? (
        <div className="mt-6 border-t-[0.5px] border-line pt-5">
          <p className="text-[14.5px] font-bold">{t("pageAttachHeading")}</p>
          <p className="mt-1 text-[13.5px] text-black/60">{t("pageAttachHint")}</p>
          <div className="mt-4 space-y-5">
            {attachmentFields.map((spec) => {
              const value = attachments[spec.key];
              const checkbox = "h-4 w-4 accent-red";
              if (spec.kind === "people") {
                const pick = value as PeoplePick;
                return (
                  <fieldset key={spec.key} className="rounded-lg bg-paper px-3.5 py-3">
                    <legend className="px-1 text-[13.5px] font-semibold">{t(`pageField.${page}.${spec.key}`)}</legend>
                    <p className="text-[13px] text-black/50">{t("pickByRole")}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
                      {TEAM_KINDS.map((kind) => (
                        <label key={kind} className="inline-flex items-center gap-1.5 text-[14px]">
                          <input
                            type="checkbox"
                            className={checkbox}
                            checked={pick.kinds.includes(kind)}
                            onChange={(e) => setPeople(spec.key, { kinds: e.target.checked ? [...pick.kinds, kind] : pick.kinds.filter((k) => k !== kind) })}
                          />
                          {t(`teamKindValue.${kind}`)}
                        </label>
                      ))}
                    </div>
                    <p className="mt-3 text-[13px] text-black/50">{t("pickByName")}</p>
                    {options.team.length === 0 ? (
                      <p className="mt-1 text-[13.5px] text-black/45">{t("pickNoPeople")}</p>
                    ) : (
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
                        {options.team.map((person) => (
                          <label key={person.id} className="inline-flex items-center gap-1.5 text-[14px]">
                            <input
                              type="checkbox"
                              className={checkbox}
                              checked={pick.ids.includes(person.id)}
                              onChange={(e) => setPeople(spec.key, { ids: e.target.checked ? [...pick.ids, person.id] : pick.ids.filter((v) => v !== person.id) })}
                            />
                            {person.full_name}
                            <span className="text-black/45">· {t(`teamKindValue.${person.kind}`)}{person.is_public ? "" : ` · ${t("teamPrivate").toLowerCase()}`}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </fieldset>
                );
              }
              const pick = value as IdPick;
              const list = spec.kind === "supporters" ? options.supporters : options.beneficiaries.map((b) => ({ id: b.id, name: b.is_published ? b.name : `${b.name} · ${t("bnDraft").toLowerCase()}` }));
              return (
                <fieldset key={spec.key} className="rounded-lg bg-paper px-3.5 py-3">
                  <legend className="px-1 text-[13.5px] font-semibold">{t(`pageField.${page}.${spec.key}`)}</legend>
                  {list.length === 0 ? (
                    <p className="text-[13.5px] text-black/45">{t("pickNone")}</p>
                  ) : (
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                      {list.map((row) => (
                        <label key={row.id} className="inline-flex items-center gap-1.5 text-[14px]">
                          <input type="checkbox" className={checkbox} checked={pick.ids.includes(row.id)} onChange={() => toggleId(spec.key, row.id)} />
                          {row.name}
                        </label>
                      ))}
                    </div>
                  )}
                </fieldset>
              );
            })}
          </div>
        </div>
      ) : null}
      {state === "error" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("actionError")}</p> : null}
      {state === "invalid" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("evInvalid")}</p> : null}
      <div className="sticky bottom-0 -mx-5 mt-6 flex gap-2 border-t-[0.5px] border-line bg-mist px-5 py-3 sm:-mx-6 sm:px-6">
        <button type="submit" disabled={state === "busy"} className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60">
          {t("evSave")}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg bg-paper px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:bg-mist-2">
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
