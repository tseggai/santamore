import { Nunito } from "next/font/google";

// One family for everything (owner decision 2026-09-11): Nunito — soft,
// rounded, a variable weight axis from 200 to 1000, and full Latin-Extended
// and Cyrillic coverage, so č ć š ž đ and the ru locale render from the
// same face. Display and body differ only in weight and size.
export const brandFont = Nunito({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-nunito",
  display: "swap",
});
