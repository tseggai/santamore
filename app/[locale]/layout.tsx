import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing, htmlLang } from "@/i18n/routing";
import { bodyFont, displayFont, dmMono } from "@/lib/fonts";
import { siteOrigin } from "@/lib/site";
import { CookieConsent } from "@/components/CookieConsent";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: {
    default: "Santamore",
    template: "%s · Santamore",
  },
  description:
    "Peer-to-peer fundraising for a Montenegrin charitable non-profit in Tivat.",
  openGraph: {
    siteName: "Santamore",
    type: "website",
  },
};

// schema.org Organization — only facts that exist; registry details join the
// impressum once real (docs/PLACEHOLDERS.md).
const ORGANIZATION_JSONLD = {
  "@context": "https://schema.org",
  "@type": "NGO",
  name: "Santamore",
  url: siteOrigin(),
  logo: `${siteOrigin()}/brand/SantamoreLogo-Color.png`,
  areaServed: "Montenegro",
  nonprofitStatus: "Nonprofit",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html
      lang={htmlLang(locale)}
      className={`${displayFont.variable} ${bodyFont.variable} ${dmMono.variable}`}
    >
      <body className="flex min-h-screen flex-col bg-paper text-ink">
        <NextIntlClientProvider>
          {children}
          <CookieConsent domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? null} />
        </NextIntlClientProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(ORGANIZATION_JSONLD).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  );
}
