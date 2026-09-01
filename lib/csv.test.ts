import { describe, expect, it } from "vitest";

import { detectDelimiter, parseCsv, toCsv } from "@/lib/csv";

describe("detectDelimiter", () => {
  it("prefers semicolons in European bank exports", () => {
    expect(detectDelimiter("Datum;Iznos;Opis\n")).toBe(";");
  });
  it("falls back to commas", () => {
    expect(detectDelimiter("date,amount,description")).toBe(",");
  });
  it("ignores separators inside quotes", () => {
    expect(detectDelimiter('"a;b",c,d')).toBe(",");
  });
  it("detects tabs", () => {
    expect(detectDelimiter("a\tb\tc")).toBe("\t");
  });
});

describe("parseCsv", () => {
  it("parses plain rows", () => {
    expect(parseCsv("a,b,c\nd,e,f\n")).toEqual([
      ["a", "b", "c"],
      ["d", "e", "f"],
    ]);
  });

  it("handles quoted fields with separators, quotes and newlines", () => {
    expect(parseCsv('"a,1","he said ""hi""","line\nbreak"\n')).toEqual([
      ["a,1", 'he said "hi"', "line\nbreak"],
    ]);
  });

  it("handles CRLF and a BOM", () => {
    expect(parseCsv("﻿a,b\r\nc,d\r\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("auto-detects semicolons", () => {
    expect(parseCsv("20.12.2026;25,00;UPLATA SM-1226-0473\n")).toEqual([
      ["20.12.2026", "25,00", "UPLATA SM-1226-0473"],
    ]);
  });

  it("keeps empty fields and skips blank trailing lines", () => {
    expect(parseCsv("a,,c\n\n")).toEqual([["a", "", "c"]]);
  });
});

describe("toCsv", () => {
  it("escapes quotes, separators and newlines per RFC 4180", () => {
    expect(toCsv([["a", 'he said "hi"', "x,y", "line\nbreak", null, 25]])).toBe(
      'a,"he said ""hi""","x,y","line\nbreak",,25\r\n',
    );
  });

  it("defuses spreadsheet formula injection but keeps negative amounts", () => {
    expect(
      toCsv([['=HYPERLINK("http://evil","x")', "+2+3", "@cmd", "-25.75", "-2+3"]]),
    ).toBe(`"'=HYPERLINK(""http://evil"",""x"")",'+2+3,'@cmd,-25.75,'-2+3\r\n`);
  });

  it("round-trips through parseCsv", () => {
    const rows = [
      ["date", "amount", "who"],
      ["2026-12-20", "25.00", 'Kafana „Sidro", d.o.o.'],
    ];
    expect(parseCsv(toCsv(rows), ",")).toEqual(rows);
  });
});
