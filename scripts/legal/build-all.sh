#!/usr/bin/env bash
# Rebuilds every Word document in docs/legal/dist from the Markdown sources and the Ministry originals.
# Prerequisites: node, python3, and the docx package (npm install --no-save docx).
set -euo pipefail
cd "$(dirname "$0")/../.."
S=scripts/legal; R=docs/legal/registration; G=docs/legal/governance; D=docs/legal/dist; T="${TMPDIR:-/tmp}/santamore-legal"
mkdir -p "$D" "$T"
pair() { python3 "$S/extract_docx_paragraphs.py" "$R/originals/$1" > "$T/$2.json"; node "$S/build-docx.js" paired "$T/$2.json" "$R/$2" "$D/$3" --anchor "$4"; }
pair 01-instrukcije-za-osnivanje.docx            01-instructions-for-founding-an-ngo.en.md 01-instructions-for-founding-an-ngo.docx step
pair 02-obrazac-odluke-o-osnivanju.docx          02-founding-decision.en.md                02-founding-decision.docx                clan
pair 03-obrazac-prijave-za-upis-MIRN.docx        03-registration-application.en.md         03-registration-application.docx         none
pair 04-obrazac-statuta.docx                     04-statute.en.md                          04-statute.docx                          clan
pair 05-obrazac-zapisnika-osnivacke-skupstine.docx 05-founding-assembly-minutes.en.md      05-founding-assembly-minutes.docx        none
pair 06-uputstvo-osnivacki-akt.docx              06-guidance-founding-act.en.md            06-guidance-founding-act.docx            none
pair 07-uputstvo-statut.docx                     07-guidance-statute.en.md                 07-guidance-statute.docx                 bullet
node "$S/build-docx.js" plain     "$R/completion-guide.md"  "$D/completion-guide.docx"
node "$S/build-docx.js" bilingual "$R/statute-additions.md" "$D/statute-additions.docx"
for f in "$G"/*.md; do n=$(basename "$f" .md); node "$S/build-docx.js" bilingual "$f" "$D/$n.docx"; done
echo "done: $(ls "$D" | wc -l) documents in $D"
