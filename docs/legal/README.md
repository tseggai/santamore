# Legal and governance documents

Everything the association files, adopts or publishes, kept as Markdown sources with Word
renders built from them. Montenegrin is the operative language throughout; English is a
translation for founders who do not read it.

| Where | What |
|---|---|
| `registration/originals/` | The Ministry's seven Montenegrin documents as received (five templates, two guidance notes) |
| `registration/*.en.md` | English translations of those seven, paragraph for paragraph |
| `registration/HOW-TO-COMPLETE.md` | The founders' working guide: what to collect, what to decide, where each fact goes, what every draft is for and who reviews it; also the first entry of the console page |
| `registration/completion-guide.md` | Field-by-field guide to completing the four filing documents, bilingual in table columns |
| `registration/statute-additions.md` | Draft statute chapters for the Board, Grants Committee, chapters and proxy voting |
| `governance/<id>.me.md`, `<id>.en.md`, `<id>.ru.md` | The policies, rules and agreement templates, one file per language, aligned block for block (`manifest.json` names them; `scripts/legal/check-align.js` checks the alignment). Montenegrin is the operative text; English is a full translation; Russian exists for the seven public documents |
| `governance/<id>.notes.md` | Working notes per document (English): what it hangs on, the decisions embedded, the checks and parameters for the Board, points for the lawyer, corrections made to the Montenegrin |
| `../../content/legal/docs.json` | Built by `scripts/legal/build-legal-docs.js`: the public part of each document for the site's legal pages (`/pravila-privatnosti` and the rest, `lib/legal-docs.ts`) and the whole documents, Montenegrin and English side by side, for the console's Rules section (`/admin/pravila`, staff only) |
| `dist/*.docx` | Word renders: A4, Montenegrin left, English right, one row per block; the completion guide as a single column |
| `../../content/legal-pack/pack.json` | The registration pack the console serves at `/admin/registracija`: the five filing documents with pre-filled blanks, the statute with the additions merged in (04a), the founding checklist and the drafts, in both languages |

## Rebuilding the Word files

```
npm install --no-save docx
./scripts/legal/build-all.sh
```

`scripts/legal/build-docx.js` lays out a governance document from its two language files
(`pair`), the statute additions from their interleaved file (`bilingual`), pairs each
Ministry template with its translation by article number, step or bullet (`paired`), and
renders the completion guide as it is (`plain`). Edit the Markdown, run `check-align.js`,
rerun the script, commit both. `build-all.sh` also rebuilds `content/legal/docs.json` and
the registration pack.

## Rebuilding the registration pack

```
node scripts/legal/build-pack.js
```

`scripts/legal/build-pack.js` turns the Ministry's originals into templates whose blanks are
pre-filled from the completion guide (unknown facts stay as bracketed placeholders), attaches
the English translations per article, and embeds the drafts, into `content/legal-pack/pack.json`.
`buildStatuteWithAdditions` applies `statute-additions.md` to the statute template (the
consequential edits by wording, the proxy chapter after Article 17, the three new chapters
after Article 31, the old Articles 32 to 42 renumbered 45 to 55) as form 04a.
The console page `/admin/registracija` (staff only) renders it: one language on screen
(Montenegrin, English, Russian or Turkish), editable blanks shared by every form (blue until
completed, pink after), the text the additions brought into form 04a editable in place (pink on screen, like a completed blank,
saved as `form:<id>` rows), a Complete panel that lists a form's blanks with a hint each, the
checklist, the drafts editable in place, Print / PDF, and Save for the whole team. The
templates exist in Montenegrin and English; Russian and Turkish are translated on first use,
document by document, through the same Claude helper and cached in `legal_pack` under
`i18n:<document>:<language>` rows. Edits live in the `legal_pack` table (migration
`20260921000069_legal_pack.sql`); switching languages translates the blanks changed on the
other side through the same Claude helper the rest of the console uses. `lib/legal-pack.test.ts`
checks that every blank is defined and matched across languages after a rebuild.
