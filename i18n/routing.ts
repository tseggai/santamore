import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // "me" is the brief's URL segment for Montenegrin; it is not a valid
  // BCP-47 tag, so <html lang> uses htmlLang() below instead.
  locales: ["me", "en", "ru"],
  defaultLocale: "me",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

const HTML_LANG: Record<Locale, string> = {
  me: "sr-Latn-ME",
  en: "en",
  ru: "ru",
};

export function htmlLang(locale: Locale): string {
  return HTML_LANG[locale];
}
