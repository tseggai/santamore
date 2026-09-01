// /partneri editorial content — the seven-tier sheet, the 3.5% tax argument
// and the four deliverables, verbatim-adjacent from the team guide. The
// guide's target-company list is internal and NEVER published here.
// ru drafted, flagged for native review like messages/ru.json.

import type { Locale } from "@/i18n/routing";

export interface PartnerTier {
  name: string;
  price: string;
  desc: string;
  flagship?: boolean;
}

export interface PartnersContent {
  heroEyebrow: string;
  heroTitle: string;
  heroLead: string;
  taxHeading: string;
  tax: string[];
  tiersHeading: string;
  tiers: PartnerTier[];
  deliverHeading: string;
  deliverLead: string;
  deliver: { title: string; desc: string }[];
  formHeading: string;
  formLead: string;
}

export const partnersContent: Record<Locale, PartnersContent> = {
  me: {
    heroEyebrow: "Partneri",
    heroTitle: "Vaši sponzori plaćaju naš tim, da donacije ne moraju.",
    heroLead:
      "Sponzorstva i kotizacije idu u Operativni fond — plate, osiguranje, oprema. Zato 100% svake donacije stiže do korisnika. Partner na svakoj stranici vidi tačno to, svojim imenom.",
    taxHeading: "Argument koji stvarno radi: poreska olakšica",
    tax: [
      "Crnogorske kompanije i pojedinci mogu odbiti do 3,5% bruto prihoda za humanitarna, sportska, zdravstvena, kulturna i ekološka davanja. Većina to nikad ne iskoristi.",
      "Nudimo način da iskoristite olakšicu koju već imate — lokalno, vidljivo, uz papirologiju koju će vaš računovođa prihvatiti.",
    ],
    tiersHeading: "Nivoi partnerstva",
    tiers: [
      {
        name: "Core Cost partner",
        price: "€10.000+ / god.",
        desc: "Finansira naš tim. Imenovan na svakoj stranici: „Operacije Santamore finansira X, pa 100% donacija stiže do cilja.“ Ovo je nivo koji stvara naše plate.",
        flagship: true,
      },
      {
        name: "Title partner",
        price: "€5.000 / događaj",
        desc: "Ime uz događaj, logo na svakom broju i odijelu, brending na startu, vrijeme na bini, 20 prijava, tim zaposlenih uključen.",
      },
      {
        name: "Gold",
        price: "€2.500",
        desc: "Brending staze i prostora, logo na majicama, 10 prijava, objave na mrežama.",
      },
      {
        name: "Silver",
        price: "€1.000",
        desc: "Logo na materijalima, 5 prijava, brendirana stanica na stazi.",
      },
      {
        name: "Lokalni biznis",
        price: "€250–500",
        desc: "Namjerno pristupačno, da se pridruže i pekara i stomatolog. Četrdeset ovakvih je €15.000 — i četrdeset firmi koje pričaju svojim mušterijama o nama.",
      },
      {
        name: "Match partner",
        price: "bilo koji iznos",
        desc: "Duplira donacije u zadatom periodu. Najkonvertibilnija stvar koju prodajemo — svaki donator osjeti da mu euro vrijedi dva.",
      },
      {
        name: "In kind",
        price: "procijenjeno",
        desc: "Voda, voće, štampa, medicinsko obezbjeđenje, ozvučenje, mjerenje vremena, prostor, fotografija, odijela. Vrednujemo, knjižimo i priznajemo tačno kao gotovinu.",
      },
    ],
    deliverHeading: "Nikome ne treba još jedan logo na baneru",
    deliverLead:
      "Ono što sponzor stvarno želi jeste priča koju njegovo rukovodstvo može ispričati, fotografije sa sopstvenim ljudima, nešto za zaposlene, i dokaz šta se desilo. Sve četvoro ugrađujemo u svaki paket — i isporučujemo bez požurivanja.",
    deliver: [
      {
        title: "Izvještaj koji je njihov",
        desc: "Fotografije sa njihovim timom, broj učesnika, medijska pokrivenost, prikupljena sredstva, i tačno gdje je novac otišao. Poslato u roku od 30 dana, bez traženja.",
      },
      {
        title: "Njihovi zaposleni na timskoj stranici",
        desc: "Svaki paket uključuje mjesto za tim zaposlenih. Osamnaest njihovih ljudi koji prikupljaju pobjeđuje jedan baner.",
      },
      {
        title: "Poziv na primopredaju",
        desc: "Upoznaju ljude do kojih je njihov novac stigao. Ništa što napišemo ne vrijedi više od toga.",
      },
      {
        title: "Obnova postaje automatska",
        desc: "Isporuči ovo četvoro bez požurivanja i sljedeći razgovor je formalnost.",
      },
    ],
    formHeading: "Postanite partner",
    formLead:
      "Ostavite kontakt i javljamo se u roku od dva radna dana — sa nivoima, kalendarom i primjerom izvještaja.",
  },
  en: {
    heroEyebrow: "Partners",
    heroTitle: "Our sponsors pay for our team, so donations don't have to.",
    heroLead:
      "Sponsorship and entry fees go to the Operations Fund — salaries, insurance, equipment. That is why 100% of every donation reaches beneficiaries. A partner sees exactly that, with their name on it, on every page.",
    taxHeading: "The argument that actually works: the tax allowance",
    tax: [
      "Montenegrin companies and individuals may deduct up to 3.5% of gross income for humanitarian, sport, health, cultural and environmental giving. Most never use it.",
      "We are offering a way to use an allowance you already have — locally, visibly, with paperwork your accountant will accept.",
    ],
    tiersHeading: "Partnership tiers",
    tiers: [
      {
        name: "Core Cost Partner",
        price: "€10,000+ / yr",
        desc: "Funds our team. Named on every page: “Santamore's operations are funded by X, so 100% of donations reach the cause.” This is the tier that creates our salaries.",
        flagship: true,
      },
      {
        name: "Title Partner",
        price: "€5,000 / event",
        desc: "Named in association, logo on every bib and suit, start-line branding, stage time, 20 entries, employee team included.",
      },
      {
        name: "Gold",
        price: "€2,500",
        desc: "Course and venue branding, logo on shirts, 10 entries, social features.",
      },
      {
        name: "Silver",
        price: "€1,000",
        desc: "Logo on materials, 5 entries, a branded station on the course.",
      },
      {
        name: "Local Business",
        price: "€250–500",
        desc: "Deliberately cheap so the bakery and the dentist can join. Forty of these is €15,000 and forty businesses telling their customers about us.",
      },
      {
        name: "Match Partner",
        price: "any amount",
        desc: "Matches donations in a set window. The highest-converting thing we can sell — it makes every donor feel their euro is worth two.",
      },
      {
        name: "In kind",
        price: "valued",
        desc: "Water, fruit, printing, medical cover, sound, timing, venue, photography, suits. We value it, log it and recognise it exactly like cash.",
      },
    ],
    deliverHeading: "Nobody needs another logo placement",
    deliverLead:
      "What a sponsor actually wants is a story their leadership can tell, photographs with their own people in them, something for their staff to do, and proof of what happened. So we build all four into every package — and deliver them without being chased.",
    deliver: [
      {
        title: "A report that's theirs",
        desc: "Photos featuring their team, participation numbers, media coverage, funds raised, and exactly where the money went. Sent within 30 days, unprompted.",
      },
      {
        title: "Their staff on a team page",
        desc: "Every package includes an employee team slot. Eighteen of their people fundraising beats one banner.",
      },
      {
        title: "An invitation to the handover",
        desc: "They meet the people their money reached. Nothing we write is worth more than that.",
      },
      {
        title: "Renewal becomes automatic",
        desc: "Deliver these four without being asked and next year's conversation is a formality.",
      },
    ],
    formHeading: "Become a partner",
    formLead:
      "Leave your details and we reply within two working days — with the tiers, the calendar and a sample report.",
  },
  ru: {
    heroEyebrow: "Партнёры",
    heroTitle: "Наши спонсоры оплачивают нашу команду, чтобы пожертвованиям не пришлось.",
    heroLead:
      "Спонсорство и стартовые взносы идут в Операционный фонд — зарплаты, страховка, оборудование. Именно поэтому 100% каждого пожертвования доходит до получателей. Партнёр видит ровно это, со своим именем, на каждой странице.",
    taxHeading: "Аргумент, который действительно работает: налоговый вычет",
    tax: [
      "Черногорские компании и частные лица могут вычесть до 3,5% валового дохода на гуманитарные, спортивные, медицинские, культурные и экологические цели. Большинство этим никогда не пользуется.",
      "Мы предлагаем способ использовать вычет, который у вас уже есть — на месте, заметно, с документами, которые примет ваш бухгалтер.",
    ],
    tiersHeading: "Уровни партнёрства",
    tiers: [
      {
        name: "Core Cost Partner",
        price: "€10 000+ / год",
        desc: "Финансирует нашу команду. Имя на каждой странице: «Операции Santamore финансирует X, поэтому 100% пожертвований доходит до цели». Этот уровень создаёт наши зарплаты.",
        flagship: true,
      },
      {
        name: "Title Partner",
        price: "€5 000 / событие",
        desc: "Имя рядом с событием, логотип на каждом номере и костюме, брендинг на старте, время на сцене, 20 слотов, команда сотрудников включена.",
      },
      {
        name: "Gold",
        price: "€2 500",
        desc: "Брендинг трассы и площадки, логотип на футболках, 10 слотов, публикации в соцсетях.",
      },
      {
        name: "Silver",
        price: "€1 000",
        desc: "Логотип на материалах, 5 слотов, брендированная станция на трассе.",
      },
      {
        name: "Местный бизнес",
        price: "€250–500",
        desc: "Сознательно недорого, чтобы присоединились и пекарня, и стоматолог. Сорок таких — это €15 000 и сорок компаний, рассказывающих о нас своим клиентам.",
      },
      {
        name: "Match Partner",
        price: "любая сумма",
        desc: "Удваивает пожертвования в заданном окне. Самое конверсионное, что мы можем предложить — каждый донор чувствует, что его евро стоит два.",
      },
      {
        name: "In kind",
        price: "по оценке",
        desc: "Вода, фрукты, печать, медицинское обеспечение, звук, хронометраж, площадка, фотография, костюмы. Оцениваем, учитываем и признаём ровно как деньги.",
      },
    ],
    deliverHeading: "Никому не нужен ещё один логотип на баннере",
    deliverLead:
      "Что спонсор хочет на самом деле: историю, которую может рассказать его руководство, фотографии со своими людьми, занятие для сотрудников и доказательство того, что произошло. Мы встраиваем все четыре в каждый пакет — и доставляем без напоминаний.",
    deliver: [
      {
        title: "Отчёт, который принадлежит им",
        desc: "Фото с их командой, число участников, освещение в медиа, собранные средства и точно, куда ушли деньги. Отправляется в течение 30 дней, без запроса.",
      },
      {
        title: "Их сотрудники на командной странице",
        desc: "Каждый пакет включает слот для команды сотрудников. Восемнадцать их людей со сбором побеждают один баннер.",
      },
      {
        title: "Приглашение на передачу",
        desc: "Они встречают людей, до которых дошли их деньги. Ничто из написанного нами не стоит больше.",
      },
      {
        title: "Продление становится автоматическим",
        desc: "Доставьте эти четыре без напоминания — и разговор в следующем году будет формальностью.",
      },
    ],
    formHeading: "Стать партнёром",
    formLead:
      "Оставьте контакты — ответим в течение двух рабочих дней: уровни, календарь и пример отчёта.",
  },
};
