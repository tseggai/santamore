"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { saveLegalPack, translatePackTexts } from "@/app/[locale]/admin/(protected)/registracija/actions";
import {
  FOUNDER_IDS, LANG_LABELS, PACK_LANGS, docTexts, formFieldIds, i18nKey, incompleteFields, initialFields, isEmptyOptional, isIncomplete, isOptionalEmpty,
  isSourceLang, keepsPlaceholders, normalizeFieldState, resolveFields, sameEverywhere, sanitizeDraftHtml, segments, splitTopLevel,
  type DocTexts, type FieldState, type LegalPack, type PackBlock, type PackLang, type SourceLang,
} from "@/lib/legal-pack";
import type { Locale } from "@/i18n/routing";

/*
 * The registration pack in the console: the five Ministry forms with
 * their blanks filled in (shared by every form), the founding checklist,
 * and the policy drafts. One language on screen at a time. The templates
 * exist in Montenegrin and English; Russian and Turkish are translated on
 * first use, document by document, and cached for the whole team. A
 * blank edited in one language is translated into the others when they
 * are next shown. The Complete panel lists a form's blanks with a hint
 * each and fills the document behind it as you type. Save writes the
 * pack to the database; Print gives the document alone, in black.
 */

export type SavedRows = Record<string, { value: unknown; updatedAt: string }>;

interface Props {
  pack: LegalPack;
  saved: SavedRows;
  locale: Locale;
}

type Notice = { tone: "ok" | "warn"; text: string } | null;
type Job = { done: number; total: number };

const CHUNK_ITEMS = 25;
const CHUNK_CHARS = 9_000;

function readSavedFields(pack: LegalPack, saved: SavedRows): { fields: Record<string, FieldState>; migrated: boolean } {
  const base = initialFields(pack);
  const row = saved.fields?.value as Record<string, unknown> | undefined;
  if (!row || typeof row !== "object") return { fields: base, migrated: false };
  for (const [id, f] of Object.entries(row)) {
    if (!base[id] || !f) continue;
    base[id] = normalizeFieldState(f, pack.fields[id], base[id]);
  }
  return { fields: base, migrated: migrateApplicant(row, base) };
}

/**
 * The Application's applicant block was once a single free-text blank.
 * It is now built from the shared blanks, so a saved free text is split
 * into them once (address, chair, phone, email), where those are still
 * at their placeholder, and offered for saving.
 */
function migrateApplicant(row: Record<string, unknown>, fields: Record<string, FieldState>): boolean {
  const old = row.applicant as { me?: unknown; en?: unknown } | undefined;
  if (!old || fields.applicant) return false;
  const isPlaceholder = (id: string) => /^\s*(\[|$)/.test(fields[id]?.me ?? "") && /^\s*(\[|$)/.test(fields[id]?.en ?? "");
  let changed = false;
  const set = (id: string, text: string) => {
    const value = text.trim();
    if (!value || value.startsWith("[") || !fields[id] || !isPlaceholder(id)) return;
    fields[id] = sameEverywhere(value);
    changed = true;
  };
  for (const text of [old.en, old.me]) {
    if (typeof text !== "string") continue;
    const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (lines[1] && !/^(represented|zastupano)/i.test(lines[1])) set("addr", lines[1]);
    for (const line of lines) {
      const chair = line.match(/^(?:represented by the Chair of the Founding Assembly|zastupano po predsjedavajućem Osnivačke skupštine):?\s*(.+)$/i);
      if (chair) set("chair", chair[1]);
      const phone = line.match(/^tel\.?:?\s*(.+)$/i);
      if (phone) set("phone", phone[1]);
      const email = line.match(/^(?:email|e-pošta|e-mail):?\s*(.+)$/i);
      if (email) set("email", email[1]);
    }
  }
  return changed;
}

function readSavedChecks(saved: SavedRows): Record<string, boolean> {
  const row = saved.checks?.value as Record<string, boolean> | undefined;
  return row && typeof row === "object" ? { ...row } : {};
}

function readSavedDrafts(pack: LegalPack, saved: SavedRows): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of pack.drafts) {
    const row = saved[`draft:${d.id}`]?.value as { html?: string } | undefined;
    if (row && typeof row.html === "string") out[d.id] = row.html;
  }
  return out;
}

function readSavedI18n(saved: SavedRows): Record<string, DocTexts> {
  const out: Record<string, DocTexts> = {};
  for (const [key, row] of Object.entries(saved)) {
    if (!key.startsWith("i18n:") || !row.value || typeof row.value !== "object") continue;
    out[key] = row.value as DocTexts;
  }
  return out;
}

function chunk(texts: DocTexts): DocTexts[] {
  const out: DocTexts[] = [];
  let cur: DocTexts = {}; let n = 0; let chars = 0;
  for (const [k, v] of Object.entries(texts)) {
    if (n >= CHUNK_ITEMS || (chars + v.length > CHUNK_CHARS && n > 0)) { out.push(cur); cur = {}; n = 0; chars = 0; }
    cur[k] = v; n++; chars += v.length;
  }
  if (n) out.push(cur);
  return out;
}

const docKeyOf = (doc: string) => (doc === "guide" ? "guide" : doc.startsWith("draft:") ? doc : `form:${doc}`);

export function LegalPackApp({ pack, saved, locale }: Props) {
  const t = useTranslations("admin.legalPack");
  const [lang, setLang] = useState<PackLang>(locale === "en" ? "en" : locale === "ru" ? "ru" : "me");
  const [both, setBoth] = useState(false);
  const [doc, setDoc] = useState<string>(pack.forms[0]?.id ?? "01");
  const [loaded] = useState(() => readSavedFields(pack, saved));
  const [fields, setFields] = useState(loaded.fields);
  const [checks, setChecks] = useState(() => readSavedChecks(saved));
  const draftsRef = useRef(readSavedDrafts(pack, saved));
  const [i18n, setI18n] = useState<Record<string, DocTexts>>(() => readSavedI18n(saved));
  const jobsRef = useRef<Set<string>>(new Set());
  const [job, setJob] = useState<Job | null>(null);
  const [dirty, setDirty] = useState<Record<string, true>>(loaded.migrated ? { fields: true } : {});
  const [busy, setBusy] = useState<"saving" | "translating" | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [complete, setComplete] = useState(false);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [printWarn, setPrintWarn] = useState<string[] | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(() => {
    const times = Object.values(saved).map((r) => r.updatedAt).sort();
    return times.at(-1) ?? null;
  });

  const form = pack.forms.find((f) => f.id === doc) ?? null;
  const draft = doc.startsWith("draft:") ? pack.drafts.find((d) => `draft:${d.id}` === doc) ?? null : null;
  const guide = doc === "guide" ? pack.guide ?? null : null;
  const isDirty = Object.keys(dirty).length > 0;
  const src: SourceLang = lang === "me" ? "me" : "en";
  /** What the documents show: person blanks that follow a founder take that founder's values. */
  const shown = useMemo(() => resolveFields(pack, fields), [pack, fields]);
  const staleNow = useMemo(() => Object.entries(shown).filter(([id, f]) => f.stale.includes(lang) && !pack.fields[id]?.meOnly && !pack.fields[id]?.isLink).map(([id]) => id), [shown, lang, pack.fields]);

  // ---- texts in the language on screen -------------------------------------------------
  const labels = i18n[i18nKey("labels", lang)];
  const tx = useCallback((docKey: string, path: string, source: string): string => {
    if (isSourceLang(lang)) return source;
    return i18n[i18nKey(docKey, lang)]?.[path] ?? source;
  }, [i18n, lang]);
  const labelOf = useCallback((id: string): string => {
    const f = pack.fields[id];
    if (!f) return id;
    if (lang === "me") return f.label.me;
    return (isSourceLang(lang) ? undefined : labels?.[`f:${id}`]) ?? f.label.en ?? f.label.me;
  }, [pack.fields, lang, labels]);
  const hintOf = useCallback((id: string): string => {
    const f = pack.fields[id];
    if (!f?.hint) return "";
    if (lang === "me") return f.hint.me;
    return (isSourceLang(lang) ? undefined : labels?.[`f:${id}.h`]) ?? f.hint.en ?? f.hint.me;
  }, [pack.fields, lang, labels]);
  const titleOf = useCallback((docKey: string, source: { me: string; en: string }): string => {
    if (lang === "me") return source.me;
    return (isSourceLang(lang) ? undefined : labels?.[`${docKey}.t`]) ?? source.en;
  }, [lang, labels]);

  // ---- on-demand translation of whole documents ---------------------------------------
  const ensureDoc = useCallback(async (docKey: string, to: PackLang) => {
    const key = i18nKey(docKey, to);
    if (isSourceLang(to) || i18n[key] || jobsRef.current.has(key)) return;
    const draftId = docKey.startsWith("draft:") ? docKey.slice(6) : null;
    const source = docTexts(pack, docKey, draftId ? draftsRef.current[draftId] : undefined);
    const parts = chunk(source);
    if (parts.length === 0) return;
    jobsRef.current.add(key);
    setJob({ done: 0, total: parts.length });
    const result: DocTexts = {};
    let failed: string | null = null;
    for (let i = 0; i < parts.length; i++) {
      const res = await translatePackTexts({ from: "en", to, texts: parts[i] }).catch(() => ({ ok: false as const, error: "server" as const }));
      if (!res.ok) { failed = res.error === "unconfigured" ? t("translateUnconfigured") : t("translateFailed"); break; }
      for (const [k, v] of Object.entries(res.texts)) result[k] = docKey.startsWith("form:") && !keepsPlaceholders(source[k] ?? "", v) ? source[k] : v;
      setJob({ done: i + 1, total: parts.length });
    }
    jobsRef.current.delete(key);
    setJob(null);
    if (failed) { setNotice({ tone: "warn", text: failed }); return; }
    setI18n((prev) => ({ ...prev, [key]: result }));
    // The cache is for the whole team: saved at once, apart from the pack's own Save.
    const saved = await saveLegalPack({ key, value: result }).catch(() => ({ ok: false as const, error: "server" as const }));
    if (!saved.ok) setNotice({ tone: "warn", text: t("cacheFailed") });
  }, [i18n, pack, t]);

  useEffect(() => {
    if (isSourceLang(lang)) return;
    void ensureDoc("labels", lang);
    void ensureDoc(docKeyOf(doc), lang);
  }, [lang, doc, ensureDoc]);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const markDirty = (key: string) => setDirty((d) => (d[key] ? d : { ...d, [key]: true }));

  // ---- editing blanks ----------------------------------------------------------------
  const setField = (id: string, text: string) => {
    setFields((prev) => {
      const f = prev[id];
      const meta = pack.fields[id];
      const linked = meta?.link && prev[meta.link]?.me ? meta.link : null;
      if (!f || (f[lang] === text && !linked)) return prev;
      const next: FieldState = meta?.neutral || meta?.meOnly
        ? sameEverywhere(text)
        : { ...f, [lang]: text, stale: PACK_LANGS.filter((l) => l !== lang) };
      // Typing into a blank that followed a founder makes it its own again.
      return linked ? { ...prev, [id]: next, [linked]: sameEverywhere("") } : { ...prev, [id]: next };
    });
    markDirty("fields");
  };

  /** Make a person blank (and its JMB and address, where it has them) follow a founder, or none. */
  const setLink = (linkId: string, founder: string) => {
    setFields((prev) => ({ ...prev, [linkId]: sameEverywhere(founder) }));
    markDirty("fields");
  };

  /** Bring every blank whose `to` value is out of date up to date from a language that is current. */
  const translateStale = async (to: PackLang): Promise<boolean> => {
    const need = Object.entries(fields).filter(([id, f]) => f.stale.includes(to) && !pack.fields[id]?.meOnly && !pack.fields[id]?.isLink);
    if (need.length === 0) return true;
    const next = { ...fields };
    const ask: Partial<Record<PackLang, DocTexts>> = {};
    for (const [id, f] of need) {
      const from = PACK_LANGS.find((l) => l !== to && !f.stale.includes(l) && f[l].trim() !== "") ?? null;
      const fresh = { ...f, stale: f.stale.filter((l) => l !== to) };
      if (!from) next[id] = { ...fresh, [to]: "" };
      else if (pack.fields[id]?.neutral) next[id] = { ...fresh, [to]: f[from] };
      else (ask[from] ??= {})[id] = f[from];
    }
    setBusy("translating");
    const count = Object.values(ask).reduce((n, texts) => n + Object.keys(texts).length, 0);
    setNotice({ tone: "ok", text: t("translating", { n: count }) });
    let failed: string | null = null;
    for (const [from, texts] of Object.entries(ask) as [PackLang, DocTexts][]) {
      for (const part of chunk(texts)) {
        if (failed) break;
        const res = await translatePackTexts({ from, to, texts: part }).catch(() => ({ ok: false as const, error: "server" as const }));
        if (!res.ok) { failed = res.error === "unconfigured" ? t("translateUnconfigured") : t("translateFailed"); break; }
        for (const [id, text] of Object.entries(res.texts)) if (next[id]) next[id] = { ...next[id], [to]: text, stale: next[id].stale.filter((l) => l !== to) };
      }
    }
    setFields(next);
    markDirty("fields");
    setBusy(null);
    setNotice(failed ? { tone: "warn", text: failed } : { tone: "ok", text: t("translated", { n: count }) });
    return !failed;
  };

  const switchLang = async (to: PackLang) => {
    if (to === lang || busy) return;
    await translateStale(to);
    setLang(to);
  };

  // ---- saving and printing ----------------------------------------------------------
  const save = async () => {
    if (busy || !isDirty) return;
    setBusy("saving");
    setNotice(null);
    let failed: string | null = null;
    let last: string | null = null;
    for (const key of Object.keys(dirty)) {
      const value = key === "fields" ? fields : key === "checks" ? checks : { html: sanitizeDraftHtml(draftsRef.current[key.slice("draft:".length)] ?? "") ?? "" };
      const result = await saveLegalPack({ key, value }).catch(() => ({ ok: false as const, error: "server" as const }));
      if (result.ok) {
        last = result.updatedAt;
        setDirty((d) => { const rest = { ...d }; delete rest[key]; return rest; });
      } else {
        failed = result.error === "forbidden" ? t("saveForbidden") : result.error === "missing_table" ? t("saveMissingTable") : t("saveFailed");
        break;
      }
    }
    if (last) setSavedAt(last);
    setBusy(null);
    setNotice(failed ? { tone: "warn", text: failed } : { tone: "ok", text: t("saved") });
  };

  const doPrint = () => {
    setPrintWarn(null);
    const title = document.title;
    document.title = `${form?.file ?? draft?.file ?? guide?.file ?? "santamore"}-${lang}`;
    // Let the dialog close before the print dialog takes over.
    setTimeout(() => { window.print(); document.title = title; }, 50);
  };
  const print = () => {
    const missing = form ? incompleteFields(form, lang, shown, pack.fields).map(labelOf) : [];
    if (form && formIds.includes("f2_name") && namedFounders < 3) missing.push(t("fewFounders", { n: namedFounders }));
    if (missing.length === 0) { doPrint(); return; }
    setPrintWarn(missing);
  };

  const savedLabel = savedAt ? new Date(savedAt).toLocaleString(locale === "me" ? "sr-Latn-ME" : locale, { dateStyle: "short", timeStyle: "short" }) : null;
  const formIds = useMemo(() => (form ? formFieldIds(form, lang) : []), [form, lang]);
  const founderOf = (id: string) => { const m = id.match(/^(f[2-5])_/); return m ? m[1] : null; };
  const founderHasValue = (fid: string) => ["name", "jmb", "addr"].some((part) => (shown[`${fid}_${part}`]?.[lang] ?? "").trim() !== "");
  /** The panel's blanks: an optional founder appears once named, or when added with the button. */
  const panelIds = useMemo(() => formIds.filter((id) => { const fid = founderOf(id); return !fid || founderHasValue(fid) || revealed.includes(fid); }), [formIds, revealed, shown, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const nextFounder = FOUNDER_IDS.find((fid) => fid !== "f1" && formIds.some((id) => id.startsWith(`${fid}_`)) && !founderHasValue(fid) && !revealed.includes(fid)) ?? null;
  const panelDone = panelIds.filter((id) => !isIncomplete(shown[id]?.[lang] ?? "") || isOptionalEmpty(id, shown, pack.fields, lang)).length;
  const namedFounders = FOUNDER_IDS.filter((fid) => !isIncomplete(shown[`${fid}_name`]?.[lang] ?? "")).length;
  const missingNow = useMemo(() => (form ? incompleteFields(form, lang, shown, pack.fields) : []), [form, lang, shown, pack.fields]);
  const docKey = docKeyOf(doc);
  const waitingForDoc = !isSourceLang(lang) && !i18n[i18nKey(docKey, lang)];

  const blockProps = {
    lang, src, pack, fields: shown, checks, onField: setField, onLink: setLink,
    onCheck: (id: string, on: boolean) => { setChecks((c) => ({ ...c, [id]: on })); markDirty("checks"); },
    placeholderHint: t("fieldEmpty"), staleHint: t("staleHint"), pickerLabel: t("samePerson"), pickerNone: t("otherPerson"),
    founderLabel: (n: number) => t("founderN", { n }), labelOf,
  };

  return (
    <div className="lp-app md:grid md:grid-cols-[14rem_minmax(0,1fr)] md:gap-10">
      <style>{CSS}</style>

      {/* Document list: a select on the phone, a list on desktop. */}
      <nav aria-label={t("documents")} className="lp-nav">
        <label className="block md:hidden">
          <span className="type-eyebrow block text-black/60">{t("documents")}</span>
          <select value={doc} onChange={(e) => setDoc(e.target.value)} className="mt-1 w-full rounded-brand bg-mist px-3 py-2 text-[15px]">
            {pack.guide ? <optgroup label={t("guide")}><option value="guide">{titleOf("guide", pack.guide.title)}</option></optgroup> : null}
            <optgroup label={t("forms")}>
              {pack.forms.map((f) => <option key={f.id} value={f.id}>{f.id} · {titleOf(`form:${f.id}`, f.title)}</option>)}
            </optgroup>
            <optgroup label={t("drafts")}>
              {pack.drafts.map((d) => <option key={d.id} value={`draft:${d.id}`}>{titleOf(`draft:${d.id}`, d.title)}</option>)}
            </optgroup>
          </select>
        </label>
        <div className="hidden md:sticky md:top-6 md:block md:max-h-[calc(100vh-3rem)] md:overflow-y-auto md:overscroll-contain md:pr-2">
          {pack.guide ? (
            <section className="pb-5">
              <p className="type-eyebrow text-black/60">{t("guide")}</p>
              <ul className="mt-2 flex flex-col gap-1">
                <NavItem active={doc === "guide"} onClick={() => setDoc("guide")} label={titleOf("guide", pack.guide.title)} />
              </ul>
            </section>
          ) : null}
          <section className="border-t-[0.5px] border-black/20 py-5">
            <p className="type-eyebrow text-black/60">{t("forms")}</p>
            <ul className="mt-2 flex flex-col gap-1">
              {pack.forms.map((f) => <NavItem key={f.id} active={doc === f.id} onClick={() => setDoc(f.id)} label={`${f.id} · ${titleOf(`form:${f.id}`, f.title)}`} />)}
            </ul>
          </section>
          <section className="border-t-[0.5px] border-black/20 pt-5">
            <p className="type-eyebrow text-black/60">{t("drafts")}</p>
            <ul className="mt-2 flex flex-col gap-1">
              {pack.drafts.map((d) => <NavItem key={d.id} active={doc === `draft:${d.id}`} onClick={() => setDoc(`draft:${d.id}`)} label={titleOf(`draft:${d.id}`, d.title)} />)}
            </ul>
          </section>
        </div>
      </nav>

      <div className="mt-6 min-w-0 md:mt-0">
        {/* Toolbar */}
        <div className="lp-toolbar flex flex-wrap items-center gap-2 rounded-brand bg-mist px-3.5 py-3">
          <div role="group" aria-label={t("language")} className="flex overflow-hidden rounded-brand bg-paper">
            {PACK_LANGS.map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} disabled={busy !== null} onClick={() => void switchLang(l)}
                className={`px-3 py-1.5 text-[14px] font-semibold transition-colors disabled:opacity-50 ${lang === l ? "bg-sea text-paper" : "text-black/70 hover:bg-mist-2"}`}>
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
          {draft && isSourceLang(lang) ? (
            <label className="flex items-center gap-1.5 text-[14px] text-black/70">
              <input type="checkbox" checked={both} onChange={(e) => setBoth(e.target.checked)} className="h-4 w-4 accent-sea" />
              {t("both")}
            </label>
          ) : null}
          {staleNow.length > 0 && !busy ? (
            <button type="button" onClick={() => void translateStale(lang)} className="rounded-brand bg-paper px-3 py-1.5 text-[14px] font-semibold text-red-dark hover:bg-mist-2">
              {t("translateNow", { n: staleNow.length })}
            </button>
          ) : null}
          <span className="grow" />
          {form && formIds.length > 0 ? (
            <button type="button" onClick={() => setComplete(true)} aria-expanded={complete} className="rounded-brand bg-sea px-3.5 py-1.5 text-[14px] font-bold text-paper hover:bg-sea-2">
              {t("complete")}{missingNow.length ? ` · ${missingNow.length}` : ""}
            </button>
          ) : null}
          <button type="button" onClick={print} disabled={busy !== null} className="rounded-brand bg-paper px-3 py-1.5 text-[14px] font-semibold text-black/80 hover:bg-mist-2 disabled:opacity-50">
            {t("print")}
          </button>
          <button type="button" onClick={() => void save()} disabled={busy !== null || !isDirty} className="rounded-brand bg-red px-3.5 py-1.5 text-[14px] font-bold text-paper hover:bg-red-dark disabled:opacity-40">
            {busy === "saving" ? t("saving") : isDirty ? t("save") : t("nothingToSave")}
          </button>
        </div>
        <p role="status" aria-live="polite" className={`mt-3 min-h-5 text-[13.5px] ${notice?.tone === "warn" ? "text-red-dark" : "text-black/60"}`}>
          {job ? t("translatingDoc", { lang: LANG_LABELS[lang], done: job.done, total: job.total }) : notice?.text ?? (savedLabel ? t("lastSaved", { when: savedLabel }) : t("neverSaved"))}
        </p>

        {printWarn ? (
          <div role="alertdialog" aria-modal="true" aria-labelledby="lp-print-title" className="lp-screen fixed inset-0 z-50 flex items-center justify-center bg-ink/55 px-4">
            <div className="w-full max-w-md rounded-brand bg-paper p-6 shadow-none">
              <h3 id="lp-print-title" className="text-[17px] font-bold">{t("printIncompleteTitle", { n: printWarn.length })}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-black/60">{t("printIncompleteHint")}</p>
              <ul className="mt-3 max-h-56 overflow-y-auto rounded-brand bg-mist px-4 py-3 text-[14px]">
                {printWarn.map((label, i) => <li key={i} className="py-0.5 text-[#0B57D0]">{label}</li>)}
              </ul>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button type="button" autoFocus onClick={() => setPrintWarn(null)} className="rounded-brand bg-mist px-3.5 py-2 text-[14px] font-semibold text-black/80 hover:bg-mist-2">{t("printBack")}</button>
                <button type="button" onClick={doPrint} className="rounded-brand bg-red px-3.5 py-2 text-[14px] font-bold text-paper hover:bg-red-dark">{t("printAnyway")}</button>
              </div>
            </div>
          </div>
        ) : null}

        {/* The document */}
        <div id="legal-doc" className={`lp-doc mt-8 ${(draft && both) || guide || !isSourceLang(lang) ? "lp-both" : ""}`} lang={guide ? "en" : lang === "me" ? "sr-Latn-ME" : lang} data-lang={lang}>
          {waitingForDoc && job ? <p className="lp-screen mb-4 rounded-brand bg-sand px-4 py-3 text-[14px] text-black/70">{t("translatingDoc", { lang: LANG_LABELS[lang], done: job.done, total: job.total })}</p> : null}
          {guide ? (
            <>
              <div className="lp-head">
                <p className="lp-file">{guide.file}</p>
                <h2 className="lp-title">{titleOf("guide", guide.title)}</h2>
                <p className="lp-subtitle lp-screen">{t("guideHint")}</p>
              </div>
              <div className="lp-prose lp-guide" dangerouslySetInnerHTML={{ __html: isSourceLang(lang) ? guide.html : translatedHtml(guide.html, i18n[i18nKey("guide", lang)]) }} />
            </>
          ) : form ? (
            <>
              <div className="lp-head">
                <p className="lp-file">{form.file}-{lang}</p>
                <h2 className="lp-title">{tx(docKey, "t", form.title[src])}</h2>
                <p className="lp-subtitle">{tx(docKey, "s", form.subtitle[src])}</p>
                <p className="lp-note" dangerouslySetInnerHTML={{ __html: tx(docKey, "n", form.note[src]) }} />
              </div>
              {form.blocks.map((block, i) => (
                <Block key={i} block={block} index={i} docKey={docKey} tx={tx} {...blockProps} />
              ))}
            </>
          ) : draft ? (
            <>
              <div className="lp-head">
                <p className="lp-file">{draft.file}-{lang}</p>
                <h2 className="lp-title">{titleOf(docKey, draft.title)}</h2>
                <p className="lp-subtitle lp-screen">{isSourceLang(lang) ? t("draftHint") : t("draftReadOnly")}</p>
              </div>
              {isSourceLang(lang) ? (
                <div
                  key={draft.id}
                  className="lp-prose"
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck={false}
                  aria-label={draft.title[src]}
                  dangerouslySetInnerHTML={{ __html: draftsRef.current[draft.id] ?? draft.html }}
                  onInput={(e) => { draftsRef.current[draft.id] = e.currentTarget.innerHTML; markDirty(`draft:${draft.id}`); }}
                />
              ) : (
                <div key={`${draft.id}-${lang}`} className="lp-prose" dangerouslySetInnerHTML={{ __html: translatedHtml(draftsRef.current[draft.id] ?? draft.html, i18n[i18nKey(docKey, lang)], true) }} />
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* The Complete panel: every blank of the form, with a hint, filling the document behind as you type. */}
      {complete && form ? (
        <aside className="lp-screen fixed inset-y-0 right-0 z-40 flex w-full max-w-[440px] flex-col bg-paper shadow-[-16px_0_48px_rgba(14,58,70,0.18)] motion-safe:animate-[panel-in_220ms_ease-out]" aria-label={t("completeTitle")}>
          <div className="flex shrink-0 items-center gap-3 border-b-[0.5px] border-line px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[17px] font-bold">{t("completeTitle")}</h2>
              <p className="text-[13px] text-black/60">{t("completeProgress", { done: panelDone, total: panelIds.length })}</p>
            </div>
            <button type="button" onClick={() => setComplete(false)} aria-label={t("close")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-[19px] leading-none text-black/70 transition-colors hover:bg-mist-2 hover:text-sea">×</button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-mist px-5 py-5">
            <div className="flex flex-col gap-4">
              {panelIds.map((id, i) => (
                <div key={id} className={founderOf(id) && !founderOf(panelIds[i - 1] ?? "") ? "border-t-[0.5px] border-black/20 pt-4" : undefined}>
                  <CompleteField id={id} lang={lang} pack={pack} fields={shown} raw={fields} label={labelOf(id)} hint={hintOf(id)} onField={setField} onLink={setLink} pickerNone={t("otherPerson")} founderLabel={(n) => t("founderN", { n })} sameAs={t("samePerson")} />
                </div>
              ))}
              {nextFounder ? (
                <button type="button" onClick={() => setRevealed((r) => [...r, nextFounder])} className="self-start rounded-brand bg-paper px-3.5 py-2 text-[14px] font-semibold text-sea hover:bg-mist-2">
                  + {t("addFounder")}
                </button>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 border-t-[0.5px] border-line px-5 py-3">
            <button type="button" onClick={() => setComplete(false)} className="rounded-brand bg-mist px-3.5 py-2 text-[14px] font-semibold text-black/80 hover:bg-mist-2">{t("close")}</button>
            <button type="button" onClick={() => void save()} disabled={busy !== null || !isDirty} className="rounded-brand bg-red px-3.5 py-2 text-[14px] font-bold text-paper hover:bg-red-dark disabled:opacity-40">
              {busy === "saving" ? t("saving") : isDirty ? t("save") : t("nothingToSave")}
            </button>
          </div>
        </aside>
      ) : null}
    </div>
  );
}

/** The value in the language on screen; while its translation is still to come, the value in a language that is current. */
function displayValue(f: FieldState, lang: PackLang): string {
  if (f[lang] !== "" || !f.stale.includes(lang)) return f[lang];
  const from = PACK_LANGS.find((l) => !f.stale.includes(l) && f[l].trim() !== "");
  return from ? f[from] : "";
}

/** A draft or the guide in a translated language: each top-level element replaced by its translation where one exists. */
function translatedHtml(html: string, texts: DocTexts | undefined, dropMe = false): string {
  const parts = splitTopLevel(html);
  return parts.map((part, i) => {
    const key = `e${i}`;
    if (texts?.[key]) return texts[key];
    if (dropMe && /^<p(?![^>]*class="[^"]*\ben\b)/.test(part)) return "";
    return part;
  }).filter(Boolean).join("\n");
}

function NavItem({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <li>
      <button type="button" onClick={onClick} aria-current={active ? "page" : undefined}
        className={`block w-full rounded-brand px-3 py-2 text-left text-[14px] leading-snug ${active ? "bg-mist font-semibold text-black" : "text-black/70 hover:bg-mist"}`}>
        {label}
      </button>
    </li>
  );
}

interface BlockProps {
  lang: PackLang;
  src: SourceLang;
  pack: LegalPack;
  fields: Record<string, FieldState>;
  checks: Record<string, boolean>;
  onField: (id: string, text: string) => void;
  onLink: (linkId: string, founder: string) => void;
  onCheck: (id: string, on: boolean) => void;
  placeholderHint: string;
  staleHint: string;
  pickerLabel: string;
  pickerNone: string;
  founderLabel: (n: number) => string;
  labelOf: (id: string) => string;
}

function Block(props: BlockProps & { block: PackBlock; index: number; docKey: string; tx: (docKey: string, path: string, source: string) => string }) {
  const { block, index: i, docKey, tx, src, checks, onCheck } = props;
  const text = (path: string, source: string) => tx(docKey, path, source);
  switch (block.type) {
    case "h":
      return <h3 className="lp-h">{text(`b${i}`, block[src] || block.me)}</h3>;
    case "h2":
      return <h4 className="lp-h2">{text(`b${i}`, block[src] || block.me)}</h4>;
    case "h3":
      return <h5 className="lp-h3">{text(`b${i}`, block[src] || block.me)}</h5>;
    case "p":
      return <p className="lp-p"><Template text={text(`b${i}`, block[src] || block.me)} {...props} /></p>;
    case "list":
      return (
        <ol className="lp-list">
          {block[src].map((item, j) => <li key={j} className={isEmptyOptional(item, props.fields, props.pack.fields) ? "lp-opt-empty" : undefined}><Template text={text(`b${i}.${j}`, item)} {...props} /></li>)}
        </ol>
      );
    case "check":
      return (
        <label className="lp-check">
          <input type="checkbox" checked={!!checks[block.id]} onChange={(e) => onCheck(block.id, e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-sea" />
          <span>{text(`b${i}`, block[src] || block.me)}</span>
        </label>
      );
    case "sigrow":
      return (
        <div className="lp-sigrow">
          {block.items.map((item, j) => (
            <div key={j} className={`lp-sig ${isEmptyOptional(item[src] || item.me, props.fields, props.pack.fields) ? "lp-opt-empty" : ""}`}>
              <p className="lp-p"><Template text={text(`b${i}.s${j}`, item[src] || item.me)} {...props} /></p>
              <p className="lp-siglbl">{text(`b${i}.s${j}.l`, item.lbl[src] || item.lbl.me)}</p>
            </div>
          ))}
        </div>
      );
  }
}

/**
 * A template with its blanks made editable. The pack's own text may carry
 * <b> and <br>; a blank never carries markup. Only these two tags are
 * honoured, so the text is split on them and everything else is escaped
 * by React.
 */
function Template({ text, lang, pack, fields, onField, onLink, placeholderHint, staleHint, pickerLabel, pickerNone, founderLabel, labelOf }: BlockProps & { text: string }) {
  const parts = text.split(/(<br\s*\/?>|<\/?b>)/i);
  let bold = false;
  const out: React.ReactNode[] = [];
  parts.forEach((part, i) => {
    if (/^<br/i.test(part)) { out.push(<br key={i} />); return; }
    if (/^<b>$/i.test(part)) { bold = true; return; }
    if (/^<\/b>$/i.test(part)) { bold = false; return; }
    if (!part) return;
    const nodes = segments(part).map((seg, j) => {
      if (seg.type === "text") return seg.text;
      if (seg.type === "sig") return <span key={j} className="lp-sigline" aria-hidden="true" />;
      const meta = pack.fields[seg.id];
      const f = fields[seg.id];
      if (!meta || !f) return `{{${seg.id}}}`;
      const shown = meta.meOnly && lang !== "me" ? "" : displayValue(f, lang);
      const label = labelOf(seg.id);
      const editable = (
        <Editable key={j} id={seg.id} value={shown} block={!!meta.block} label={label} todo={isIncomplete(shown)}
          placeholder={meta.optional ? label : `${label} — ${placeholderHint}`}
          stale={f.stale.includes(lang) && !meta.meOnly ? staleHint : null}
          onChange={(v) => onField(seg.id, v)} />
      );
      if (meta.link && meta.part === "name") {
        // A person blank may follow a founder: the founders with a name are offered next to it.
        const founders = FOUNDER_IDS.map((fid, n) => ({ fid, n: n + 1, name: fields[`${fid}_name`]?.[lang] ?? "" })).filter((x) => !isIncomplete(x.name));
        return (
          <span key={j} className="lp-person">
            {editable}
            <select className="lp-pick lp-screen" aria-label={pickerLabel} title={pickerLabel} value={fields[meta.link]?.me ?? ""} onChange={(e) => onLink(meta.link!, e.target.value)}>
              <option value="">{pickerNone}</option>
              {founders.map((x) => <option key={x.fid} value={x.fid}>{founderLabel(x.n)}: {x.name}</option>)}
            </select>
          </span>
        );
      }
      return editable;
    });
    out.push(bold ? <b key={i}>{nodes}</b> : <span key={i}>{nodes}</span>);
  });
  return <>{out}</>;
}

function Editable({ id, value, block, label, placeholder, stale, todo, onChange }: { id: string; value: string; block: boolean; label: string; placeholder: string; stale: string | null; todo: boolean; onChange: (v: string) => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && el.innerText !== value) el.innerText = value;
  }, [value]);
  return (
    <span
      ref={ref}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      role="textbox"
      aria-label={label}
      aria-multiline={block}
      title={stale ?? undefined}
      data-id={id}
      data-placeholder={placeholder}
      className={`lp-field ${block ? "lp-block" : ""} ${stale ? "lp-stale" : ""} ${todo ? "lp-todo" : ""}`}
      onInput={(e) => onChange(e.currentTarget.innerText)}
      onKeyDown={block ? undefined : (e) => { if (e.key === "Enter") e.preventDefault(); }}
    />
  );
}

/** One blank in the Complete panel: label, hint, the value in the language on screen, and the founder menu for a person blank. */
function CompleteField({ id, lang, pack, fields, raw, label, hint, onField, onLink, pickerNone, founderLabel, sameAs }: {
  id: string; lang: PackLang; pack: LegalPack; fields: Record<string, FieldState>; raw: Record<string, FieldState>; label: string; hint: string;
  onField: (id: string, text: string) => void; onLink: (linkId: string, founder: string) => void; pickerNone: string; founderLabel: (n: number) => string; sameAs: string;
}) {
  const meta = pack.fields[id];
  const f = fields[id];
  if (!meta || !f) return null;
  if (meta.meOnly && lang !== "me") return null;
  const value = displayValue(f, lang);
  const optionalEmpty = isOptionalEmpty(id, fields, pack.fields, lang);
  const todo = isIncomplete(value) && !optionalEmpty;
  const linked = meta.link ? raw[meta.link]?.me ?? "" : "";
  const founders = meta.link && meta.part === "name" ? FOUNDER_IDS.map((fid, n) => ({ fid, n: n + 1, name: fields[`${fid}_name`]?.[lang] ?? "" })).filter((x) => !isIncomplete(x.name)) : [];
  const inputId = `lp-c-${id}`;
  const focusInDoc = () => {
    const el = document.querySelector<HTMLElement>(`#legal-doc [data-id="${id}"]`);
    el?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const cls = `mt-1 w-full rounded-lg bg-paper px-3.5 py-2.5 text-[15px] outline-none ring-sea/40 focus:ring-2 ${todo ? "text-[#0B57D0]" : optionalEmpty ? "text-black" : "text-[#B0246B]"} ${linked ? "opacity-70" : ""}`;
  return (
    <div>
      <label htmlFor={inputId} className="flex items-center gap-2 text-[13.5px] font-semibold">
        <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${todo ? "bg-[#0B57D0]" : optionalEmpty ? "bg-black/25" : "bg-[#B0246B]"}`} />
        {label}
      </label>
      {founders.length > 0 ? (
        <select aria-label={sameAs} value={linked} onChange={(e) => onLink(meta.link!, e.target.value)} className="mt-1 w-full rounded-lg bg-paper px-3.5 py-2 text-[14px] outline-none ring-sea/40 focus:ring-2">
          <option value="">{pickerNone}</option>
          {founders.map((x) => <option key={x.fid} value={x.fid}>{founderLabel(x.n)}: {x.name}</option>)}
        </select>
      ) : null}
      {meta.block ? (
        <textarea id={inputId} value={value} rows={Math.min(10, Math.max(3, value.split("\n").length + 1))} readOnly={!!linked} onFocus={focusInDoc} onChange={(e) => onField(id, e.target.value)} className={cls} />
      ) : (
        <input id={inputId} type="text" value={value} readOnly={!!linked} onFocus={focusInDoc} onChange={(e) => onField(id, e.target.value)} className={cls} />
      )}
      {hint ? <p className="mt-1 text-[13px] leading-relaxed text-black/55">{hint}</p> : null}
    </div>
  );
}

const CSS = `
.lp-doc { background: #fff; padding: 0 0 3rem; font-size: 15px; line-height: 1.6; color: #000; }
.lp-head { border-bottom: 0.5px solid rgba(0,0,0,.25); padding-bottom: 1.25rem; margin-bottom: 1.75rem; }
.lp-file { font-weight: 700; font-variant-numeric: tabular-nums; font-size: 12px; letter-spacing: .04em; color: rgba(0,0,0,.5); }
.lp-title { font-family: var(--font-display); font-size: 22px; letter-spacing: .02em; margin-top: .25rem; }
.lp-subtitle { color: rgba(0,0,0,.6); font-size: 14px; margin-top: .25rem; }
.lp-note { margin-top: 1rem; padding: .7rem .9rem; background: #F6F3EE; border-radius: 8px; font-size: 13.5px; color: rgba(0,0,0,.7); }
.lp-h { text-align: center; font-family: var(--font-display); font-size: 20px; margin: 2rem 0 1rem; }
.lp-h2 { text-align: center; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; font-size: 14px; margin: 1.75rem 0 .6rem; }
.lp-h3 { text-align: center; font-weight: 700; font-size: 15px; margin: 1.4rem 0 .4rem; }
.lp-p { margin: .5rem 0; white-space: pre-wrap; }
.lp-list { list-style: decimal; padding-left: 1.5rem; margin: .5rem 0; }
.lp-list li { margin: .3rem 0; }
.lp-check { display: flex; gap: .75rem; align-items: flex-start; padding: .7rem 0; border-bottom: 0.5px solid rgba(0,0,0,.12); }
.lp-check input:checked + span { color: rgba(0,0,0,.5); text-decoration: line-through; text-decoration-color: rgba(0,0,0,.35); }
.lp-sigrow { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 1.25rem 2rem; margin: 2rem 0 .75rem; }
.lp-sig .lp-p { margin-bottom: 0; }
.lp-siglbl { font-size: 12.5px; color: rgba(0,0,0,.55); }
.lp-sigline { display: inline-block; width: 11rem; max-width: 100%; border-bottom: 1px solid #000; vertical-align: baseline; height: 1.4em; }
.lp-field { display: inline; min-width: 2.5rem; padding: 0 .15em; border-radius: 3px; color: #B0246B; background: rgba(176,36,107,.07); box-decoration-break: clone; -webkit-box-decoration-break: clone; outline: none; }
.lp-field:focus { background: rgba(176,36,107,.14); box-shadow: 0 0 0 2px rgba(176,36,107,.35); }
.lp-field:empty::before { content: attr(data-placeholder); font-style: italic; opacity: .7; }
/* Still to complete (empty or bracketed): blue. Completed: pink. */
.lp-field.lp-todo { color: #0B57D0; background: rgba(11,87,208,.07); }
.lp-field.lp-todo:focus { background: rgba(11,87,208,.14); box-shadow: 0 0 0 2px rgba(11,87,208,.35); }
.lp-field.lp-block { display: block; white-space: pre-wrap; padding: .3rem .5rem; margin: .25rem 0; }
.lp-field.lp-stale { box-shadow: 0 0 0 1.5px #F35353; }
.lp-person { white-space: nowrap; }
.lp-pick { display: inline-block; width: 1.25rem; height: 1.25rem; margin-left: .15rem; vertical-align: middle; border: 0; border-radius: 4px; background: #E3EBED url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%2336434B' stroke-width='2'%3E%3Cpath d='M6 8l4 4 4-4'/%3E%3C/svg%3E") center/14px no-repeat; color: transparent; font-size: 14px; cursor: pointer; appearance: none; -webkit-appearance: none; }
.lp-pick:hover { background-color: #d3dfe2; }
.lp-pick:focus-visible { outline: 2px solid #0E3A46; outline-offset: 1px; }
.lp-pick option { color: #000; }
.lp-opt-empty { display: none; }
.lp-guide p.en { color: #000; }
.lp-guide li { margin: .25rem 0; }
.lp-prose { outline: none; }
.lp-prose:focus { box-shadow: 0 0 0 2px rgba(14,58,70,.25); border-radius: 4px; }
.lp-prose h2 { font-weight: 800; font-size: 16px; margin: 1.75rem 0 .6rem; }
.lp-prose h3 { font-weight: 700; font-size: 15px; margin: 1.25rem 0 .4rem; }
.lp-prose p { margin: .55rem 0; }
.lp-prose p.en { color: rgba(0,0,0,.6); }
.lp-prose ul, .lp-prose ol { padding-left: 1.5rem; margin: .4rem 0; }
.lp-prose ul { list-style: disc; } .lp-prose ol { list-style: decimal; }
.lp-prose code { font-size: 13px; background: #F1F5F6; padding: 0 .25em; border-radius: 3px; }
.lp-prose .tablewrap { overflow-x: auto; margin: .6rem 0; }
.lp-prose table { border-collapse: collapse; font-size: 14px; min-width: 100%; }
.lp-prose th, .lp-prose td { border: 0.5px solid rgba(0,0,0,.3); padding: .3rem .5rem; text-align: left; vertical-align: top; }
.lp-prose th { background: #F1F5F6; }
.lp-doc[data-lang="me"]:not(.lp-both) .lp-prose p.en { display: none; }
.lp-doc[data-lang="en"]:not(.lp-both) .lp-prose p:not(.en) { display: none; }
.lp-doc.lp-both .lp-prose p.en { color: rgba(0,0,0,.6); }
.lp-doc[data-lang="ru"] .lp-prose p.en, .lp-doc[data-lang="tr"] .lp-prose p.en { color: #000; }
@media (prefers-reduced-motion: no-preference) { .lp-field { transition: background-color .15s; } }
@media print {
  @page { size: A4; margin: 18mm 16mm; }
  body * { visibility: hidden; }
  #legal-doc, #legal-doc * { visibility: visible; }
  #legal-doc { position: absolute; left: 0; top: 0; width: 100%; padding: 0; font-size: 11.5pt; line-height: 1.45; }
  .lp-note, .lp-screen { display: none !important; }
  /* A completed blank stays recognisable in black and white: serif, underlined. */
  .lp-field, .lp-field.lp-block { color: #000; background: none; box-shadow: none; padding: 0; margin: 0; transition: none; font-family: Georgia, "Times New Roman", serif; text-decoration: underline; text-decoration-thickness: 0.6px; text-underline-offset: 2px; }
  .lp-field.lp-block { display: block; }
  .lp-field:empty::before { content: "____________"; color: #000; font-style: normal; text-decoration: none; }
  .lp-opt-empty { display: none !important; }
  .lp-check { border: none; break-inside: avoid; }
  .lp-check input { -webkit-appearance: checkbox; }
  .lp-sigrow { break-inside: avoid; margin-top: 2rem; }
  .lp-h, .lp-h2, .lp-h3 { break-after: avoid; }
  .lp-prose p.en, .lp-prose h2, .lp-prose h3 { color: #000; }
}
`;
