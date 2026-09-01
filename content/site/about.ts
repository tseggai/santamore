// /o-nama editorial content, from docs/reference/team-guide.html (verbatim
// where the wording was already public-facing). Board/committee member names
// do not exist yet — placeholder notes, never invented (docs/PLACEHOLDERS.md).
// ru drafted, flagged for native review like messages/ru.json.

import type { Locale } from "@/i18n/routing";

export interface AboutRole {
  name: string;
  who: string;
  desc: string;
}

export interface AboutContent {
  heroEyebrow: string;
  heroTitle: string;
  heroLead: string;
  storyHeading: string;
  story: string[];
  nameHeading: string;
  name: string[];
  structureHeading: string;
  structureLead: string;
  roles: AboutRole[];
  committeeHeading: string;
  committee: string[];
  peopleNote: string;
}

export const aboutContent: Record<Locale, AboutContent> = {
  me: {
    heroEyebrow: "O nama",
    heroTitle: "Živimo ovdje. To je cijela ideja.",
    heroLead:
      "Gradimo crnogorski dobrotvorni pokret koji radosne, fizičke, javne događaje pretvara u direktnu pomoć našim komšijama — i pokazuje svaki euro na tom putu.",
    storyHeading: "Kako je počelo",
    story: [
      "Tivat je dovoljno mali da, kad je neka porodica u nevolji, tu porodicu poznaješ — ili poznaješ nekoga ko je poznaje. Prošlog decembra grupa nas odlučila je da prestane da se osjeća loše zbog toga i da nešto organizuje. Otrčali smo maraton i napravili pub crawl, zamolili prijatelje i lokalne firme za pomoć, i podijelili svaki cent koji smo prikupili.",
      "Uspjelo je bolje nego što smo očekivali, i naučilo nas ono što nismo znali: naša zajednica će se odazvati. Ono što je nedostajalo nije bila velikodušnost. Bila je to struktura.",
      "Zato ove godine gradimo strukturu.",
    ],
    nameHeading: "Zašto Santamore",
    name: [
      "More je voda na našem jeziku, i to nije slučajnost na koju smo nabasali — to je cijela strategija. Santa je brend sa šest nedjelja godišnje. Voda je brend sa dvanaest mjeseci.",
      "Decembar nosi sezonu: trka, crawl, mjesec darivanja — naše najglasnije nedjelje. Voda nosi ostatak godine: plivanja, regate, vaterpolo, obalna štafeta. Naš zaliv je pozornica. Tako nikad ne utihnemo — uvijek postoji sljedeća stvar na koju možeš nekoga pozvati.",
      "Sveti Nikola — originalni Santa — zaštitnik je pomoraca i djece. U zalivu koji plovi dvanaest vjekova, bolje ime nismo mogli poželjeti.",
    ],
    structureHeading: "Ko šta odlučuje",
    structureLead:
      "Registrujemo se kao nevladino udruženje — mali, stvarni, i nezavisni tamo gdje je to najvažnije.",
    roles: [
      {
        name: "Skupština",
        who: "Svi mi",
        desc: "Volonteri, trkači, vođe ogranaka. Sastaje se godišnje. Bira odbor.",
      },
      {
        name: "Odbor · 5–7",
        who: "Strategija, budžet, zapošljavanje",
        desc: "Računovođa, pravnik, privrednik, glas zajednice, profesionalac za događaje. Nezavisna većina.",
      },
      {
        name: "Direktor",
        who: "Vodi organizaciju",
        desc: "Događaji, ogranci, partnerstva. Ne odlučuje ko dobija sredstva.",
      },
      {
        name: "Ogranci",
        who: "Lokalni timovi",
        desc: "Vođa, blagajnik, koordinator volontera. Jedna povelja, jedan standard.",
      },
    ],
    committeeHeading: "Odbor za dodjelu je namjerno van naše kontrole",
    committee: [
      "Tri do pet ljudi, većina nezaposlena kod Santamore, odlučuje ko dobija novac po objavljenim kriterijumima. Sukobi interesa se prijavljuju i izuzimaju. Trećina mjesta rotira svake godine. Ne osnivač. Ne direktor.",
      "Kad neko pita „kako znam da ovo ne ide tvojim prijateljima?“, ovo je odgovor — i mora biti strukturni, ne obećanje.",
    ],
    peopleNote:
      "[[PLACEHOLDER: imena i fotografije odbora, odbora za dodjelu i tima — objavljujemo ih uz pristanak, kad tijela budu konstituisana.]]",
  },
  en: {
    heroEyebrow: "About us",
    heroTitle: "We live here. That is the whole idea.",
    heroLead:
      "We are building a Montenegrin charitable movement that turns joyful, physical, public events into direct support for our neighbours — and shows every euro on its way there.",
    storyHeading: "How it started",
    story: [
      "Tivat is small enough that when a family is in trouble, you know them, or you know someone who does. Last December a group of us decided to stop feeling bad about it and organise something instead. We ran a marathon and a pub crawl, we asked our friends and our local businesses for help, and we gave away every single cent we raised.",
      "It worked better than we expected, and it taught us the thing we didn't know: our community will show up. What was missing wasn't generosity. It was structure.",
      "So this year we're building the structure.",
    ],
    nameHeading: "Why Santamore",
    name: [
      "More is water in our language, and that isn't a coincidence we stumbled into — it's the whole strategy. Santa is a brand with six weeks a year. Water is a brand with twelve months.",
      "December carries the season: the run, the crawl, the giving month — our loudest weeks. Water carries the rest: swims, regattas, water polo, a coastal relay. Our bay is the venue. So we never go quiet — there is always a next thing to invite someone to.",
      "St. Nicholas — the original Santa — is the patron saint of sailors and of children. In a bay that has been sailing for twelve centuries, we could not have asked for a better name.",
    ],
    structureHeading: "Who decides what",
    structureLead:
      "We are registering as a non-governmental association — small, real, and independent where it counts.",
    roles: [
      {
        name: "Assembly",
        who: "All of us",
        desc: "Volunteers, runners, chapter leads. Meets annually. Elects the board.",
      },
      {
        name: "Board · 5–7",
        who: "Strategy, budget, hiring",
        desc: "An accountant, a lawyer, a business figure, a community voice, an event professional. Independent majority.",
      },
      {
        name: "Director",
        who: "Runs the thing",
        desc: "Events, chapters, partnerships. Cannot decide who receives funds.",
      },
      {
        name: "Chapters",
        who: "Local teams",
        desc: "Lead, treasurer, volunteer coordinator. One charter, one standard.",
      },
    ],
    committeeHeading: "The Grants Committee is deliberately outside our control",
    committee: [
      "Three to five people, majority not employed by Santamore, deciding who gets money against published criteria. Conflicts declared and recused. A third of the seats rotate every year. Not the founder. Not the director.",
      "When someone asks “how do I know this doesn't go to your friends?”, this is the answer — and it has to be structural, not a promise.",
    ],
    peopleNote:
      "[[PLACEHOLDER: names and photos of the board, grants committee and team — published with consent once the bodies are constituted.]]",
  },
  ru: {
    heroEyebrow: "О нас",
    heroTitle: "Мы здесь живём. В этом вся идея.",
    heroLead:
      "Мы строим черногорское благотворительное движение, которое превращает радостные, спортивные, публичные события в прямую помощь нашим соседям — и показывает каждый евро на его пути.",
    storyHeading: "Как всё началось",
    story: [
      "Тиват достаточно мал: когда семья попадает в беду, вы её знаете — или знаете того, кто знает. В прошлом декабре группа из нас решила перестать переживать и что-то организовать. Мы пробежали марафон и устроили pub crawl, попросили друзей и местный бизнес о помощи — и отдали каждый собранный цент.",
      "Получилось лучше, чем мы ожидали, и это научило нас тому, чего мы не знали: наше сообщество откликается. Не хватало не щедрости. Не хватало структуры.",
      "Поэтому в этом году мы строим структуру.",
    ],
    nameHeading: "Почему Santamore",
    name: [
      "More — это «море» на нашем языке, и это не случайность, а вся стратегия. Santa — бренд на шесть недель в году. Вода — бренд на двенадцать месяцев.",
      "Декабрь несёт сезон: забег, crawl, месяц дарения — наши самые громкие недели. Вода несёт остальное: заплывы, регаты, водное поло, прибрежная эстафета. Наш залив — это площадка. Так мы никогда не замолкаем — всегда есть следующее событие, на которое можно кого-то позвать.",
      "Святой Николай — первый Santa — покровитель моряков и детей. В заливе, который ходит под парусом двенадцать веков, лучшего имени не найти.",
    ],
    structureHeading: "Кто что решает",
    structureLead:
      "Мы регистрируемся как неправительственная ассоциация — маленькая, настоящая и независимая там, где это важнее всего.",
    roles: [
      {
        name: "Собрание",
        who: "Все мы",
        desc: "Волонтёры, бегуны, лидеры отделений. Собирается ежегодно. Избирает правление.",
      },
      {
        name: "Правление · 5–7",
        who: "Стратегия, бюджет, найм",
        desc: "Бухгалтер, юрист, предприниматель, голос сообщества, профессионал событий. Независимое большинство.",
      },
      {
        name: "Директор",
        who: "Ведёт организацию",
        desc: "События, отделения, партнёрства. Не решает, кто получает средства.",
      },
      {
        name: "Отделения",
        who: "Местные команды",
        desc: "Лидер, казначей, координатор волонтёров. Один устав, один стандарт.",
      },
    ],
    committeeHeading: "Комитет по грантам — сознательно вне нашего контроля",
    committee: [
      "Три–пять человек, большинство не работает в Santamore, решают, кто получает деньги, по опубликованным критериям. Конфликты интересов декларируются, участники отводятся. Треть мест ротируется каждый год. Не основатель. Не директор.",
      "Когда кто-то спрашивает: «откуда мне знать, что это не уходит вашим друзьям?» — это и есть ответ. И он должен быть структурным, а не обещанием.",
    ],
    peopleNote:
      "[[PLACEHOLDER: имена и фотографии правления, комитета и команды — публикуем с согласия, когда органы будут сформированы.]]",
  },
};
