import { Cinzel_Decorative, Nunito } from "next/font/google";

// Body, figures, UI: Nunito — soft, rounded, a variable weight axis from
// 200 to 1000, full Latin-Extended and Cyrillic, so č ć š ž đ and the ru
// locale render from one face.
export const brandFont = Nunito({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-nunito",
  display: "swap",
});

// Display: Cinzel Decorative (owner decision 2026-09-11) — capitals only by
// design, Latin and Latin-Extended. It ships no Cyrillic, so ru headlines
// fall through to Nunito glyph by glyph via the font stack.
export const displayFont = Cinzel_Decorative({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  variable: "--font-cinzel",
  display: "swap",
});
