"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { saveLegalPack } from "@/app/[locale]/admin/(protected)/registracija/actions";
import { translateFields } from "@/app/[locale]/admin/(protected)/translate-actions";
import { initialFields, isEmptyOptional, sanitizeDraftHtml, segments, type FieldState, type LegalPack, type PackBlock, type PackLang } from "@/lib/legal-pack";
import type { Locale } from "@/i18n/routing";

/*
 * The registration pack in the console: the five Ministry forms with
 * their blanks filled in (blue, editable, shared by every form), the
 * founding checklist, and the policy drafts. One language on screen at a
 * time; editing a blank in one language marks the other side stale, and
 * switching languages translates whatever is stale before showing it.
 * Save writes the pack to the database for the whole team; Print gives
 * the document alone, in black, with the signature lines empty.
 */

export type SavedRows = Record<string, { value: unknown; updatedAt: string }>;

interface Props {
  pack: LegalPack;
  saved: SavedRows;
  locale: Locale;
}

type Notice = { tone: "ok" | "warn"; text: string } | null;

const other = (lang: PackLang): PackLang => (lang === "me" ? "en" : "me");

function readSavedFields(pack: LegalPack, saved: SavedRows): Record<string, FieldState> {
  const base = initialFields(pack);
  const row = saved.fields?.value as Record<string, Partial<FieldState>> | undefined;
  if (!row || typeof row !== "object") return base;
  for (const [id, f] of Object.entries(row)) {
    if (!base[id] || !f) continue;
    base[id] = { me: typeof f.me === "string" ? f.me : base[id].me, en: typeof f.en === "string" ? f.en : base[id].en, stale: f.stale === "me" || f.stale === "en" ? f.stale : null };
  }
  return base;
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

export function LegalPackApp({ pack, saved, locale }: Props) {
  const t = useTranslations("admin.legalPack");
  const [lang, setLang] = useState<PackLang>(locale === "en" ? "en" : "me");
  const [both, setBoth] = useState(false);
  const [doc, setDoc] = useState<string>(pack.forms[0]?.id ?? "01");
  const [fields, setFields] = useState(() => readSavedFields(pack, saved));
  const [checks, setChecks] = useState(() => readSavedChecks(saved));
  const draftsRef = useRef(readSavedDrafts(pack, saved));
  const [dirty, setDirty] = useState<Record<string, true>>({});
  const [busy, setBusy] = useState<"saving" | "translating" | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [savedAt, setSavedAt] = useState<string | null>(() => {
    const times = Object.values(saved).map((r) => r.updatedAt).sort();
    return times.at(-1) ?? null;
  });

  const form = pack.forms.find((f) => f.id === doc) ?? null;
  const guide = doc === "guide" ? pack.guide ?? null : null;
  const draft = doc.startsWith("draft:") ? pack.drafts.find((d) => `draft:${d.id}` === doc) ?? null : null;
  const isDirty = Object.keys(dirty).length > 0;
  const staleNow = useMemo(() => Object.entries(fields).filter(([id, f]) => f.stale === lang && !pack.fields[id]?.meOnly).map(([id]) => id), [fields, lang, pack.fields]);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const markDirty = (key: string) => setDirty((d) => (d[key] ? d : { ...d, [key]: true }));

  const setField = (id: string, text: string) => {
    setFields((prev) => {
      const f = prev[id];
      if (!f || f[lang] === text) return prev;
      const meta = pack.fields[id];
      const stale = meta?.meOnly ? null : meta?.neutral ? null : other(lang);
      const next: FieldState = meta?.neutral ? { me: text, en: text, stale: null } : { ...f, [lang]: text, stale };
      return { ...prev, [id]: next };
    });
    markDirty("fields");
  };

  /** Bring every field whose `to` side is stale up to date from the other side. */
  const translateStale = async (to: PackLang): Promise<boolean> => {
    const from = other(to);
    const need = Object.entries(fields).filter(([id, f]) => f.stale === to && !pack.fields[id]?.meOnly);
    if (need.length === 0) return true;
    const next = { ...fields };
    const ask: Record<string, string> = {};
    for (const [id, f] of need) {
      if (pack.fields[id]?.neutral || f[from].trim() === "") next[id] = { ...f, [to]: f[from], stale: null };
      else ask[id] = f[from];
    }
    setBusy("translating");
    setNotice({ tone: "ok", text: t("translating", { n: Object.keys(ask).length }) });
    let failed: string | null = null;
    const keys = Object.keys(ask);
    for (let i = 0; i < keys.length && !failed; i += 40) {
      const chunk = Object.fromEntries(keys.slice(i, i + 40).map((k) => [k, ask[k]]));
      const result = await translateFields({ from, to, fields: chunk }).catch(() => ({ ok: false as const, error: "server" as const }));
      if (result.ok) {
        for (const [id, text] of Object.entries(result.fields)) if (next[id]) next[id] = { ...next[id], [to]: text, stale: null };
      } else {
        failed = result.error === "unconfigured" ? t("translateUnconfigured") : t("translateFailed");
      }
    }
    setFields(next);
    markDirty("fields");
    setBusy(null);
    setNotice(failed ? { tone: "warn", text: failed } : { tone: "ok", text: t("translated", { n: keys.length }) });
    return !failed;
  };

  const switchLang = async (to: PackLang) => {
    if (to === lang || busy) return;
    await translateStale(to);
    setLang(to);
  };

  const save = async () => {
    if (busy || !isDirty) return;
    setBusy("saving");
    setNotice(null);
    const keys = Object.keys(dirty);
    let failed: string | null = null;
    let last: string | null = null;
    for (const key of keys) {
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

  const print = () => {
    const title = document.title;
    document.title = `${form?.file ?? draft?.file ?? guide?.file ?? "santamore"}-${lang}`;
    window.print();
    document.title = title;
  };

  const savedLabel = savedAt ? new Date(savedAt).toLocaleString(locale === "me" ? "sr-Latn-ME" : locale, { dateStyle: "short", timeStyle: "short" }) : null;

  return (
    <div className="lp-app md:grid md:grid-cols-[14rem_minmax(0,1fr)] md:gap-10">
      <style>{CSS}</style>

      {/* Document list: a select on the phone, a list on desktop. */}
      <nav aria-label={t("documents")} className="lp-nav">
        <label className="block md:hidden">
          <span className="type-eyebrow block text-black/60">{t("documents")}</span>
          <select value={doc} onChange={(e) => setDoc(e.target.value)} className="mt-1 w-full rounded-brand bg-mist px-3 py-2 text-[15px]">
            {pack.guide ? <optgroup label={t("guide")}><option value="guide">{pack.guide.title[lang]}</option></optgroup> : null}
            <optgroup label={t("forms")}>
              {pack.forms.map((f) => <option key={f.id} value={f.id}>{f.id} · {f.title[lang]}</option>)}
            </optgroup>
            <optgroup label={t("drafts")}>
              {pack.drafts.map((d) => <option key={d.id} value={`draft:${d.id}`}>{d.title[lang]}</option>)}
            </optgroup>
          </select>
        </label>
        <div className="hidden md:block md:sticky md:top-6">
          {pack.guide ? (
            <section className="pb-5">
              <p className="type-eyebrow text-black/60">{t("guide")}</p>
              <ul className="mt-2 flex flex-col gap-1">
                <NavItem active={doc === "guide"} onClick={() => setDoc("guide")} label={pack.guide.title[lang]} />
              </ul>
            </section>
          ) : null}
          <section className="border-t-[0.5px] border-black/20 py-5">
            <p className="type-eyebrow text-black/60">{t("forms")}</p>
            <ul className="mt-2 flex flex-col gap-1">
              {pack.forms.map((f) => <NavItem key={f.id} active={doc === f.id} onClick={() => setDoc(f.id)} label={`${f.id} · ${f.title[lang]}`} />)}
            </ul>
          </section>
          <section className="border-t-[0.5px] border-black/20 pt-5">
            <p className="type-eyebrow text-black/60">{t("drafts")}</p>
            <ul className="mt-2 flex flex-col gap-1">
              {pack.drafts.map((d) => <NavItem key={d.id} active={doc === `draft:${d.id}`} onClick={() => setDoc(`draft:${d.id}`)} label={d.title[lang]} />)}
            </ul>
          </section>
        </div>
      </nav>

      <div className="mt-6 min-w-0 md:mt-0">
        {/* Toolbar */}
        <div className="lp-toolbar flex flex-wrap items-center gap-2 rounded-brand bg-mist px-3.5 py-3">
          <div role="group" aria-label={t("language")} className="flex overflow-hidden rounded-brand bg-paper">
            {(["me", "en"] as const).map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} disabled={busy !== null} onClick={() => void switchLang(l)}
                className={`px-3 py-1.5 text-[14px] font-semibold transition-colors disabled:opacity-50 ${lang === l ? "bg-sea text-paper" : "text-black/70 hover:bg-mist-2"}`}>
                {l === "me" ? t("langMe") : t("langEn")}
              </button>
            ))}
          </div>
          {draft ? (
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
          <button type="button" onClick={print} disabled={busy !== null} className="rounded-brand bg-paper px-3 py-1.5 text-[14px] font-semibold text-black/80 hover:bg-mist-2 disabled:opacity-50">
            {t("print")}
          </button>
          <button type="button" onClick={() => void save()} disabled={busy !== null || !isDirty} className="rounded-brand bg-red px-3.5 py-1.5 text-[14px] font-bold text-paper hover:bg-red-dark disabled:opacity-40">
            {busy === "saving" ? t("saving") : isDirty ? t("save") : t("nothingToSave")}
          </button>
        </div>
        <p role="status" aria-live="polite" className={`mt-3 min-h-5 text-[13.5px] ${notice?.tone === "warn" ? "text-red-dark" : "text-black/60"}`}>
          {notice?.text ?? (savedLabel ? t("lastSaved", { when: savedLabel }) : t("neverSaved"))}
        </p>

        {/* The document */}
        <div id="legal-doc" className={`lp-doc mt-8 ${(draft && both) || guide ? "lp-both" : ""}`} lang={guide ? "en" : lang === "me" ? "sr-Latn-ME" : "en"} data-lang={lang}>
          {guide ? (
            <>
              <div className="lp-head">
                <p className="lp-file">{guide.file}</p>
                <h2 className="lp-title">{guide.title[lang]}</h2>
                <p className="lp-subtitle lp-screen">{t("guideHint")}</p>
              </div>
              <div className="lp-prose lp-guide" dangerouslySetInnerHTML={{ __html: guide.html }} />
            </>
          ) : form ? (
            <>
              <div className="lp-head">
                <p className="lp-file">{form.file}-{lang}</p>
                <h2 className="lp-title">{form.title[lang]}</h2>
                <p className="lp-subtitle">{form.subtitle[lang]}</p>
                <p className="lp-note" dangerouslySetInnerHTML={{ __html: form.note[lang] }} />
              </div>
              {form.blocks.map((block, i) => (
                <Block key={i} block={block} lang={lang} pack={pack} fields={fields} checks={checks} onField={setField} onCheck={(id, on) => { setChecks((c) => ({ ...c, [id]: on })); markDirty("checks"); }} placeholderHint={t("fieldEmpty")} staleHint={t("staleHint")} />
              ))}
            </>
          ) : draft ? (
            <>
              <div className="lp-head">
                <p className="lp-file">{draft.file}-{lang}</p>
                <h2 className="lp-title">{draft.title[lang]}</h2>
                <p className="lp-subtitle lp-screen">{t("draftHint")}</p>
              </div>
              <div
                key={draft.id}
                className="lp-prose"
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                aria-label={draft.title[lang]}
                dangerouslySetInnerHTML={{ __html: draftsRef.current[draft.id] ?? draft.html }}
                onInput={(e) => { draftsRef.current[draft.id] = e.currentTarget.innerHTML; markDirty(`draft:${draft.id}`); }}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
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
  block: PackBlock;
  lang: PackLang;
  pack: LegalPack;
  fields: Record<string, FieldState>;
  checks: Record<string, boolean>;
  onField: (id: string, text: string) => void;
  onCheck: (id: string, on: boolean) => void;
  placeholderHint: string;
  staleHint: string;
}

function Block(props: BlockProps) {
  const { block, lang, checks, onCheck } = props;
  switch (block.type) {
    case "h":
      return <h3 className="lp-h">{block[lang] || block.me}</h3>;
    case "h2":
      return <h4 className="lp-h2">{block[lang] || block.me}</h4>;
    case "h3":
      return <h5 className="lp-h3">{block[lang] || block.me}</h5>;
    case "p":
      return <p className="lp-p"><Template text={block[lang]} {...props} /></p>;
    case "list":
      return (
        <ol className="lp-list">
          {block[lang].map((item, i) => <li key={i} className={isEmptyOptional(item, props.fields, props.pack.fields) ? "lp-opt-empty" : undefined}><Template text={item} {...props} /></li>)}
        </ol>
      );
    case "check": {
      const text = block[lang] || block.me;
      return (
        <label className="lp-check">
          <input type="checkbox" checked={!!checks[block.id]} onChange={(e) => onCheck(block.id, e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-sea" />
          <span>{text}</span>
        </label>
      );
    }
    case "sigrow":
      return (
        <div className="lp-sigrow">
          {block.items.map((item, i) => (
            <div key={i} className={`lp-sig ${isEmptyOptional(item[lang] || item.me, props.fields, props.pack.fields) ? "lp-opt-empty" : ""}`}>
              <p className="lp-p"><Template text={item[lang] || item.me} {...props} /></p>
              <p className="lp-siglbl">{item.lbl[lang] || item.lbl.me}</p>
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
function Template({ text, lang, pack, fields, onField, placeholderHint, staleHint }: BlockProps & { text: string }) {
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
      const shown = meta.meOnly && lang === "en" ? "" : f[lang];
      return (
        <Editable key={j} value={shown} block={!!meta.block} label={meta.label[lang] || meta.label.me}
          placeholder={meta.optional ? meta.label[lang] || meta.label.me : `${meta.label[lang] || meta.label.me} — ${placeholderHint}`}
          stale={f.stale === lang && !meta.meOnly ? staleHint : null}
          onChange={(v) => onField(seg.id, v)} />
      );
    });
    out.push(bold ? <b key={i}>{nodes}</b> : <span key={i}>{nodes}</span>);
  });
  return <>{out}</>;
}

function Editable({ value, block, label, placeholder, stale, onChange }: { value: string; block: boolean; label: string; placeholder: string; stale: string | null; onChange: (v: string) => void }) {
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
      data-placeholder={placeholder}
      className={`lp-field ${block ? "lp-block" : ""} ${stale ? "lp-stale" : ""}`}
      onInput={(e) => onChange(e.currentTarget.innerText)}
      onKeyDown={block ? undefined : (e) => { if (e.key === "Enter") e.preventDefault(); }}
    />
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
.lp-field { display: inline; min-width: 2.5rem; padding: 0 .15em; border-radius: 3px; color: #0B57D0; background: rgba(11,87,208,.07); box-decoration-break: clone; -webkit-box-decoration-break: clone; outline: none; }
.lp-field:focus { background: rgba(11,87,208,.14); box-shadow: 0 0 0 2px rgba(11,87,208,.35); }
.lp-field:empty::before { content: attr(data-placeholder); color: rgba(11,87,208,.55); font-style: italic; }
.lp-field.lp-block { display: block; white-space: pre-wrap; padding: .3rem .5rem; margin: .25rem 0; }
.lp-field.lp-stale { box-shadow: 0 0 0 1.5px #F35353; }
.lp-opt-empty { opacity: .55; }
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
@media (prefers-reduced-motion: no-preference) { .lp-field { transition: background-color .15s; } }
@media print {
  @page { size: A4; margin: 18mm 16mm; }
  body * { visibility: hidden; }
  #legal-doc, #legal-doc * { visibility: visible; }
  #legal-doc { position: absolute; left: 0; top: 0; width: 100%; padding: 0; font-size: 11.5pt; line-height: 1.45; }
  .lp-note, .lp-screen { display: none !important; }
  .lp-field, .lp-field.lp-block { color: #000; background: none; box-shadow: none; padding: 0; margin: 0; transition: none; }
  .lp-field.lp-block { display: block; }
  .lp-field:empty::before { content: "____________"; color: #000; font-style: normal; }
  .lp-opt-empty { display: none !important; }
  .lp-check { border: none; break-inside: avoid; }
  .lp-check input { -webkit-appearance: checkbox; }
  .lp-sigrow { break-inside: avoid; margin-top: 2rem; }
  .lp-h, .lp-h2, .lp-h3 { break-after: avoid; }
  .lp-prose p.en, .lp-prose h2, .lp-prose h3 { color: #000; }
}
`;
