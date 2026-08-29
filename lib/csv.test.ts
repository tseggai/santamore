import { describe, expect, it } from "vitest";

import { detectDelimiter, parseCsv } from "@/lib/csv";

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
