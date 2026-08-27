import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import logo from "@/public/brand/SantamoreLogo-Color.png";

const NAV_ITEMS = [
  { href: "/dogadjaji", key: "events" },
  { href: "/prikupljaci", key: "fundraisers" },
  { href: "/transparentnost", key: "ledger" },
  { href: "/o-nama", key: "about" },
] as const;

export default function Header() {
  const t = useTranslations();

  return (
    <header className="border-b-[1.5px] border-ink bg-paper">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-paper focus:px-3 focus:py-2"
      >
        {t("common.skipToContent")}
      </a>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4">
        <Link href="/" className="shrink-0">
          <Image src={logo} alt={t("common.siteName")} className="h-9 w-auto" priority />
        </Link>

        <nav
          aria-label={t("nav.menu")}
          className="order-last flex w-full flex-wrap items-center gap-x-5 gap-y-2 sm:order-none sm:w-auto"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-ink/80 hover:text-sea"
            >
              {t(`nav.${item.key}`)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          <Link
            href="/podrzi"
            className="rounded-xl bg-red px-4 py-2 text-sm font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark"
          >
            {t("nav.donate")}
          </Link>
        </div>
      </div>
    </header>
  );
}
