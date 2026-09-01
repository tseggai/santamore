// Minimal RFC 4180 CSV parsing for the admin reconciliation queue. The
// bank's export format is unknown (docs/PLACEHOLDERS.md), so parsing is
// deliberately generic: quoted fields, escaped quotes, embedded
// separators/newlines, CRLF, BOM, and European semicolon-separated exports.
// Column meaning is assigned by the admin in the mapping UI, not guessed here.

export type CsvRow = string[];

/** Pick the most plausible separator from the first line outside quotes. */
export function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.indexOf("\n") === -1 ? text.length : text.indexOf("\n"));
  let inQuotes = false;
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in counts) counts[ch] += 1;
  }
  return [";", "\t", ","].reduce((best, d) => (counts[d] > counts[best] ? d : best), ",");
}

export function parseCsv(text: string, delimiter?: string): CsvRow[] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const sep = delimiter ?? detectDelimiter(input);

  const rows: CsvRow[] = [];
  let row: CsvRow = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === "") {
      inQuotes = true;
    } else if (ch === sep) {
      pushField();
    } else if (ch === "\n") {
      pushRow();
    } else if (ch === "\r") {
      if (input[i + 1] === "\n") i += 1;
      pushRow();
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    pushRow();
  }

  // Drop fully empty trailing lines (a final newline is not a record).
  return rows.filter((r) => r.length > 1 || r[0] !== "");
}

/** RFC 4180 serialisation for the ledger CSV exports. */
export function toCsv(rows: (string | number | null)[][]): string {
  const escape = (value: string | number | null): string => {
    const text = value === null ? "" : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return rows.map((row) => row.map(escape).join(",")).join("\r\n") + "\r\n";
}
