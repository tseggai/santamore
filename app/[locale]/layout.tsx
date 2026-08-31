import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing, htmlLang } from "@/i18n/routing";
import { bodyFont, displayFont, dmMono } from "@/lib/fonts";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "../globals.css";

export const metadata: Metadata = {
  title: {
    default: "Santamore",
    template: "%s · Santamore",
  },
  description:
    "Peer-to-peer fundraising for a Montenegrin charitable non-profit in Tivat.",
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
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
