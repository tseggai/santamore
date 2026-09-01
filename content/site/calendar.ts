// The full-size annual calendar, verbatim from the team guide ("The
// calendar, once we're at full size"). Editorial content, not UI strings —
// hence a content module rather than messages/*.json.

import type { Locale } from "@/i18n/routing";

export interface CalendarRow {
  month: string;
  name: string;
  who: string;
  flagship?: boolean;
}

export const calendarContent: Record<
  Locale,
  { heading: string; note: string; rows: CalendarRow[] }
> = {
  me: {
    heading: "Kalendar, kad budemo u punoj veličini",
    note: "Tri događaja u 2026. Šest u 2027. Deset u 2028. Radije ćemo jedan događaj organizovati prelijepo nego četiri loše.",
    rows: [
      { month: "DEC", name: "Santa Run — 5K, porodična šetnja, dječja trka", who: "Svi. Naš glavni događaj.", flagship: true },
      { month: "DEC", name: "Santa Crawl", who: "Odrasli, naši barovi i restorani" },
      { month: "DEC", name: "Pisma Djeda Mrazu i pećina", who: "Djeca i roditelji" },
      { month: "1. JAN", name: "Novogodišnji skok — zimsko kupanje", who: "Hrabri. I sve kamere u Boki.", flagship: true },
      { month: "FEB", name: "Dan rezultata — objavljujemo i uručujemo javno", who: "Donatori, sponzori, mediji i naši volonteri" },
      { month: "MAR", name: "Banket i aukcija", who: "Naša poslovna zajednica" },
      { month: "APR", name: "Kotor Vertical — stepenice tvrđave", who: "Sportisti, publika" },
      { month: "MAJ", name: "Plava srca — čišćenje i plivanje na otvorenom", who: "Porodice, škole, ronioci" },
      { month: "JUN", name: "Paddle for a Cause — SUP i kajak", who: "Sportovi na vodi, gosti" },
      { month: "JUL", name: "Santamore regata", who: "Naša jedriličarska i marinska zajednica", flagship: true },
      { month: "AVG", name: "Santamore kup — esport i fudbal", who: "Mladi, 14–25" },
      { month: "SEP", name: "Obalna štafeta — jedan tim po ogranku", who: "Svi mi odjednom", flagship: true },
      { month: "OKT", name: "Mjesec korporativnih izazova", who: "Kompanije i njihovi zaposleni" },
      { month: "NOV", name: "Otvara se sezona darivanja — klub donatora", who: "Naši postojeći podržavaoci" },
    ],
  },
  en: {
    heading: "The calendar, once we're at full size",
    note: "Three of these in 2026. Six in 2027. Ten in 2028. We'd rather run one event beautifully than four badly.",
    rows: [
      { month: "DEC", name: "Santa Run — 5K, family walk, kids' race", who: "Everyone. Our flagship.", flagship: true },
      { month: "DEC", name: "Santa Crawl", who: "Adults, our bars and restaurants" },
      { month: "DEC", name: "Letters to Santa & the grotto", who: "Children and parents" },
      { month: "1 JAN", name: "New Year Plunge — winter sea swim", who: "The brave. And every camera in the bay.", flagship: true },
      { month: "FEB", name: "Impact Day — we publish, and hand over in public", who: "Donors, sponsors, press, and our volunteers" },
      { month: "MAR", name: "Banquet & Auction", who: "Our business community" },
      { month: "APR", name: "Kotor Vertical — the fortress stairs", who: "Athletes, spectators" },
      { month: "MAY", name: "Blue Hearts — clean-up & open-water swim", who: "Families, schools, divers" },
      { month: "JUN", name: "Paddle for a Cause — SUP & kayak", who: "Water sports, visitors" },
      { month: "JUL", name: "Santamore Regatta", who: "Our sailing and marina community", flagship: true },
      { month: "AUG", name: "Santamore Cup — esports & football", who: "Youth, 14–25" },
      { month: "SEP", name: "Coastal Relay — one team per chapter", who: "All of us at once", flagship: true },
      { month: "OCT", name: "Corporate Challenge month", who: "Companies and their staff" },
      { month: "NOV", name: "Giving season opens — donor club drive", who: "Our existing supporters" },
    ],
  },
  ru: {
    heading: "Календарь — каким он будет в полном размере",
    note: "Три события в 2026-м. Шесть в 2027-м. Десять в 2028-м. Лучше провести одно событие прекрасно, чем четыре плохо.",
    rows: [
      { month: "ДЕК", name: "Santa Run — 5 км, семейная прогулка, детский забег", who: "Все. Наше главное событие.", flagship: true },
      { month: "ДЕК", name: "Santa Crawl", who: "Взрослые, наши бары и рестораны" },
      { month: "ДЕК", name: "Письма Деду Морозу и грот", who: "Дети и родители" },
      { month: "1 ЯНВ", name: "Новогодний заплыв — зимнее купание", who: "Смельчаки. И все камеры залива.", flagship: true },
      { month: "ФЕВ", name: "День результатов — публикуем и вручаем публично", who: "Доноры, спонсоры, пресса и наши волонтёры" },
      { month: "МАР", name: "Банкет и аукцион", who: "Наше деловое сообщество" },
      { month: "АПР", name: "Kotor Vertical — лестницы крепости", who: "Спортсмены, зрители" },
      { month: "МАЙ", name: "Синие сердца — уборка и заплыв в открытой воде", who: "Семьи, школы, дайверы" },
      { month: "ИЮН", name: "Paddle for a Cause — SUP и каяк", who: "Водный спорт, гости" },
      { month: "ИЮЛ", name: "Регата Santamore", who: "Наше парусное и маринное сообщество", flagship: true },
      { month: "АВГ", name: "Кубок Santamore — киберспорт и футбол", who: "Молодёжь 14–25" },
      { month: "СЕН", name: "Прибрежная эстафета — по команде от каждого отделения", who: "Все мы сразу", flagship: true },
      { month: "ОКТ", name: "Месяц корпоративных вызовов", who: "Компании и их сотрудники" },
      { month: "НОЯ", name: "Открывается сезон дарения — клуб доноров", who: "Наши постоянные сторонники" },
    ],
  },
};
