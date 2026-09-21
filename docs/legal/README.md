# Legal and governance documents

Everything the association files, adopts or publishes, kept as Markdown sources with Word
renders built from them. Montenegrin is the operative language throughout; English is a
translation for founders who do not read it.

| Where | What |
|---|---|
| `registration/originals/` | The Ministry's seven Montenegrin documents as received (five templates, two guidance notes) |
| `registration/*.en.md` | English translations of those seven, paragraph for paragraph |
| `registration/completion-guide.md` | Field-by-field guide to completing the four filing documents, bilingual in table columns |
| `registration/statute-additions.md` | Draft statute chapters for the Board, Grants Committee, chapters and proxy voting |
| `governance/*.md` | The policies and agreements the Board adopts and the public pages are regenerated from |
| `dist/*.docx` | Word renders: A4, Montenegrin left, English right, one row per article; the completion guide as a single column |
| `web/index.html` | The team review site: the five filing documents pre-filled with editable blue fields, the fourteen drafts editable in place, PDF download and print, shared saving; published as a claude.ai artifact |

## Rebuilding the Word files

```
npm install --no-save docx
./scripts/legal/build-all.sh
```

`scripts/legal/build-docx.js` lays out the interleaved drafts (`bilingual`), pairs each
Ministry template with its translation by article number, step or bullet (`paired`), and
renders the completion guide as it is (`plain`). Edit the Markdown, rerun the script,
commit both.

## Rebuilding the review site

```
node scripts/legal/build-web.js
```

`scripts/legal/build-web.js` turns the Ministry's originals into forms whose blanks are pre-filled
from the completion guide (unknown facts stay as bracketed placeholders), attaches the English
translations per article, and embeds the drafts. `web-app.css` and `web-app.js` are the page's
stylesheet and script. Publish the built file as an artifact with the `artifact` and `downloads`
capabilities; the page saves the team's edits by republishing itself.
