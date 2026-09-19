"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { saveSitePage } from "@/app/[locale]/admin/(protected)/sadrzaj/pages-actions";
import { TranslateBar } from "@/components/admin/TranslateBar";
import { useDialog } from "@/components/console/useDialog";
import { EMPTY_IDS, EMPTY_PEOPLE, TEAM_KINDS, type IdPick, type PeoplePick } from "@/lib/site-pages";
import { SECTION_FIELDS, SECTION_TYPES, blankSection, projectDrafts, type SectionAssets, type SectionDraft, type SectionType } from "@/lib/site-sections";
import { routing, type Locale } from "@/i18n/routing";

/** What the asset pickers offer: the records that exist. */
export interface PickOptions {
  team: { id: string; full_name: string; kind: string; is_public: boolean }[];
  supporters: { id: string; name: string }[];
  beneficiaries: { id: string; name: string; is_published: boolean }[];
}

const inputClass = "mt-1 w-full rounded-lg bg-paper px-3.5 py-2.5 text-[15px] outline-none ring-sea/40 focus:ring-2";
const ghost = "rounded-lg bg-paper px-3 py-1.5 text-[13.5px] font-semibold transition-colors hover:bg-mist-2 disabled:opacity-40";
const ASSET_KINDS = ["people", "supporters", "beneficiaries"] as const;
type AssetKind = (typeof ASSET_KINDS)[number];

/**
 * A page as a list of sections. Pick a structure, write the text in each
 * language, attach people, supporters or beneficiaries to any section,
 * reorder, remove. Save writes every language; nothing goes live before.
 */
export function SectionsEditor({ page, initial, options, locale, onDone }: { page: "about" | "how"; initial: SectionDraft[]; options: PickOptions; locale: Locale; onDone: () => void }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [tab, setTab] = useState<Locale>(locale);
  const [sections, setSections] = useState<SectionDraft[]>(initial);
  const [picking, setPicking] = useState(false);
  const [openId, setOpenId] = useState<string | null>(initial[0]?.id ?? null);
  const [state, setState] = useState<"idle" | "busy" | "error" | "invalid">("idle");

  const update = (id: string, patch: (s: SectionDraft) => SectionDraft) => setSections((all) => all.map((s) => (s.id === id ? patch(s) : s)));
  const setText = (id: string, key: string, value: string) => update(id, (s) => ({ ...s, text: { ...s.text, [tab]: { ...s.text[tab], [key]: value } } }));
  const move = (index: number, dir: -1 | 1) =>
    setSections((all) => {
      const next = [...all];
      const target = index + dir;
      if (target < 0 || target >= next.length) return all;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const dialog = useDialog();
  const remove = async (id: string) => {
    if (!(await dialog.confirm(t("sectionRemoveConfirm")))) return;
    setSections((all) => all.filter((s) => s.id !== id));
  };
  const add = (type: SectionType) => {
    const section = blankSection(type, routing.locales as readonly Locale[]);
    setSections((all) => [...all, section]);
    setOpenId(section.id);
    setPicking(false);
  };
  const addAsset = (id: string, kind: AssetKind) =>
    update(id, (s) => ({
      ...s,
      assets: { ...s.assets, ...(kind === "people" ? { people: s.assets?.people ?? EMPTY_PEOPLE, peopleLayout: s.assets?.peopleLayout ?? "chips" } : { [kind]: s.assets?.[kind] ?? EMPTY_IDS }) },
    }));
  const removeAsset = (id: string, kind: AssetKind) =>
    update(id, (s) => {
      const assets: SectionAssets = { ...s.assets };
      delete assets[kind];
      if (kind === "people") delete assets.peopleLayout;
      return { ...s, assets };
    });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (state === "busy") return;
    setState("busy");
    const results = await Promise.all(
      routing.locales.map((loc) =>
        saveSitePage({ page, locale: loc, content: { sections: projectDrafts(sections, loc as Locale) } }).catch(() => ({ ok: false as const, error: "server" as const })),
      ),
    );
    if (results.every((r) => r.ok)) {
      router.refresh();
      onDone();
    } else {
      setState(results.some((r) => !r.ok && r.error === "invalid") ? "invalid" : "error");
    }
  };

  const title = (s: SectionDraft) => {
    const text = s.text[tab] ?? {};
    return text.heading || text.title || text.eyebrow || (text.text ? text.text.slice(0, 60) : "") || t(`sectionType.${s.type}`);
  };
  const flatFields = () => Object.fromEntries(sections.flatMap((s) => SECTION_FIELDS[s.type].map((f) => [`${s.id}.${f.key}`, s.text[tab]?.[f.key] ?? ""])));
  const applyFlat = (loc: Locale, fields: Record<string, string>) =>
    setSections((all) =>
      all.map((s) => ({
        ...s,
        text: { ...s.text, [loc]: { ...s.text[loc], ...Object.fromEntries(SECTION_FIELDS[s.type].filter((f) => fields[`${s.id}.${f.key}`] !== undefined).map((f) => [f.key, fields[`${s.id}.${f.key}`]])) } },
      })),
    );

  return (
    <form onSubmit={submit}>
      {dialog.element}
      <p className="text-[14px] leading-relaxed text-black/60">{t("sectionsHint")}</p>
      <div role="tablist" aria-label={t("sitePageLanguage")} className="mt-3 flex gap-1 border-b-[0.5px] border-line pb-3">
        {routing.locales.map((loc) => (
          <button key={loc} type="button" role="tab" aria-selected={tab === loc} onClick={() => setTab(loc)} className={`rounded-lg px-3 py-1.5 font-mono text-[13px] uppercase tracking-wider transition-colors ${tab === loc ? "bg-ink text-paper" : "bg-paper hover:bg-mist-2"}`}>
            {loc}
          </button>
        ))}
      </div>
      <TranslateBar className="mt-3" source={tab} getFields={flatFields} apply={applyFlat} />

      <ol className="mt-4 space-y-3">
        {sections.map((s, index) => {
          const open = openId === s.id;
          const fields = SECTION_FIELDS[s.type];
          const text = s.text[tab] ?? {};
          const hasButton = fields.some((f) => f.key === "buttonLabel");
          return (
            <li key={s.id} className="rounded-lg bg-paper">
              <div className="flex flex-wrap items-center gap-2 px-3.5 py-2.5">
                <button type="button" onClick={() => setOpenId(open ? null : s.id)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span className="font-mono text-[12px] tabular-nums text-black/40">{String(index + 1).padStart(2, "0")}</span>
                  <span className="rounded-md bg-mist px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-sea">{t(`sectionType.${s.type}`)}</span>
                  <span className="truncate text-[14.5px] font-semibold">{title(s)}</span>
                  {s.assets && (s.assets.people || s.assets.supporters || s.assets.beneficiaries) ? (
                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-black/45">
                      {ASSET_KINDS.filter((k) => s.assets?.[k]).map((k) => t(`assetKind.${k}`)).join(" · ")}
                    </span>
                  ) : null}
                </button>
                <span className="flex gap-1">
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={t("sectionUp")} className={ghost}>↑</button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === sections.length - 1} aria-label={t("sectionDown")} className={ghost}>↓</button>
                  <button type="button" onClick={() => void remove(s.id)} className={`${ghost} text-red-dark`}>{t("sectionRemove")}</button>
                </span>
              </div>
              {open ? (
                <div className="space-y-4 border-t-[0.5px] border-line bg-mist/60 px-3.5 py-4">
                  {fields.map((f) => {
                    const id = `${s.id}-${f.key}`;
                    const value = text[f.key] ?? "";
                    const hint = f.kind === "lines" ? t("sitePageLinesHint") : f.kind === "records" ? t("sectionRecordsHint", { parts: (f.parts ?? []).map((p) => t(`sectionPart.${p}`)).join(" | ") }) : null;
                    return (
                      <div key={f.key}>
                        <label htmlFor={id} className="text-[13.5px] font-semibold">{t(`sectionField.${f.key}`)}</label>
                        {f.kind === "text" ? (
                          <input id={id} type="text" value={value} onChange={(e) => setText(s.id, f.key, e.target.value)} className={inputClass} />
                        ) : (
                          <textarea id={id} rows={f.kind === "long" ? 3 : Math.min(12, Math.max(3, value.split("\n").length + 1))} value={value} onChange={(e) => setText(s.id, f.key, e.target.value)} className={`${inputClass} ${f.kind === "records" ? "font-mono text-[14px]" : ""}`} />
                        )}
                        {hint ? <p className="mt-1 text-[13px] text-black/50">{hint}</p> : null}
                      </div>
                    );
                  })}
                  {hasButton ? (
                    <div>
                      <label htmlFor={`${s.id}-href`} className="text-[13.5px] font-semibold">{t("sectionHref")}</label>
                      <input id={`${s.id}-href`} type="text" value={s.href ?? ""} onChange={(e) => update(s.id, (x) => ({ ...x, href: e.target.value || undefined }))} placeholder="/transparentnost" className={`${inputClass} font-mono`} />
                      <p className="mt-1 text-[13px] text-black/50">{t("sectionHrefHint")}</p>
                    </div>
                  ) : null}
                  {s.type === "cards" ? (
                    <label className="flex items-center gap-2 text-[14px]">
                      <input type="checkbox" checked={s.columns === 3} onChange={(e) => update(s.id, (x) => ({ ...x, columns: e.target.checked ? 3 : 2 }))} className="h-4 w-4 accent-red" />
                      {t("sectionThreeColumns")}
                    </label>
                  ) : null}

                  {/* assets */}
                  <div className="border-t-[0.5px] border-line pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13.5px] font-semibold">{t("sectionAssets")}</p>
                      <span className="ml-auto flex flex-wrap gap-1.5">
                        {ASSET_KINDS.filter((k) => !s.assets?.[k]).map((k) => (
                          <button key={k} type="button" onClick={() => addAsset(s.id, k)} className={ghost}>+ {t(`assetKind.${k}`)}</button>
                        ))}
                      </span>
                    </div>
                    {s.assets?.people ? (
                      <AssetBox label={t("assetKind.people")} onRemove={() => removeAsset(s.id, "people")} t={t}>
                        <p className="text-[13px] text-black/50">{t("pickByRole")}</p>
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
                          {TEAM_KINDS.map((kind) => (
                            <label key={kind} className="inline-flex items-center gap-1.5 text-[14px]">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-red"
                                checked={s.assets?.people?.kinds.includes(kind) ?? false}
                                onChange={(e) =>
                                  update(s.id, (x) => {
                                    const p = x.assets?.people ?? EMPTY_PEOPLE;
                                    const kinds = e.target.checked ? [...p.kinds, kind] : p.kinds.filter((k) => k !== kind);
                                    return { ...x, assets: { ...x.assets, people: { ...p, kinds } } };
                                  })
                                }
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
                                  className="h-4 w-4 accent-red"
                                  checked={s.assets?.people?.ids.includes(person.id) ?? false}
                                  onChange={(e) =>
                                    update(s.id, (x) => {
                                      const p: PeoplePick = x.assets?.people ?? EMPTY_PEOPLE;
                                      const ids = e.target.checked ? [...p.ids, person.id] : p.ids.filter((v) => v !== person.id);
                                      return { ...x, assets: { ...x.assets, people: { ...p, ids } } };
                                    })
                                  }
                                />
                                {person.full_name}
                                <span className="text-black/45">· {t(`teamKindValue.${person.kind}`)}{person.is_public ? "" : ` · ${t("teamPrivate").toLowerCase()}`}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap gap-3 text-[14px]">
                          {(["cards", "chips"] as const).map((layout) => (
                            <label key={layout} className="inline-flex items-center gap-1.5">
                              <input type="radio" name={`${s.id}-layout`} className="h-4 w-4 accent-red" checked={(s.assets?.peopleLayout ?? "chips") === layout} onChange={() => update(s.id, (x) => ({ ...x, assets: { ...x.assets, peopleLayout: layout } }))} />
                              {t(`peopleLayout.${layout}`)}
                            </label>
                          ))}
                        </div>
                      </AssetBox>
                    ) : null}
                    {(["supporters", "beneficiaries"] as const).map((kind) =>
                      s.assets?.[kind] ? (
                        <AssetBox key={kind} label={t(`assetKind.${kind}`)} onRemove={() => removeAsset(s.id, kind)} t={t}>
                          {(kind === "supporters" ? options.supporters : options.beneficiaries.map((b) => ({ id: b.id, name: b.is_published ? b.name : `${b.name} · ${t("bnDraft").toLowerCase()}` }))).length === 0 ? (
                            <p className="text-[13.5px] text-black/45">{t("pickNone")}</p>
                          ) : (
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                              {(kind === "supporters" ? options.supporters : options.beneficiaries.map((b) => ({ id: b.id, name: b.is_published ? b.name : `${b.name} · ${t("bnDraft").toLowerCase()}` }))).map((row) => (
                                <label key={row.id} className="inline-flex items-center gap-1.5 text-[14px]">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 accent-red"
                                    checked={s.assets?.[kind]?.ids.includes(row.id) ?? false}
                                    onChange={(e) =>
                                      update(s.id, (x) => {
                                        const p: IdPick = x.assets?.[kind] ?? EMPTY_IDS;
                                        const ids = e.target.checked ? [...p.ids, row.id] : p.ids.filter((v) => v !== row.id);
                                        return { ...x, assets: { ...x.assets, [kind]: { ids } } };
                                      })
                                    }
                                  />
                                  {row.name}
                                </label>
                              ))}
                            </div>
                          )}
                        </AssetBox>
                      ) : null,
                    )}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* + New section */}
      <div className="mt-4">
        {picking ? (
          <div className="rounded-lg bg-paper p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13.5px] font-semibold">{t("sectionPickStructure")}</p>
              <button type="button" onClick={() => setPicking(false)} className={ghost}>{t("cancel")}</button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {SECTION_TYPES.map((type) => (
                <button key={type} type="button" onClick={() => add(type)} className="rounded-lg bg-mist px-3.5 py-3 text-left transition-colors hover:bg-mist-2">
                  <span className="block text-[14.5px] font-bold">{t(`sectionType.${type}`)}</span>
                  <span className="mt-0.5 block text-[13px] text-black/60">{t(`sectionTypeHint.${type}`)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setPicking(true)} className="rounded-lg bg-red px-4 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-red-dark">
            + {t("sectionNew")}
          </button>
        )}
      </div>

      {state === "error" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("actionError")}</p> : null}
      {state === "invalid" ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("evInvalid")}</p> : null}
      <div className="sticky bottom-0 -mx-5 mt-6 flex gap-2 border-t-[0.5px] border-line bg-mist px-5 py-3 sm:-mx-6 sm:px-6">
        <button type="submit" disabled={state === "busy"} className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60">
          {t("evSave")}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg bg-paper px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:bg-mist-2">{t("cancel")}</button>
      </div>
    </form>
  );
}

function AssetBox({ label, onRemove, t, children }: { label: string; onRemove: () => void; t: (key: string) => string; children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg bg-paper px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13.5px] font-semibold">{label}</p>
        <button type="button" onClick={onRemove} className={`${ghost} text-red-dark`}>{t("sectionRemove")}</button>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
