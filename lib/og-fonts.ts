// Fonts for next/og share cards. satori ships no Cyrillic and only a latin
// subset by default, so without these the brand rule (č ć š ž đ must render,
// CLAUDE.md) breaks on every card and ru labels vanish. DM Sans (the body
// face) covers latin-ext; Noto Sans backfills Cyrillic glyph-by-glyph.
// new URL(..., import.meta.url) makes the bundler ship the files with the
// route.

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
};

async function load(url: URL): Promise<ArrayBuffer> {
  const response = await fetch(url);
  return response.arrayBuffer();
}

export async function ogFonts(): Promise<OgFont[]> {
  const [dmRegular, dmBold, notoRegular, notoBold] = await Promise.all([
    load(new URL("../assets/fonts/DMSans-Regular.ttf", import.meta.url)),
    load(new URL("../assets/fonts/DMSans-Bold.ttf", import.meta.url)),
    load(new URL("../assets/fonts/NotoSans-Regular.ttf", import.meta.url)),
    load(new URL("../assets/fonts/NotoSans-Bold.ttf", import.meta.url)),
  ]);
  return [
    { name: "DM Sans", data: dmRegular, weight: 400, style: "normal" },
    { name: "DM Sans", data: dmBold, weight: 700, style: "normal" },
    { name: "Noto Sans", data: notoRegular, weight: 400, style: "normal" },
    { name: "Noto Sans", data: notoBold, weight: 700, style: "normal" },
  ];
}

export const OG_FONT_FAMILY = '"DM Sans", "Noto Sans"';
