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
  desc: string;
  /** The tier we ask for first: shown before the others, marked as preferred. */
  preferred?: boolean;
}

export interface PartnersContent {
  heroEyebrow: string;
  heroTitle: string;
  heroLead: string;
  taxHeading: string;
  tax: string[];
  tiersHeading: string;
  tiersLead: string;
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
    taxHeading: "Argument koji stvarno radi: poreska olakšica",
    tax: [
      "Crnogorske kompanije i pojedinci mogu odbiti do 3,5% bruto prihoda za humanitarna, sportska, zdravstvena, kulturna i ekološka davanja. Većina to nikad ne iskoristi.",
      "Nudimo način da iskoristite olakšicu koju već imate — lokalno, vidljivo, uz papirologiju koju će vaš računovođa prihvatiti.",
    ],
    tiersHeading: "Nivoi partnerstva",
    tiersLead: "Izaberite nivo i ostavite kontakt; javljamo se u roku od dva radna dana sa kalendarom i primjerom izvještaja.",
    preferredBadge: "Najvažniji nivo",
    selectTier: "Izaberi ovaj nivo",
    tiers: [
      {
        id: "core",
        name: "Core Cost partner",
        price: "€25.000+ / god.",
        desc: "Finansira rad Santamorea cijelu godinu, na svakom događaju: platformu, tim i opremu iza svake kampanje. Imenovan na svakoj stranici: „Rad Santamorea finansira X, pa 100% donacija stiže do cilja.“ Vrijedi više od title partnerstva na svakom događaju u godini.",
        preferred: true,
      },
      {
        id: "title",
        name: "Title partner",
        price: "€10.000 / događaj",
        desc: "Ime uz događaj, logo na svakom broju i odijelu, brending na startu, vrijeme na bini, 20 prijava, tim zaposlenih uključen.",
      },
      {
        id: "gold",
        name: "Gold",
        price: "€5.000",
        desc: "Brending staze i prostora, logo na majicama, 10 prijava, objave na mrežama.",
      },
      {
        id: "silver",
        name: "Silver",
        price: "€2.000",
        desc: "Logo na materijalima, 5 prijava, brendirana stanica na stazi.",
      },
      {
        id: "local",
        name: "Lokalni biznis",
        price: "€250–500",
        desc: "Namjerno pristupačno, da se pridruže i pekara i stomatolog. Četrdeset ovakvih je €15.000 — i četrdeset firmi koje pričaju svojim mušterijama o nama.",
      },
      {
        id: "match",
        name: "Match partner",
        price: "bilo koji iznos",
        desc: "Duplira donacije u zadatom periodu. Najkonvertibilnija stvar koju nudimo — svaki donator osjeti da mu euro vrijedi dva.",
      },
      {
        id: "inkind",
        name: "In kind",
        price: "procijenjeno",
        desc: "Voda, voće, štampa, medicinsko obezbjeđenje, ozvučenje, mjerenje vremena, prostor, fotografija, odijela. Vrednujemo, knjižimo i priznajemo tačno kao gotovinu.",
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
    taxHeading: "The argument that actually works: the tax allowance",
    tax: [
      "Montenegrin companies and individuals may deduct up to 3.5% of gross income for humanitarian, sport, health, cultural and environmental giving. Most never use it.",
      "We are offering a way to use an allowance you already have — locally, visibly, with paperwork your accountant will accept.",
    ],
    tiersHeading: "Partnership tiers",
    tiersLead: "Pick a tier and leave your details; we reply within two working days with the calendar and a sample report.",
    preferredBadge: "The tier that matters most",
    selectTier: "Select this tier",
    tiers: [
      {
        id: "core",
        name: "Core Cost Partner",
        price: "€25,000+ / yr",
        desc: "Funds Santamore's operations for the whole year, at every event: the platform, the team and the equipment behind every campaign. Named on every page: “Santamore's operations are funded by X, so 100% of donations reach the cause.” It stands above a title partnership at every event of the year.",
        preferred: true,
      },
      {
        id: "title",
        name: "Title Partner",
        price: "€10,000 / event",
        desc: "Named in association, logo on every bib and suit, start-line branding, stage time, 20 entries, employee team included.",
      },
      { id: "gold", name: "Gold", price: "€5,000", desc: "Course and venue branding, logo on shirts, 10 entries, social features." },
      { id: "silver", name: "Silver", price: "€2,000", desc: "Logo on materials, 5 entries, a branded station on the course." },
      {
        id: "local",
        name: "Local Business",
        price: "€250–500",
        desc: "Deliberately affordable, so the bakery and the dentist can join. Forty of these is €15,000 — and forty businesses telling their customers about us.",
      },
      {
        id: "match",
        name: "Match Partner",
        price: "any amount",
        desc: "Doubles donations in a set window. The most convertible thing we offer — every donor feels their euro is worth two.",
      },
      {
        id: "inkind",
        name: "In kind",
        price: "valued",
        desc: "Water, fruit, printing, medical cover, sound, timing, venue, photography, suits. Valued, booked and credited exactly like cash.",
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
    taxHeading: "Аргумент, который действительно работает: налоговая льгота",
    tax: [
      "Черногорские компании и физические лица могут вычесть до 3,5% валового дохода на гуманитарные, спортивные, медицинские, культурные и экологические пожертвования. Большинство этим никогда не пользуется.",
      "Мы предлагаем способ использовать льготу, которая у вас уже есть, — локально, заметно, с документами, которые примет ваш бухгалтер.",
    ],
    tiersHeading: "Уровни партнёрства",
    tiersLead: "Выберите уровень и оставьте контакты; мы ответим в течение двух рабочих дней с календарём и примером отчёта.",
    preferredBadge: "Самый важный уровень",
    selectTier: "Выбрать этот уровень",
    tiers: [
      {
        id: "core",
        name: "Core Cost Partner",
        price: "€25 000+ / год",
        desc: "Финансирует работу Santamore весь год, на каждом событии: платформу, команду и оборудование за каждой кампанией. Назван на каждой странице: «Работу Santamore финансирует X, поэтому 100% пожертвований доходит до цели». Стоит выше титульного партнёрства на каждом событии года.",
        preferred: true,
      },
      {
        id: "title",
        name: "Title Partner",
        price: "€10 000 / событие",
        desc: "Имя рядом с событием, логотип на каждом номере и костюме, брендинг на старте, время на сцене, 20 регистраций, команда сотрудников включена.",
      },
      { id: "gold", name: "Gold", price: "€5 000", desc: "Брендинг трассы и площадки, логотип на футболках, 10 регистраций, публикации в соцсетях." },
      { id: "silver", name: "Silver", price: "€2 000", desc: "Логотип на материалах, 5 регистраций, брендированная станция на трассе." },
      {
        id: "local",
        name: "Местный бизнес",
        price: "€250–500",
        desc: "Намеренно доступно, чтобы присоединились и пекарня, и стоматолог. Сорок таких — это €15 000 и сорок компаний, которые рассказывают о нас своим клиентам.",
      },
      {
        id: "match",
        name: "Match Partner",
        price: "любая сумма",
        desc: "Удваивает пожертвования в заданный период. Самое убедительное, что мы предлагаем: каждый донор чувствует, что его евро стоит два.",
      },
      {
        id: "inkind",
        name: "Натурой",
        price: "по оценке",
        desc: "Вода, фрукты, печать, медицинское обеспечение, звук, хронометраж, площадка, фотография, костюмы. Оцениваем, учитываем и указываем точно так же, как деньги.",
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
