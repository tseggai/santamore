// /partneri editorial content — the sponsorship tiers, the 3.5% tax note and
// the pledge form, from the team guide. The guide's target-company list is
// internal and NEVER published here. ru drafted, flagged for native review
// like messages/ru.json.

import type { Locale } from "@/i18n/routing";

export type TipKey = "report" | "team" | "handover";

export interface PartnerTier {
  /** Stable key, also what the pledge carries. */
  id: string;
  name: string;
  price: string;
  /** One line: what the tier is. */
  desc: string;
  /**
   * What the sponsor gets. A phrase written as [[key|words]] carries the tip
   * named by the key (see PartnersContent.tips).
   */
  perks: string[];
  /** The tier we ask for first: shown before the others, marked as preferred. */
  preferred?: boolean;
}

export interface PartnersContent {
  heroEyebrow: string;
  heroTitle: string;
  heroLead: string;
  taxNote: string;
  /** The two views of the page: the tiers, and who sponsors us. */
  tabSponsor: string;
  tabSponsors: string;
  tiersHeading: string;
  preferredBadge: string;
  selectTier: string;
  /** What a report, the entries and the hand-over mean, shown as tips in the perks. */
  tips: Record<TipKey, string>;
  tiers: PartnerTier[];
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
    heroEyebrow: "Sponzori",
    heroTitle: "Budite sponzor",
    heroLead: "Santamore je lokalni pokret sa sjedištem u Porto Montenegru koji organizuje događaje u duhu zdravog, aktivnog i veselog načina života, za humanitarne ciljeve u Crnoj Gori. Organizujemo i učestvujemo u trkama, vožnjama, izazovima, drugim sportskim takmičenjima i događajima kako bismo prikupili novac za ciljeve koje predlaže zajednica u Crnoj Gori. Sponzorstva finansiraju naš rad, pa 100% svake donacije, kotizacije i granta stiže do korisnika.",
    taxNote: "Crnogorske kompanije i pojedinci mogu odbiti do 3,5% bruto prihoda za humanitarne svrhe. Ali većina to nikad ne iskoristi.",
    tabSponsor: "Budite sponzor",
    tabSponsors: "Naši sponzori",
    tiersHeading: "Nivoi sponzorstva",
    preferredBadge: "Napravi razliku",
    selectTier: "Izaberi ovaj nivo",
    tips: {
      report: "Fotografije sa vašim timom, broj učesnika, medijska pokrivenost, prikupljena sredstva i tačno gdje je novac otišao. Poslato u roku od 30 dana, bez traženja.",
      team: "Prijave uključuju mjesto za tim zaposlenih na timskoj stranici: vaši ljudi prikupljaju pod vašim imenom.",
      handover: "Upoznajete ljude do kojih je vaš novac stigao. Ništa što napišemo ne vrijedi više od toga.",
    },
    tiers: [
      {
        id: "core",
        name: "Core Cost sponzor",
        price: "€25.000+",
        desc: "Finansira rad koji stoji iza svakog cilja.",
        perks: [
          "Imenovan na svakoj stranici događaja i na mrežama kao sponzor",
          "Premium brending na svim materijalima događaja u godini",
          "Vrijeme na bini i [[team|20 prijava]] na svakom događaju",
          "[[report|Izvještaj]] o svakoj kampanji i [[handover|poziv na svaku primopredaju]]",
        ],
        preferred: true,
      },
      {
        id: "title",
        name: "Title sponzor",
        price: "€10.000",
        desc: "Vodeće ime iza događaja cilja.",
        perks: [
          "Imenovan na svakoj stranici događaja na sajtu kao sponzor",
          "Logo na materijalima jednog velikog događaja u godini",
          "Vrijeme na bini i [[team|20 prijava]] na jednom velikom događaju u godini",
          "[[report|Izvještaj]] o svakoj kampanji u godini",
        ],
      },
      {
        id: "gold",
        name: "Gold",
        price: "€5.000",
        desc: "Vodeće ime na jednom velikom događaju.",
        perks: [
          "Imenovan na stranici jednog velikog događaja kao sponzor",
          "Logo na materijalima jednog velikog događaja u godini",
          "[[team|20 prijava]] na jednom velikom događaju u godini",
          "[[report|Izvještaj]] o svakoj kampanji u godini",
        ],
      },
      {
        id: "silver",
        name: "Silver",
        price: "€2.000",
        desc: "Vidljivo ime na jednom velikom događaju.",
        perks: [
          "Imenovan na stranici jednog događaja na sajtu kao sponzor",
          "Logo na materijalima jednog velikog događaja u godini",
          "[[team|10 prijava]] na jednom velikom događaju u godini",
          "[[report|Izvještaj]] o svakoj kampanji u godini",
        ],
      },
      {
        id: "local",
        name: "Lokalni biznis",
        price: "€250–500",
        desc: "Pristupačno, da se pridruže i mali lokalni biznisi.",
        perks: [
          "Imenovan na stranici jednog događaja na sajtu kao sponzor",
          "Logo na materijalima jednog velikog događaja u godini",
          "[[team|5 prijava]] na jednom velikom događaju u godini",
          "[[report|Izvještaj]] o jednom događaju u godini",
        ],
      },
      {
        id: "inkind",
        name: "In kind",
        price: "procijenjeno",
        desc: "Roba i usluge umjesto novca.",
        perks: [
          "Vrednujemo i knjižimo tačno kao gotovinu",
          "Priznanje na nivou kojem vrijednost odgovara",
          "Ime, logo i prijave srazmjerno novčanoj vrijednosti",
          "[[report|Izvještaj]] srazmjerno novčanoj vrijednosti",
        ],
      },
    ],
    sponsorsHeading: "Naši sponzori",
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
    heroEyebrow: "Sponsors",
    heroTitle: "Be a sponsor",
    heroLead: "Santamore is a local movement based in Porto Montenegro that organises events around a wellness-focused, active and festive lifestyle, for charitable causes in Montenegro. We organise and take part in races, rides, challenges, other fitness competitions and events to raise money for crowdsourced causes within Montenegro. Sponsorships fund our operations so that 100% of every donation, entry fee and grant reaches the beneficiaries.",
    taxNote: "Montenegrin companies and individuals may deduct up to 3.5% of gross income for a humanitarian cause. But most never use it.",
    tabSponsor: "Be a sponsor",
    tabSponsors: "Our sponsors",
    tiersHeading: "Sponsorship tiers",
    preferredBadge: "Make an impact",
    selectTier: "Select this tier",
    tips: {
      report: "Photos with your team, participant numbers, media coverage, funds raised, and exactly where the money went. Sent within 30 days, unprompted.",
      team: "Entries include a slot for an employee team on a team page: your people fundraising under your name.",
      handover: "You meet the people your money reached. Nothing we write is worth more than that.",
    },
    tiers: [
      {
        id: "core",
        name: "Core Cost Sponsor",
        price: "€25,000+",
        desc: "Funds the work behind every cause.",
        perks: [
          "Named on every event page and social media as the sponsor",
          "Premium branding on every event material of the year",
          "Stage time and [[team|20 entries]] at every event",
          "A [[report|report]] on every campaign and an [[handover|invite to every hand-over]]",
        ],
        preferred: true,
      },
      {
        id: "title",
        name: "Title Sponsor",
        price: "€10,000",
        desc: "The lead name behind the cause's events.",
        perks: [
          "Named on every event page of the site as a sponsor",
          "Logo on materials of one major event of the year",
          "Stage time and [[team|20 entries]] at one major event of the year",
          "A [[report|report]] on every campaign of the year",
        ],
      },
      {
        id: "gold",
        name: "Gold",
        price: "€5,000",
        desc: "A leading name at one major event.",
        perks: [
          "Named on one major event page as a sponsor",
          "Logo on materials of one major event of the year",
          "[[team|20 entries]] at one major event of the year",
          "A [[report|report]] on every campaign of the year",
        ],
      },
      {
        id: "silver",
        name: "Silver",
        price: "€2,000",
        desc: "A visible name at one major event.",
        perks: [
          "Named on one event page of the site as a sponsor",
          "Logo on materials of one major event of the year",
          "[[team|10 entries]] at one major event of the year",
          "A [[report|report]] on every campaign of the year",
        ],
      },
      {
        id: "local",
        name: "Local Business",
        price: "€250–500",
        desc: "Affordable, so small local businesses can join.",
        perks: [
          "Named on one event page of the site as a sponsor",
          "Logo on materials of one major event of the year",
          "[[team|5 entries]] at one major event of the year",
          "A [[report|report]] on one event of the year",
        ],
      },
      {
        id: "inkind",
        name: "In kind",
        price: "valued",
        desc: "Goods and services instead of cash.",
        perks: [
          "Valued and booked exactly like cash",
          "Credited at the tier the value matches",
          "Name, logo and entries commensurate with the cash value",
          "A [[report|report]] commensurate with the cash value",
        ],
      },
    ],
    sponsorsHeading: "Our sponsors",
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
    heroEyebrow: "Спонсоры",
    heroTitle: "Станьте спонсором",
    heroLead: "Santamore — местное движение из Порто-Монтенегро, которое организует события в духе здорового, активного и праздничного образа жизни ради благотворительных целей в Черногории. Мы организуем и участвуем в забегах, велозаездах, челленджах, других спортивных соревнованиях и событиях, чтобы собирать деньги на цели, предложенные сообществом в Черногории. Спонсорство финансирует нашу работу, чтобы 100% каждого пожертвования, взноса за участие и гранта доходило до получателей.",
    taxNote: "Черногорские компании и физические лица могут вычесть до 3,5% валового дохода на гуманитарные цели. Но большинство этим никогда не пользуется.",
    tabSponsor: "Станьте спонсором",
    tabSponsors: "Наши спонсоры",
    tiersHeading: "Уровни спонсорства",
    preferredBadge: "Внесите вклад",
    selectTier: "Выбрать этот уровень",
    tips: {
      report: "Фотографии с вашей командой, число участников, освещение в СМИ, собранные средства и точно, куда ушли деньги. Отправляется в течение 30 дней, без запроса.",
      team: "Регистрации включают место для команды сотрудников на командной странице: ваши люди собирают средства под вашим именем.",
      handover: "Вы встречаетесь с людьми, до которых дошли ваши деньги. Ничто из написанного нами не стоит больше.",
    },
    tiers: [
      {
        id: "core",
        name: "Core Cost Sponsor",
        price: "€25 000+",
        desc: "Финансирует работу, стоящую за каждой целью.",
        perks: [
          "Назван на каждой странице события и в соцсетях как спонсор",
          "Премиальный брендинг на всех материалах событий года",
          "Время на сцене и [[team|20 регистраций]] на каждом событии",
          "[[report|Отчёт]] о каждой кампании и [[handover|приглашение на каждую передачу]]",
        ],
        preferred: true,
      },
      {
        id: "title",
        name: "Title Sponsor",
        price: "€10 000",
        desc: "Главное имя за событиями цели.",
        perks: [
          "Назван на каждой странице события на сайте как спонсор",
          "Логотип на материалах одного крупного события года",
          "Время на сцене и [[team|20 регистраций]] на одном крупном событии года",
          "[[report|Отчёт]] о каждой кампании года",
        ],
      },
      {
        id: "gold",
        name: "Gold",
        price: "€5 000",
        desc: "Ведущее имя на одном крупном событии.",
        perks: [
          "Назван на странице одного крупного события как спонсор",
          "Логотип на материалах одного крупного события года",
          "[[team|20 регистраций]] на одном крупном событии года",
          "[[report|Отчёт]] о каждой кампании года",
        ],
      },
      {
        id: "silver",
        name: "Silver",
        price: "€2 000",
        desc: "Заметное имя на одном крупном событии.",
        perks: [
          "Назван на странице одного события на сайте как спонсор",
          "Логотип на материалах одного крупного события года",
          "[[team|10 регистраций]] на одном крупном событии года",
          "[[report|Отчёт]] о каждой кампании года",
        ],
      },
      {
        id: "local",
        name: "Местный бизнес",
        price: "€250–500",
        desc: "Доступно, чтобы присоединился и малый местный бизнес.",
        perks: [
          "Назван на странице одного события на сайте как спонсор",
          "Логотип на материалах одного крупного события года",
          "[[team|5 регистраций]] на одном крупном событии года",
          "[[report|Отчёт]] об одном событии года",
        ],
      },
      {
        id: "inkind",
        name: "Натурой",
        price: "по оценке",
        desc: "Товары и услуги вместо денег.",
        perks: [
          "Оцениваем и учитываем точно так же, как деньги",
          "Указываем на уровне, которому соответствует стоимость",
          "Имя, логотип и регистрации соразмерно денежной стоимости",
          "[[report|Отчёт]] соразмерно денежной стоимости",
        ],
      },
    ],
    sponsorsHeading: "Наши спонсоры",
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
