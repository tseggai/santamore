import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DonateButton } from "@/components/donate/DonateButton";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { MobileMenu } from "@/components/MobileMenu";
import icon from "@/public/brand/SantamoreIcon-Color.png";

const NAV_ITEMS = [
  { href: "/dogadjaji", key: "events" },
  { href: "/kampanje", key: "campaigns" },
  { href: "/prikupljaci", key: "fundraisers" },
  { href: "/transparentnost", key: "ledger" },
  { href: "/o-nama", key: "about" },
] as const;

export default function Header() {
  const t = useTranslations();

  return (
    <header className="border-b-[0.5px] border-line bg-paper">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-paper focus:px-3 focus:py-2"
      >
        {t("common.skipToContent")}
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:py-4">
        <Link href="/" className="shrink-0">
          <Image src={icon} alt={t("common.siteName")} className="h-10 w-auto sm:h-11" priority />
        </Link>

        {/* desktop: the links in the middle */}
        <nav aria-label={t("nav.menu")} className="hidden items-center gap-x-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="text-[15px] font-semibold text-black/80 hover:text-sea">
              {t(`nav.${item.key}`)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/dashboard" className="hidden text-[15px] font-semibold text-black/80 hover:text-sea md:inline">
            {t("nav.myPage")}
          </Link>
          <div className="hidden md:block">
            <LocaleSwitcher />
          </div>
          <DonateButton
            request={{ kind: "campaign" }}
            href="/podrzi"
            className="rounded-lg bg-red px-4 py-2 text-sm font-bold text-paper transition-colors hover:bg-red-dark"
          >
            {t("nav.donate")}
          </DonateButton>
          {/* phone: everything else behind one button */}
          <MobileMenu
            items={NAV_ITEMS.map((item) => ({ href: item.href, label: t(`nav.${item.key}`) }))}
            consoleItem={{ href: "/dashboard", label: t("nav.myPage") }}
            openLabel={t("nav.menu")}
            closeLabel={t("nav.menuClose")}
          />
        </div>
      </div>
    </header>
  );
}
