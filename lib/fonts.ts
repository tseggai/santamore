import { Cormorant_Garamond, DM_Mono, DM_Sans } from "next/font/google";

// latin-ext is required: all faces must render č ć š ž đ.

// Display: big, thin, elegant, easily readable — light weights carry the
// look, nothing is bolded.
export const displayFont = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  variable: "--font-display-face",
  display: "swap",
});

// Body: round and airy; DM Sans is DM Mono's sibling, so digits and body
// share one voice. Helvetica Neue leads the fallback stack.
export const bodyFont = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body-face",
  display: "swap",
});

export const dmMono = DM_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});
