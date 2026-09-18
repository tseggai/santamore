// Landing-page editorial content, from the team guide (verbatim where the
// wording was already right): the two funds, as the "how it works" section
// states them.

import type { Locale } from "@/i18n/routing";

export interface LandingContent {
  funds: string[];
  fundsCta: string;
}

export const landingContent: Record<Locale, LandingContent> = {
  me: {
    funds: [
      "Donacije idu u Fond za pomoć — 100% korisnicima, ništa se ne odbija.",
      "Sponzorstva, kotizacije i grantovi idu u Operativni fond — plate, osiguranje, oprema.",
      "Dva fonda se nikad ne miješaju, i objavljujemo ih jedan pored drugog.",
      "Naši sponzori plaćaju naš tim, da donacije ne moraju.",
    ],
    fundsCta: "Pogledaj oba fonda u registru",
  },
  en: {
    funds: [
      "Donations go to the Impact Fund — 100% to beneficiaries, nothing deducted.",
      "Sponsorship, entry fees and grants go to the Operations Fund — salaries, insurance, equipment.",
      "The two funds are never mixed, and we publish them side by side.",
      "Our sponsors pay for our team, so donations don't have to.",
    ],
    fundsCta: "See both funds in the ledger",
  },
  ru: {
    funds: [
      "Пожертвования идут в Фонд помощи — 100% получателям, без вычетов.",
      "Спонсорство, взносы и гранты идут в Операционный фонд — зарплаты, страховка, оборудование.",
      "Два фонда никогда не смешиваются, и мы публикуем их рядом.",
      "Наши спонсоры оплачивают нашу команду, чтобы пожертвованиям не пришлось.",
    ],
    fundsCta: "Посмотреть оба фонда в реестре",
  },
};
