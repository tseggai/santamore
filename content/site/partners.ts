// /partneri editorial content — the tier sheet, the 3.5% tax argument and
// the four deliverables, from the team guide. The guide's target-company
// list is internal and NEVER published here. ru drafted, flagged for native
// review like messages/ru.json.

import type { Locale } from "@/i18n/routing";

export interface PartnerTier {
  /** Stable key, also what the pledge carries. */
  id: string;
  name: string;
  price: string;
  /** One line: what the tier is. */
  desc: string;
  /** What the sponsor gets. */
  perks: string[];
  /** The tier we ask for first: shown before the others, marked as preferred. */
  preferred?: boolean;
}

export interface PartnersContent {
  heroEyebrow: string;
  heroTitle: string;
  heroLead: string;
  /** One line on the 3.5% allowance, set in italics under the lead. */
  taxNote: string;
  tiersHeading: string;
  preferredBadge: string;
  selectTier: string;
  tiers: PartnerTier[];
  deliverHeading: string;
  deliverLead: string;
  deliver: { title: string; desc: string }[];
  sponsorsHeading: string;
  sponsorsLead: string;
  sponsorsEmpty: string;
  yearLabel: string;
  currentLabel: string;
  inKindLabel: string;
  /** The pledge form, opened from a tier. */
  pledgeTitle: string;
  pledgeLead: string;
  tierLabel: string;
  businessLabel: string;
  repEmailLabel: string;
  phoneLabel: string;
  noteLabel: string;
  noteHint: string;
  pledgeButton: string;
  pledgeSending: string;
  pledgeDone: string;
  pledgeDoneSub: string;
}

export const partnersContent: Record<Locale, PartnersContent> = {
  me: {
    heroEyebrow: "Partneri",
    heroTitle: "Budite sponzor",
    heroLead:
      "Sponzorstva finansiraju rad Santamorea: platformu, događaje i takmičenja kojima prikupljamo novac za ciljeve. Zato 100% svake donacije, kotizacije i granta stiže do korisnika. Ime sponzora stoji uz sve što to omogućava, na svakoj stranici.",
    taxNote: "Crnogorske kompanije i pojedinci mogu odbiti do 3,5% bruto prihoda za humanitarna, sportska, zdravstvena, kulturna i ekološka davanja. Većina to nikad ne iskoristi.",
    tiersHeading: "Nivoi partnerstva",
    preferredBadge: "Najvažniji nivo",
    selectTier: "Izaberi ovaj nivo",
    tiers: [
      {
        id: "core",
        name: "Core Cost partner",
        price: "€25.000+",
        desc: "Finansira rad koji stoji iza svakog cilja: platformu, tim i opremu.",
        perks: [
          "Imenovan na svakoj stranici sajta kao partner koji finansira rad Santamorea",
          "Logo na svakom broju, odijelu i događaju u godini",
          "Vrijeme na bini i tim zaposlenih na svakom događaju",
          "Izvještaj o svakoj kampanji i poziv na svaku primopredaju",
        ],
        preferred: true,
      },
      {
        id: "title",
        name: "Title partner",
        price: "€10.000",
        desc: "Ime uz jedan događaj.",
        perks: [
          "Događaj nosi vaše ime",
          "Logo na svakom broju i odijelu, brending na startu",
          "Vrijeme na bini",
          "20 prijava i tim zaposlenih",
        ],
      },
      {
        id: "gold",
        name: "Gold",
        price: "€5.000",
        desc: "Istaknuto prisustvo na jednom događaju.",
        perks: [
          "Brending staze i prostora",
          "Logo na majicama",
          "10 prijava",
          "Objave na mrežama",
        ],
      },
      {
        id: "silver",
        name: "Silver",
        price: "€2.000",
        desc: "Vidljivo mjesto na jednom događaju.",
        perks: [
          "Logo na materijalima",
          "Brendirana stanica na stazi",
          "5 prijava",
        ],
      },
      {
        id: "local",
        name: "Lokalni biznis",
        price: "€250–500",
        desc: "Namjerno pristupačno, da se pridruže i pekara i stomatolog.",
        perks: [
          "Ime na stranici partnera i stranici događaja",
          "Pomen na dan događaja",
          "Četrdeset ovakvih je €15.000 — i četrdeset firmi koje pričaju mušterijama o nama",
        ],
      },
      {
        id: "inkind",
        name: "In kind",
        price: "procijenjeno",
        desc: "Roba i usluge umjesto novca: voda, voće, štampa, medicinsko obezbjeđenje, ozvučenje, mjerenje vremena, prostor, fotografija, odijela.",
        perks: [
          "Vrednujemo i knjižimo tačno kao gotovinu",
          "Priznanje na nivou kojem vrijednost odgovara",
          "Imenovan u izvještaju",
        ],
      },
    ],
    deliverHeading: "Nikome ne treba još jedan logo na baneru",
    deliverLead:
      "Ono što sponzor stvarno želi jeste priča koju njegovo rukovodstvo može ispričati, fotografije sa sopstvenim ljudima, nešto za zaposlene, i dokaz šta se desilo. Sve četvoro ugrađujemo u svaki paket — i isporučujemo bez požurivanja.",
    deliver: [
      { title: "Izvještaj koji je njihov", desc: "Fotografije sa njihovim timom, broj učesnika, medijska pokrivenost, prikupljena sredstva, i tačno gdje je novac otišao. Poslato u roku od 30 dana, bez traženja." },
      { title: "Njihovi zaposleni na timskoj stranici", desc: "Svaki paket uključuje mjesto za tim zaposlenih. Osamnaest njihovih ljudi koji prikupljaju pobjeđuje jedan baner." },
      { title: "Poziv na primopredaju", desc: "Upoznaju ljude do kojih je njihov novac stigao. Ništa što napišemo ne vrijedi više od toga." },
      { title: "Obnova postaje automatska", desc: "Isporuči ovo četvoro bez požurivanja i sljedeći razgovor je formalnost." },
    ],
    sponsorsHeading: "Sponzori",
    sponsorsLead: "Organizacije iza događaja i izazova — novcem, robom ili ponudom za trkače.",
    sponsorsEmpty: "Sponzori za ovu godinu objavljuju se ovdje čim potpišemo.",
    yearLabel: "Godina",
    currentLabel: "Tekuća",
    inKindLabel: "u robi",
    pledgeTitle: "Obećaj sponzorstvo",
    pledgeLead: "Ostavite podatke firme i javljamo se u roku od dva radna dana da dogovorimo detalje. Ovo nije obaveza — dogovor potvrđujemo ugovorom.",
    tierLabel: "Nivo",
    businessLabel: "Naziv firme",
    repEmailLabel: "E-pošta predstavnika",
    phoneLabel: "Telefon",
    noteLabel: "Kratka poruka",
    noteHint: "Nije obavezno — događaj koji vas zanima, pitanje, bilo šta.",
    pledgeButton: "Obećaj sponzorstvo",
    pledgeSending: "Šaljemo…",
    pledgeDone: "Hvala — obećanje je stiglo.",
    pledgeDoneSub: "Javljamo se u roku od dva radna dana sa kalendarom, primjerom izvještaja i nacrtom ugovora.",
  },
  en: {
    heroEyebrow: "Partners",
    heroTitle: "Be a sponsor",
    heroLead:
      "Sponsorship funds Santamore's operations: the platform, the events and the contests we run to raise money for the causes. That is why 100% of every donation, entry fee and grant reaches the beneficiaries. A sponsor's name stands on the work that makes it possible, on every page.",
    taxNote: "Montenegrin companies and individuals may deduct up to 3.5% of gross income for humanitarian, sport, health, cultural and environmental giving. Most never use it.",
    tiersHeading: "Partnership tiers",
    preferredBadge: "The tier that matters most",
    selectTier: "Select this tier",
    tiers: [
      {
        id: "core",
        name: "Core Cost Partner",
        price: "€25,000+",
        desc: "Funds the work behind every cause: the platform, the team and the equipment.",
        perks: [
          "Named on every page of the site as the partner that funds Santamore's operations",
          "Logo on every bib, suit and event of the year",
          "Stage time and an employee team at every event",
          "A report on every campaign and an invitation to every hand-over",
        ],
        preferred: true,
      },
      {
        id: "title",
        name: "Title Partner",
        price: "€10,000",
        desc: "The name on one event.",
        perks: [
          "The event carries your name",
          "Logo on every bib and suit, start-line branding",
          "Stage time",
          "20 entries and an employee team",
        ],
      },
      {
        id: "gold",
        name: "Gold",
        price: "€5,000",
        desc: "A major presence at one event.",
        perks: [
          "Course and venue branding",
          "Logo on shirts",
          "10 entries",
          "Social features",
        ],
      },
      {
        id: "silver",
        name: "Silver",
        price: "€2,000",
        desc: "A visible place at one event.",
        perks: [
          "Logo on materials",
          "A branded station on the course",
          "5 entries",
        ],
      },
      {
        id: "local",
        name: "Local Business",
        price: "€250–500",
        desc: "Deliberately affordable, so the bakery and the dentist can join.",
        perks: [
          "Name on the partners page and the event page",
          "A mention on the day",
          "Forty of these is €15,000 — and forty businesses telling their customers about us",
        ],
      },
      {
        id: "inkind",
        name: "In kind",
        price: "valued",
        desc: "Goods and services instead of cash: water, fruit, printing, medical cover, sound, timing, venue, photography, suits.",
        perks: [
          "Valued and booked exactly like cash",
          "Credited at the tier the value matches",
          "Named in the report",
        ],
      },
    ],
    deliverHeading: "Nobody needs another logo on a banner",
    deliverLead:
      "What a sponsor actually wants is a story their leadership can tell, photos with their own people in them, something for their employees, and proof of what happened. We build all four into every package — and deliver without being chased.",
    deliver: [
      { title: "A report that is theirs", desc: "Photos with their team, participant numbers, media coverage, funds raised, and exactly where the money went. Sent within 30 days, unprompted." },
      { title: "Their employees on a team page", desc: "Every package includes a slot for an employee team. Eighteen of their people fundraising beats one banner." },
      { title: "An invitation to the hand-over", desc: "They meet the people their money reached. Nothing we write is worth more than that." },
      { title: "Renewal becomes automatic", desc: "Deliver these four without being chased and the next conversation is a formality." },
    ],
    sponsorsHeading: "Sponsors",
    sponsorsLead: "The organisations behind the events and challenges — with money, goods or an offer for runners.",
    sponsorsEmpty: "This year's sponsors are published here as soon as we sign.",
    yearLabel: "Year",
    currentLabel: "Current",
    inKindLabel: "in kind",
    pledgeTitle: "Pledge a sponsorship",
    pledgeLead: "Leave your company's details and we reply within two working days to settle the specifics. This is not a commitment — the agreement is confirmed by contract.",
    tierLabel: "Tier",
    businessLabel: "Business name",
    repEmailLabel: "Representative's email",
    phoneLabel: "Phone",
    noteLabel: "A short note",
    noteHint: "Optional — the event you have in mind, a question, anything.",
    pledgeButton: "Pledge sponsorship",
    pledgeSending: "Sending…",
    pledgeDone: "Thank you — your pledge is in.",
    pledgeDoneSub: "We reply within two working days with the calendar, a sample report and a draft agreement.",
  },
  ru: {
    heroEyebrow: "Партнёры",
    heroTitle: "Станьте спонсором",
    heroLead:
      "Спонсорство финансирует работу Santamore: платформу, события и соревнования, с помощью которых мы собираем деньги на цели. Поэтому 100% каждого пожертвования, взноса за участие и гранта доходит до получателей. Имя спонсора стоит на всём, что делает это возможным, на каждой странице.",
    taxNote: "Черногорские компании и физические лица могут вычесть до 3,5% валового дохода на гуманитарные, спортивные, медицинские, культурные и экологические пожертвования. Большинство этим никогда не пользуется.",
    tiersHeading: "Уровни партнёрства",
    preferredBadge: "Самый важный уровень",
    selectTier: "Выбрать этот уровень",
    tiers: [
      {
        id: "core",
        name: "Core Cost Partner",
        price: "€25 000+",
        desc: "Финансирует работу, стоящую за каждой целью: платформу, команду и оборудование.",
        perks: [
          "Назван на каждой странице сайта как партнёр, финансирующий работу Santamore",
          "Логотип на каждом номере, костюме и событии года",
          "Время на сцене и команда сотрудников на каждом событии",
          "Отчёт о каждой кампании и приглашение на каждую передачу",
        ],
        preferred: true,
      },
      {
        id: "title",
        name: "Title Partner",
        price: "€10 000",
        desc: "Имя рядом с одним событием.",
        perks: [
          "Событие носит ваше имя",
          "Логотип на каждом номере и костюме, брендинг на старте",
          "Время на сцене",
          "20 регистраций и команда сотрудников",
        ],
      },
      {
        id: "gold",
        name: "Gold",
        price: "€5 000",
        desc: "Заметное присутствие на одном событии.",
        perks: [
          "Брендинг трассы и площадки",
          "Логотип на футболках",
          "10 регистраций",
          "Публикации в соцсетях",
        ],
      },
      {
        id: "silver",
        name: "Silver",
        price: "€2 000",
        desc: "Видимое место на одном событии.",
        perks: [
          "Логотип на материалах",
          "Брендированная станция на трассе",
          "5 регистраций",
        ],
      },
      {
        id: "local",
        name: "Местный бизнес",
        price: "€250–500",
        desc: "Намеренно доступно, чтобы присоединились и пекарня, и стоматолог.",
        perks: [
          "Название на странице партнёров и странице события",
          "Упоминание в день события",
          "Сорок таких — это €15 000 и сорок компаний, которые рассказывают о нас своим клиентам",
        ],
      },
      {
        id: "inkind",
        name: "Натурой",
        price: "по оценке",
        desc: "Товары и услуги вместо денег: вода, фрукты, печать, медицинское обеспечение, звук, хронометраж, площадка, фотография, костюмы.",
        perks: [
          "Оцениваем и учитываем точно так же, как деньги",
          "Указываем на уровне, которому соответствует стоимость",
          "Называем в отчёте",
        ],
      },
    ],
    deliverHeading: "Никому не нужен ещё один логотип на баннере",
    deliverLead:
      "Спонсору на самом деле нужна история, которую может рассказать его руководство, фотографии со своими людьми, что-то для сотрудников и доказательство того, что произошло. Все четыре пункта мы встраиваем в каждый пакет — и выполняем без напоминаний.",
    deliver: [
      { title: "Отчёт, который принадлежит им", desc: "Фотографии с их командой, число участников, освещение в СМИ, собранные средства и точно, куда ушли деньги. Отправляется в течение 30 дней, без запроса." },
      { title: "Их сотрудники на командной странице", desc: "Каждый пакет включает место для команды сотрудников. Восемнадцать их людей, собирающих средства, лучше одного баннера." },
      { title: "Приглашение на передачу", desc: "Они встречаются с людьми, до которых дошли их деньги. Ничто из написанного нами не стоит больше." },
      { title: "Продление становится автоматическим", desc: "Выполните эти четыре пункта без напоминаний, и следующий разговор станет формальностью." },
    ],
    sponsorsHeading: "Спонсоры",
    sponsorsLead: "Организации, стоящие за событиями и челленджами, — деньгами, товарами или предложением для бегунов.",
    sponsorsEmpty: "Спонсоры этого года появятся здесь, как только мы подпишем договор.",
    yearLabel: "Год",
    currentLabel: "Текущий",
    inKindLabel: "натурой",
    pledgeTitle: "Обещать спонсорство",
    pledgeLead: "Оставьте данные компании, и мы ответим в течение двух рабочих дней, чтобы согласовать детали. Это не обязательство — договорённость подтверждается договором.",
    tierLabel: "Уровень",
    businessLabel: "Название компании",
    repEmailLabel: "E-mail представителя",
    phoneLabel: "Телефон",
    noteLabel: "Короткое сообщение",
    noteHint: "Необязательно — событие, которое вас интересует, вопрос, что угодно.",
    pledgeButton: "Обещать спонсорство",
    pledgeSending: "Отправляем…",
    pledgeDone: "Спасибо — обещание получено.",
    pledgeDoneSub: "Мы ответим в течение двух рабочих дней с календарём, примером отчёта и проектом договора.",
  },
};
