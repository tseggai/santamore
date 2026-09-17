// /o-nama editorial content, from docs/reference/team-guide.html and the
// Santamore 25 story page (satoc.in/story, owner-supplied 2026-09-17): the
// name, the year-one arrangement with the founding sponsor, the 100% plan
// and the two-to-three-week hand-over, and the four team members' own
// words. Board/committee member names do not exist yet — placeholder
// notes, never invented (docs/PLACEHOLDERS.md).
// ru drafted, flagged for native review like messages/ru.json.

import type { Locale } from "@/i18n/routing";

export interface AboutRole {
  name: string;
  who: string;
  desc: string;
}

export interface TeamMember {
  name: string;
  quote: string;
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
  planHeading: string;
  plan: string[];
  teamHeading: string;
  teamLead: string;
  team: TeamMember[];
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
      "Tivat je dovoljno mali da, kad je neka porodica u nevolji, tu porodicu poznaješ — ili poznaješ nekoga ko je poznaje. U decembru 2025. grupa nas odlučila je da prestane da se osjeća loše zbog toga i da nešto organizuje. Santamore 25 počeo je kao prosta ideja za prazničnu zabavu: trka i šetnja gradom u crvenim odijelima, od lokala do lokala, uz prijatelje i firme koje su nas podržale. Sve što smo prikupili podijelili smo, do posljednjeg centa, između dva mjesta koja brinu o djeci u zalivu: Dnevnog centra Tivat i Dječjeg doma „Mladost“ u Bijeloj.",
      "Uspjelo je bolje nego što smo očekivali, i naučilo nas ono što nismo znali: naša zajednica će se odazvati. Ono što je nedostajalo nije bila velikodušnost. Bila je to struktura.",
      "Zato ove godine gradimo strukturu — i pretvaramo jednu prazničnu zabavu u crnogorsku tradiciju.",
    ],
    nameHeading: "Zašto Santamore",
    name: [
      "Santamore je spoj dvije ideje: Santa, simbol prazničnog darivanja, i More — naša riječ za ono što nas okružuje. Mi smo „Santa s mora“: plimni talas crvenih odijela i dobre volje na obali Crne Gore.",
      "More nije slučajnost na koju smo nabasali — to je cijela strategija. Santa je brend sa šest nedjelja godišnje. Voda je brend sa dvanaest mjeseci. Decembar nosi sezonu: trka, crawl, mjesec darivanja — naše najglasnije nedjelje. Voda nosi ostatak godine: plivanja, regate, vaterpolo, obalna štafeta. Naš zaliv je pozornica. Tako nikad ne utihnemo — uvijek postoji sljedeća stvar na koju možeš nekoga pozvati.",
      "Sveti Nikola — originalni Santa — zaštitnik je pomoraca i djece. U zalivu koji plovi dvanaest vjekova, bolje ime nismo mogli poželjeti.",
    ],
    structureHeading: "Ko šta odlučuje",
    structureLead:
      "Registrujemo se kao nezavisno, zakonski priznato nevladino udruženje u Crnoj Gori, sa sopstvenim crnogorskim bankovnim računom — mali, stvarni, i nezavisni tamo gdje je to najvažnije. U prvoj godini, dok je registracija trajala, naš osnivački sponzor Lotta pokrio je sve operativne troškove i držao prikupljena sredstva na namjenskom računu; sve prelazi na Santamore čim registracija bude završena. Tivat je prvi korak — zamišljamo ogranke koji nose isto slavlje i istu pomoć u gradove širom Crne Gore.",
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
    planHeading: "Plan od 100%",
    plan: [
      "Svaki euro donacija ide korisnicima. Ništa se ne odbija — ni za plate, ni za opremu, ni za zabavu. Operativne troškove plaćaju sponzori, kotizacije i grantovi, iz odvojenog fonda koji objavljujemo pored prvog.",
      "Transparentnost se ne završava prikupljanjem. Sredstva predajemo u roku od dvije do tri nedjelje nakon događaja, da bi stigla tamo gdje su najpotrebnija dok su još potrebna — i svaku predaju objavljujemo u javnoj knjizi, sa dokumentacijom.",
    ],
    teamHeading: "Tim",
    teamLead: "Ljudi koji su Santamore 25 iznijeli na svojim leđima i koji ga nose dalje. Svojim riječima.",
    team: [
      { name: "Dragana", quote: "Okupljanje ljudi je moja strast. Santamore je savršen recept: prstohvat praznične zabave, velika kašika zajedništva i mnogo srca. Presrećna sam što pomažem da se ova nova tradicija ispeče od temelja!" },
      { name: "Ksenija", quote: "Tu sam zbog dobre energije i dobrog cilja! Spojiti ljubav prema ovom gradu s prazničnom zabavom koja vraća zajednici? Računajte na mene. Neka naša obala bude najveselija!" },
      { name: "Elena", quote: "Vjerujem da su najbolje zabave one poslije kojih je svijet malo svjetliji. Obući se kao vilenjak i pritom pomoći našoj zajednici? To je moja vrsta praznične magije!" },
      { name: "Stasha", quote: "More nas sve povezuje, kao i duh darivanja. Prijavila sam se da pomognem da se taj duh utka u zabavan, nezaboravan događaj. Osim toga, odlično mi stoji Deda Mrazova kapa!" },
    ],
    peopleNote:
      "[[PLACEHOLDER: fotografije tima, i imena odbora i odbora za dodjelu — objavljujemo ih uz pristanak, kad tijela budu konstituisana.]]",
  },
  en: {
    heroEyebrow: "About us",
    heroTitle: "We live here. That is the whole idea.",
    heroLead:
      "We are building a Montenegrin charitable movement that turns joyful, physical, public events into direct support for our neighbours — and shows every euro on its way there.",
    storyHeading: "How it started",
    story: [
      "Tivat is small enough that when a family is in trouble, you know them, or you know someone who does. In December 2025 a group of us decided to stop feeling bad about it and organise something instead. Santamore 25 began as a simple idea for festive fun: a run and a walk through town in red suits, bar to bar, with friends and local businesses behind us. Every cent we raised was split between two places that look after children in the bay: Dnevni Centar Tivat and the Dječji dom “Mladost” in Bijela.",
      "It worked better than we expected, and it taught us the thing we didn't know: our community will show up. What was missing wasn't generosity. It was structure.",
      "So this year we're building the structure — and turning one festive party into a Montenegrin tradition.",
    ],
    nameHeading: "Why Santamore",
    name: [
      "Santamore is a blend of two ideas: Santa, the symbol of festive giving, and More — our word for the sea that surrounds us. We are the “Santas of the Sea”: a tidal wave of red suits and good cheer on the shores of Montenegro.",
      "The sea isn't a coincidence we stumbled into — it's the whole strategy. Santa is a brand with six weeks a year. Water is a brand with twelve months. December carries the season: the run, the crawl, the giving month — our loudest weeks. Water carries the rest: swims, regattas, water polo, a coastal relay. Our bay is the venue. So we never go quiet — there is always a next thing to invite someone to.",
      "St. Nicholas — the original Santa — is the patron saint of sailors and of children. In a bay that has been sailing for twelve centuries, we could not have asked for a better name.",
    ],
    structureHeading: "Who decides what",
    structureLead:
      "We are registering as an independent, legally recognised non-governmental association in Montenegro, with its own Montenegrin bank account — small, real, and independent where it counts. In year one, while the registration ran, our founding sponsor Lotta covered every operational cost and held the funds raised in a dedicated account; everything passes to Santamore the moment the registration completes. Tivat is the first step — we picture chapters carrying the same celebration and the same support to towns across Montenegro.",
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
    planHeading: "The 100% plan",
    plan: [
      "Every euro donated goes to beneficiaries. Nothing is deducted — not for salaries, not for equipment, not for the party. Operating costs are paid by sponsors, entry fees and grants, from a separate fund we publish beside the first.",
      "Transparency doesn't end with fundraising. We hand funds over within two to three weeks of an event, so they arrive where they are needed while they are still needed — and we publish every hand-over in the public ledger, with the paperwork.",
    ],
    teamHeading: "The team",
    teamLead: "The people who carried Santamore 25 and carry it forward. In their own words.",
    team: [
      { name: "Dragana", quote: "Bringing people together is my passion. Santamore is the perfect recipe: a dash of festive fun, a generous scoop of community spirit, and a whole lot of heart. I'm thrilled to help bake this new tradition from the ground up!" },
      { name: "Ksenija", quote: "I'm here for the good vibes and the great cause! Combining my love for this town with a festive party that gives back? Count me in. Let's make this coast the merriest!" },
      { name: "Elena", quote: "I believe the best parties are the ones that leave the world a little brighter. Getting to dress up as an elf while supporting our community? That's my kind of holiday magic!" },
      { name: "Stasha", quote: "The sea connects us all, and so does the spirit of giving. I volunteered to help weave that spirit into a fun, unforgettable event. Plus, I look great in a Santa hat!" },
    ],
    peopleNote:
      "[[PLACEHOLDER: team photos, and the names of the board and grants committee — published with consent once the bodies are constituted.]]",
  },
  ru: {
    heroEyebrow: "О нас",
    heroTitle: "Мы здесь живём. В этом вся идея.",
    heroLead:
      "Мы строим черногорское благотворительное движение, которое превращает радостные, спортивные, публичные события в прямую помощь нашим соседям — и показывает каждый евро на его пути.",
    storyHeading: "Как всё началось",
    story: [
      "Тиват достаточно мал: когда семья попадает в беду, вы её знаете — или знаете того, кто знает. В декабре 2025 года группа из нас решила перестать переживать и что-то организовать. Santamore 25 начался как простая идея праздничного веселья: забег и прогулка по городу в красных костюмах, от бара к бару, с друзьями и местным бизнесом за спиной. Каждый собранный цент был разделён между двумя местами, которые заботятся о детях залива: Dnevni Centar Tivat и детским домом «Mladost» в Биеле.",
      "Получилось лучше, чем мы ожидали, и это научило нас тому, чего мы не знали: наше сообщество откликается. Не хватало не щедрости. Не хватало структуры.",
      "Поэтому в этом году мы строим структуру — и превращаем одну праздничную вечеринку в черногорскую традицию.",
    ],
    nameHeading: "Почему Santamore",
    name: [
      "Santamore — это сплав двух идей: Santa, символ праздничного дарения, и More — наше слово для моря, которое нас окружает. Мы «Санты с моря»: приливная волна красных костюмов и хорошего настроения на берегах Черногории.",
      "Море — не случайность, а вся стратегия. Santa — бренд на шесть недель в году. Вода — бренд на двенадцать месяцев. Декабрь несёт сезон: забег, crawl, месяц дарения — наши самые громкие недели. Вода несёт остальное: заплывы, регаты, водное поло, прибрежная эстафета. Наш залив — это площадка. Так мы никогда не замолкаем — всегда есть следующее событие, на которое можно кого-то позвать.",
      "Святой Николай — первый Santa — покровитель моряков и детей. В заливе, который ходит под парусом двенадцать веков, лучшего имени не найти.",
    ],
    structureHeading: "Кто что решает",
    structureLead:
      "Мы регистрируемся как независимая, юридически признанная неправительственная ассоциация в Черногории, с собственным черногорским банковским счётом — маленькая, настоящая и независимая там, где это важнее всего. В первый год, пока шла регистрация, наш учредительный спонсор Lotta покрыл все операционные расходы и держал собранные средства на выделенном счёте; всё переходит к Santamore, как только регистрация завершится. Тиват — первый шаг; мы видим отделения, которые понесут тот же праздник и ту же помощь в города по всей Черногории.",
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
    planHeading: "План 100%",
    plan: [
      "Каждый пожертвованный евро идёт получателям. Ничего не вычитается — ни на зарплаты, ни на оборудование, ни на праздник. Операционные расходы оплачивают спонсоры, взносы и гранты — из отдельного фонда, который мы публикуем рядом с первым.",
      "Прозрачность не заканчивается сбором. Мы передаём средства в течение двух–трёх недель после события, чтобы они пришли туда, где нужны, пока ещё нужны — и публикуем каждую передачу в открытой книге, с документами.",
    ],
    teamHeading: "Команда",
    teamLead: "Люди, которые вынесли Santamore 25 и несут его дальше. Их словами.",
    team: [
      { name: "Dragana", quote: "Объединять людей — моя страсть. Santamore — идеальный рецепт: щепотка праздничного веселья, щедрая ложка духа сообщества и много сердца. Я счастлива помогать печь эту новую традицию с нуля!" },
      { name: "Ksenija", quote: "Я здесь ради хорошей энергии и большого дела! Соединить любовь к этому городу с праздником, который отдаёт обратно? Рассчитывайте на меня. Пусть наше побережье будет самым весёлым!" },
      { name: "Elena", quote: "Я верю, что лучшие праздники — те, после которых мир становится чуть светлее. Нарядиться эльфом и при этом поддержать наше сообщество? Это моя праздничная магия!" },
      { name: "Stasha", quote: "Море связывает нас всех, как и дух дарения. Я вызвалась помочь вплести этот дух в весёлое, незабываемое событие. К тому же мне очень идёт шапка Санты!" },
    ],
    peopleNote:
      "[[PLACEHOLDER: фотографии команды, имена правления и комитета по грантам — публикуем с согласия, когда органы будут сформированы.]]",
  },
};
