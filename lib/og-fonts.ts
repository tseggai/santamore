import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Fonts for next/og share cards. satori ships no Cyrillic and only a latin
// subset by default, so without these the brand rule (č ć š ž đ must render,
// CLAUDE.md) breaks on every card and ru labels vanish. Nunito (the one
// brand face) covers latin-ext and Cyrillic; Noto Sans backfills anything
// left glyph-by-glyph.
//
// The OG routes run on the Node runtime, where `fetch(new URL(..., import.meta.url))`
// resolves to a bare /_next/static path and throws "Failed to parse URL".
// The files are read from disk instead; next.config.ts traces them into
// the deployed functions.

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
};

async function load(file: string): Promise<ArrayBuffer> {
  const buffer = await readFile(join(process.cwd(), "assets", "fonts", file));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export async function ogFonts(): Promise<OgFont[]> {
  const [dmRegular, dmBold, notoRegular, notoBold, julius] = await Promise.all([
    load("Nunito-Regular.ttf"),
    load("Nunito-Bold.ttf"),
    load("NotoSans-Regular.ttf"),
    load("NotoSans-Bold.ttf"),
    load("JuliusSansOne-Regular.ttf"),
  ]);
  return [
    { name: "Nunito", data: dmRegular, weight: 400, style: "normal" },
    { name: "Nunito", data: dmBold, weight: 700, style: "normal" },
    { name: "Noto Sans", data: notoRegular, weight: 400, style: "normal" },
    { name: "Noto Sans", data: notoBold, weight: 700, style: "normal" },
    { name: "Julius Sans One", data: julius, weight: 400, style: "normal" },
  ];
}

export const OG_FONT_FAMILY = '"Nunito", "Noto Sans"';
/** Headlines on the cards; Nunito/Noto backfill anything Julius lacks (Cyrillic). */
export const OG_DISPLAY_FAMILY = '"Julius Sans One", "Nunito", "Noto Sans"';
