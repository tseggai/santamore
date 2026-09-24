"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { DonateButton } from "@/components/donate/DonateButton";
import { isPledgeMode } from "@/lib/org";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { MobileMenu } from "@/components/MobileMenu";
import { NavDropdown } from "@/components/NavDropdown";
import { Link, usePathname } from "@/i18n/navigation";
import iconColor from "@/public/brand/SantamoreIcon-Color.png";
import iconWhite from "@/public/brand/SantamoreIcon-White.png";

const NAV_ITEMS = [
  { href: "/dogadjaji", key: "events" },
  { href: "/kampanje", key: "campaigns" },
  { href: "/prikupljaci", key: "fundraisers" },
  { href: "/transparentnost", key: "ledger" },
] as const;

/** Everything about us, behind one "About us" item. */
const ABOUT_ITEMS = [
  { href: "/o-nama", key: "about" },
  { href: "/kako-radimo", key: "how" },
  { href: "/korisnici", key: "beneficiaries" },
  { href: "/partneri", key: "partners" },
  { href: "/vijesti", key: "news" },
  { href: "/galerija", key: "gallery" },
  { href: "/cesta-pitanja", key: "faq" },
  { href: "/volontiraj", key: "volunteer" },
  { href: "/prijava-za-pomoc", key: "apply" },
  { href: "/kontakt", key: "contact" },
] as const;

/**
 * Sticky site header. On the landing page it starts transparent over the
 * hero, white logo and links, and turns to the paper version once the
 * page scrolls; everywhere else it is the paper version from the start.
 */
export default function Header({ notice = null }: { notice?: string | null }) {
  const t = useTranslations();
  const pathname = usePathname();
  const overHero = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!overHero) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overHero]);

  const glass = overHero && !scrolled;
  const link = glass ? "text-paper/90 hover:text-paper" : "text-black/80 hover:text-sea";

  return (
    <header
      className={`sticky top-0 z-40 border-b-[0.5px] transition-colors duration-300 motion-reduce:transition-none ${
        glass ? "border-transparent bg-transparent" : "border-line bg-paper"
      }`}
    >
      {notice ? (
        <p role="status" className="flex h-9 items-center justify-center bg-red px-5 text-[13.5px] font-bold text-paper">
          <span className="truncate">{notice}</span>
        </p>
      ) : null}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-paper focus:px-3 focus:py-2"
      >
        {t("common.skipToContent")}
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:py-4">
        <Link href="/" className="shrink-0">
          <Image src={glass ? iconWhite : iconColor} alt={t("common.siteName")} className="h-10 w-auto sm:h-11" priority />
        </Link>

        {/* desktop: the links in the middle */}
        <nav aria-label={t("nav.menu")} className="hidden items-center gap-x-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={`text-[15px] font-semibold ${link}`}>
              {t(`nav.${item.key}`)}
            </Link>
          ))}
          <NavDropdown
            label={t("nav.about")}
            items={ABOUT_ITEMS.map((item) => ({ href: item.href, label: t(`nav.aboutMenu.${item.key}`) }))}
            className={`text-[15px] font-semibold ${link}`}
          />
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/dashboard" className={`hidden text-[15px] font-semibold md:inline ${link}`}>
            {t("nav.myPage")}
          </Link>
          {/* the language is one tap away on every size; on a phone it sits before Donate */}
          <LocaleSwitcher variant={glass ? "dark" : "light"} />
          <DonateButton
            request={{ kind: "campaign" }}
            href="/podrzi"
            className="rounded-lg bg-red px-4 py-2 text-sm font-bold text-paper transition-colors hover:bg-red-dark"
          >
            {t(isPledgeMode() ? "nav.pledge" : "nav.donate")}
          </DonateButton>
          {/* phone: everything else behind one button */}
          <MobileMenu
            items={NAV_ITEMS.map((item) => ({ href: item.href, label: t(`nav.${item.key}`) }))}
            group={{ label: t("nav.about"), items: ABOUT_ITEMS.map((item) => ({ href: item.href, label: t(`nav.aboutMenu.${item.key}`) })) }}
            consoleItem={{ href: "/dashboard", label: t("nav.myPage") }}
            openLabel={t("nav.menu")}
            closeLabel={t("nav.menuClose")}
            light={glass}
          />
        </div>
      </div>
    </header>
  );
}
