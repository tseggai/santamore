#!/usr/bin/env python3
"""Merge researched prospect files into content/prospects/catalogue.json.

    python3 scripts/prospects/merge-catalogue.py research/*.json

Each input is a JSON array in the shape of the research brief
(docs/PROSPECTS.md). The script normalises what can be normalised (handles,
URLs, blanks), keys every entry by its name, and REFUSES what the catalogue
may not hold: an unknown kind, sector, area or tier, an entry with no source,
or a named person without the page that names them. Refused entries are
printed with the reason and left out; nothing is guessed. Entries already in
the catalogue are kept unless an input carries the same key, which replaces
them.
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "content" / "prospects" / "catalogue.json"

KINDS = {"sponsor", "in_kind", "partner", "media", "funder"}
SECTORS = {
    "bank", "insurance", "telecom", "energy_industry", "retail_fmcg", "food_drink",
    "marina_resort", "hotel", "real_estate", "yachting", "tourism_transport", "health",
    "fitness_wellness", "professional_services", "local_shop", "municipality",
    "tourism_board", "sport_body", "culture", "media", "foundation_grant", "embassy_intl",
}
AREAS = {"tivat", "boka", "coast", "national", "international"}
TIERS = {"core", "title", "gold", "silver", "local", "inkind"}
FIELDS = [
    "key", "name", "legal_name", "kind", "sector", "town", "area", "website", "email", "phone",
    "instagram", "contact_name", "contact_role", "contact_email", "contact_phone",
    "contact_source", "tier_fit", "why", "sources",
]
EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
URL = re.compile(r"^https?://\S+$")


def key_of(name: str) -> str:
    text = unicodedata.normalize("NFKD", name)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"đ", "dj", text, flags=re.I).lower()
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", text))[:80]


def blank(value):
    if value is None:
        return None
    value = str(value).strip()
    return value if value and value.lower() not in {"null", "n/a", "none", "-"} else None


def handle(value):
    value = blank(value)
    if not value:
        return None
    value = re.sub(r"^https?://(www\.)?instagram\.com/", "", value).lstrip("@").split("/")[0].split("?")[0]
    return value if re.fullmatch(r"[A-Za-z0-9._]{1,30}", value) else None


def clean(raw: dict):
    name = blank(raw.get("name"))
    if not name:
        return None, "no name"
    entry = {field: blank(raw.get(field)) for field in FIELDS if field not in {"key", "sources"}}
    entry["name"] = name
    entry["key"] = key_of(name)
    entry["instagram"] = handle(raw.get("instagram"))
    entry["sources"] = [s for s in dict.fromkeys(blank(s) for s in (raw.get("sources") or [])) if s and URL.match(s)]
    for field in ("website", "contact_source"):
        if entry[field] and not URL.match(entry[field]):
            entry[field] = None
    for field in ("email", "contact_email"):
        if entry[field] and not EMAIL.match(entry[field]):
            entry[field] = None
    if entry["kind"] not in KINDS:
        return None, f"unknown kind {entry['kind']!r}"
    if entry["sector"] not in SECTORS:
        return None, f"unknown sector {entry['sector']!r}"
    if entry["area"] not in AREAS:
        return None, f"unknown area {entry['area']!r}"
    if entry["tier_fit"] is not None and entry["tier_fit"] not in TIERS:
        entry["tier_fit"] = None
    if not entry["sources"]:
        return None, "no source"
    if entry["contact_name"] and not entry["contact_source"]:
        # The person stays out; the organisation is still worth keeping.
        for field in ("contact_name", "contact_role", "contact_email", "contact_phone"):
            entry[field] = None
    if not entry["contact_name"]:
        entry["contact_role"] = None
        entry["contact_source"] = None
    return {field: entry[field] for field in FIELDS}, None


def main(paths):
    merged = {e["key"]: e for e in json.loads(OUT.read_text(encoding="utf-8"))} if OUT.exists() else {}
    refused = 0
    for path in paths:
        for raw in json.loads(Path(path).read_text(encoding="utf-8")):
            entry, why = clean(raw)
            if entry is None:
                refused += 1
                print(f"refused ({Path(path).name}): {raw.get('name')!r}: {why}")
                continue
            if entry["key"] in merged and merged[entry["key"]] != entry:
                print(f"replaced: {entry['key']}")
            merged[entry["key"]] = entry
    entries = sorted(merged.values(), key=lambda e: (e["kind"], e["sector"], e["name"].lower()))
    OUT.write_text(json.dumps(entries, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    named = sum(1 for e in entries if e["contact_name"])
    print(f"{len(entries)} entries, {named} with a named person, {refused} refused -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main(sys.argv[1:])
