// Landing-page editorial content, from the team guide (verbatim where the
// wording was already right). The 2025 "triad" is the ONLY honest
// track-record claim available — no invented amounts (docs/PLACEHOLDERS.md).

import type { Locale } from "@/i18n/routing";

export interface LandingContent {
  triad: { big: string; label: string }[];
  steps: { title: string; desc: string }[];
  funds: string[];
  fundsCta: string;
}

export const landingContent: Record<Locale, LandingContent> = {
  me: {
    triad: [
      { big: "2025", label: "Naša prva godina. Jedan maraton, jedan pub crawl." },
      { big: "100%", label: "Svake donacije otišlo je u dobrotvorne svrhe." },
      { big: "2026", label: "Pretvaramo to u instituciju." },
    ],
    steps: [
      { title: "Ti daš — ili trčiš", desc: "Doniraš, ili napraviš svoju stranicu i pitaš ljude koje znaš." },
      { title: "Nezavisni odbor odlučuje", desc: "Većina nije zaposlena kod nas. Kriterijumi su objavljeni, sukobi interesa se izuzimaju." },
      { title: "Objavimo dokaz", desc: "Svaka uplata i isplata u javnom registru, sa dokumentacijom. Bez prijave, bez PDF-a." },
    ],
    funds: [
      "Donacije idu u Fond za pomoć — 100% korisnicima, ništa se ne odbija.",
      "Sponzorstva, kotizacije i grantovi idu u Operativni fond — plate, osiguranje, oprema.",
      "Dva fonda se nikad ne miješaju, i objavljujemo ih jedan pored drugog.",
      "Naši sponzori plaćaju naš tim, da donacije ne moraju.",
    ],
    fundsCta: "Pogledaj oba fonda u registru",
  },
  en: {
    triad: [
      { big: "2025", label: "Our first year. One marathon, one pub crawl." },
      { big: "100%", label: "Of every donation went to charity." },
      { big: "2026", label: "We turn it into an institution." },
    ],
    steps: [
      { title: "You give — or you run", desc: "Donate, or start your own page and ask the people you know." },
      { title: "An independent committee decides", desc: "Majority not employed by us. Criteria published, conflicts recused." },
      { title: "We publish the proof", desc: "Every euro in and out in a public ledger, with documentation. No login, no PDF." },
    ],
    funds: [
      "Donations go to the Impact Fund — 100% to beneficiaries, nothing deducted.",
      "Sponsorship, entry fees and grants go to the Operations Fund — salaries, insurance, equipment.",
      "The two funds are never mixed, and we publish them side by side.",
      "Our sponsors pay for our team, so donations don't have to.",
    ],
    fundsCta: "See both funds in the ledger",
  },
  ru: {
    triad: [
      { big: "2025", label: "Наш первый год. Один марафон, один pub crawl." },
      { big: "100%", label: "Каждого пожертвования ушло на благотворительность." },
      { big: "2026", label: "Превращаем это в институцию." },
    ],
    steps: [
      { title: "Вы даёте — или бежите", desc: "Пожертвуйте — или создайте свою страницу и попросите тех, кого знаете." },
      { title: "Решает независимый комитет", desc: "Большинство не работает у нас. Критерии опубликованы, конфликты отводятся." },
      { title: "Мы публикуем доказательства", desc: "Каждый евро туда и обратно — в публичном реестре, с документами. Без входа, без PDF." },
    ],
    funds: [
      "Пожертвования идут в Фонд помощи — 100% получателям, без вычетов.",
      "Спонсорство, взносы и гранты идут в Операционный фонд — зарплаты, страховка, оборудование.",
      "Два фонда никогда не смешиваются, и мы публикуем их рядом.",
      "Наши спонсоры оплачивают нашу команду, чтобы пожертвованиям не пришлось.",
    ],
    fundsCta: "Посмотреть оба фонда в реестре",
  },
};
