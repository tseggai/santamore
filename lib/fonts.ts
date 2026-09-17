import { Julius_Sans_One, Nunito } from "next/font/google";

// Body, figures, UI: Nunito — soft, rounded, a variable weight axis from
// 200 to 1000, full Latin-Extended and Cyrillic, so č ć š ž đ and the ru
// locale render from one face.
export const brandFont = Nunito({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-nunito",
  display: "swap",
});

// Display: Julius Sans One (owner decision 2026-09-17, replacing Cinzel
// Decorative) — one weight, capitals by design, Latin and Latin-Extended.
// It ships no Cyrillic, so ru headlines fall through to Nunito glyph by
// glyph via the font stack. Sizes and weights in the type scale are unchanged.
export const displayFont = Julius_Sans_One({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  variable: "--font-display-face",
  display: "swap",
});
