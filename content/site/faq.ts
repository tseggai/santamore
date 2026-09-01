// /cesta-pitanja — written from the team guide's published facts (two funds,
// public ledger, cash rules, 3.5% allowance) and the platform's actual
// behaviour. Refund answer points at the drafted donations policy.
// ru drafted, flagged for native review like messages/ru.json.

import type { Locale } from "@/i18n/routing";

export interface FaqItem {
  q: string;
  a: string;
  /** Optional internal link appended after the answer. */
  link?: { href: string; label: string };
}

export interface FaqContent {
  heroEyebrow: string;
  heroTitle: string;
  heroLead: string;
  items: FaqItem[];
}

export const faqContent: Record<Locale, FaqContent> = {
  me: {
    heroEyebrow: "Česta pitanja",
    heroTitle: "Pitajte. Odgovaramo javno.",
    heroLead:
      "Ako odgovora nema ovdje, pišite nam — najbolja pitanja završe na ovoj stranici.",
    items: [
      {
        q: "Koliko od moje donacije stvarno stigne do korisnika?",
        a: "100%. Svaka donacija ide u Fond za pomoć i isplaćuje se korisnicima bez ikakvih odbitaka. Naše troškove — plate, osiguranje, opremu — plaćaju sponzori i kotizacije, kroz odvojeni Operativni fond. Dva fonda se nikad ne miješaju.",
        link: { href: "/kako-radimo", label: "Kako radimo" },
      },
      {
        q: "Kako znam gdje je novac otišao?",
        a: "Svaka uplata i svaka isplata objavljuje se u javnom registru, sa datumom, iznosom i dokumentacijom — bez prijave, bez PDF-a. Registar je samo za dopisivanje: ništa se ne mijenja nakon objave, ispravke su novi vidljivi redovi.",
        link: { href: "/transparentnost", label: "Otvori registar" },
      },
      {
        q: "Ko odlučuje ko dobija pomoć?",
        a: "Nezavisni odbor za dodjelu — tri do pet ljudi, većina nezaposlena kod nas — po objavljenim kriterijumima. Sukobi interesa se prijavljuju i izuzimaju. Ni osnivač ni direktor ne odlučuju o primaocima.",
        link: { href: "/o-nama", label: "O strukturi" },
      },
      {
        q: "Mogu li dobiti povraćaj donacije?",
        a: "Donacije su dobrovoljne i po pravilu bespovratne, ali grešku (dupla uplata, pogrešan iznos) ispravljamo — javite se u roku od 14 dana. Svaki povraćaj vidljiv je u registru kao ispravka.",
        link: { href: "/pravila-donacija", label: "Pravila donacija" },
      },
      {
        q: "Kako da pokrenem svoju stranicu za prikupljanje?",
        a: "Prijavite se, napravite stranicu, postavite cilj i podijelite link. Donacije preko vaše stranice knjiže se na vaš rezultat i na rang-listi ste od prvog eura.",
        link: { href: "/dashboard", label: "Napravi stranicu" },
      },
      {
        q: "Skupio sam gotovinu na događaju ili u kancelariji — šta sad?",
        a: "Gotovina se knjiži u platformu, na vašu stranicu, da rang-lista ne laže. Broje je dvije osobe i uplaćuje se na račun istog dana. Uputstvo dobijate u svom panelu.",
      },
      {
        q: "Da li mogu donirati bankovnim transferom?",
        a: "Da — to nam je i najdraži kanal. Svaka stranica dobija jedinstveni poziv na broj i QR kod koji u EU aplikacijama za banke unaprijed popuni uplatnicu. Kad uplata stigne na izvod, automatski se knjiži na pravu stranicu.",
        link: { href: "/podrzi", label: "Doniraj" },
      },
      {
        q: "Da li je moja donacija poreski priznata?",
        a: "Crnogorske kompanije i pojedinci mogu odbiti do 3,5% bruto prihoda za humanitarna, sportska, zdravstvena, kulturna i ekološka davanja. Izdajemo dokumentaciju koju će vaš računovođa prihvatiti.",
        link: { href: "/partneri", label: "Za kompanije" },
      },
      {
        q: "Mogu li ostati anoniman/na?",
        a: "Da. Pri doniranju birate ime za prikaz ili „Anonimno“. U javnom registru nikad ne objavljujemo više nego što ste izabrali.",
      },
      {
        q: "Kome ide kotizacija za trku?",
        a: "Kotizacije idu u Operativni fond — pokrivaju organizaciju događaja — i objavljuju se u registru kao i sve ostalo. Donacije prikupljene kroz događaj idu u Fond za pomoć, netaknute.",
      },
      {
        q: "Kako tražim pomoć za sebe ili nekog drugog?",
        a: "Podnesite prijavu — za porodicu, djecu, mali biznis ili organizaciju. Odbor za dodjelu razmatra prijave po objavljenim kriterijumima. Javno objavljujemo samo anonimizovani sažetak.",
        link: { href: "/prijava-za-pomoc", label: "Prijava za pomoć" },
      },
      {
        q: "Kako da volontiram?",
        a: "Recite nam ko ste i šta volite da radite — na događajima uvijek ima mjesta, a između njih još više.",
        link: { href: "/volontiraj", label: "Volontiraj" },
      },
    ],
  },
  en: {
    heroEyebrow: "FAQ",
    heroTitle: "Ask. We answer in public.",
    heroLead:
      "If the answer isn't here, write to us — the best questions end up on this page.",
    items: [
      {
        q: "How much of my donation actually reaches beneficiaries?",
        a: "100%. Every donation goes to the Impact Fund and is disbursed to beneficiaries with nothing deducted. Our costs — salaries, insurance, equipment — are paid by sponsors and entry fees, through the separate Operations Fund. The two funds are never mixed.",
        link: { href: "/kako-radimo", label: "How we work" },
      },
      {
        q: "How do I know where the money went?",
        a: "Every euro in and every euro out is published in a public ledger, with date, amount and documentation — no login, no PDF. The ledger is append-only: nothing is edited after publishing; corrections are new, visible rows.",
        link: { href: "/transparentnost", label: "Open the ledger" },
      },
      {
        q: "Who decides who receives support?",
        a: "An independent Grants Committee — three to five people, majority not employed by us — deciding against published criteria. Conflicts are declared and recused. Neither the founder nor the director decides on recipients.",
        link: { href: "/o-nama", label: "About the structure" },
      },
      {
        q: "Can I get a refund on a donation?",
        a: "Donations are voluntary and generally non-refundable, but we correct mistakes (duplicate payment, wrong amount) — contact us within 14 days. Every refund is visible in the ledger as a correction.",
        link: { href: "/pravila-donacija", label: "Donation policy" },
      },
      {
        q: "How do I start my own fundraising page?",
        a: "Sign in, create a page, set a goal and share the link. Donations through your page count towards your total and you're on the leaderboard from the first euro.",
        link: { href: "/dashboard", label: "Create a page" },
      },
      {
        q: "I collected cash at an event or the office — now what?",
        a: "Cash gets logged in the platform against your page, so the leaderboard never lies. It is counted by two people and deposited the same day. Instructions are in your dashboard.",
      },
      {
        q: "Can I donate by bank transfer?",
        a: "Yes — it's our favourite rail. Every page gets a unique payment reference and a QR code that pre-fills the transfer in EU banking apps. When the payment lands on our statement, it is credited to the right page automatically.",
        link: { href: "/podrzi", label: "Donate" },
      },
      {
        q: "Is my donation tax-deductible?",
        a: "Montenegrin companies and individuals may deduct up to 3.5% of gross income for humanitarian, sport, health, cultural and environmental giving. We issue paperwork your accountant will accept.",
        link: { href: "/partneri", label: "For companies" },
      },
      {
        q: "Can I stay anonymous?",
        a: "Yes. When donating you choose a display name or “Anonymous”. The public ledger never shows more than you chose.",
      },
      {
        q: "Where does my race entry fee go?",
        a: "Entry fees go to the Operations Fund — they cover putting the event on — and are published in the ledger like everything else. Donations raised through the event go to the Impact Fund, untouched.",
      },
      {
        q: "How do I apply for support, for myself or someone else?",
        a: "Submit an application — for a family, children, a small business or an organisation. The Grants Committee reviews applications against published criteria. Publicly we only ever publish an anonymised summary.",
        link: { href: "/prijava-za-pomoc", label: "Apply for support" },
      },
      {
        q: "How do I volunteer?",
        a: "Tell us who you are and what you like doing — there is always room on event days, and even more between them.",
        link: { href: "/volontiraj", label: "Volunteer" },
      },
    ],
  },
  ru: {
    heroEyebrow: "Вопросы и ответы",
    heroTitle: "Спрашивайте. Мы отвечаем публично.",
    heroLead:
      "Если ответа здесь нет — напишите нам: лучшие вопросы попадают на эту страницу.",
    items: [
      {
        q: "Сколько из моего пожертвования действительно доходит до получателей?",
        a: "100%. Каждое пожертвование идёт в Фонд помощи и выплачивается получателям без вычетов. Наши расходы — зарплаты, страховка, оборудование — оплачивают спонсоры и стартовые взносы через отдельный Операционный фонд. Два фонда никогда не смешиваются.",
        link: { href: "/kako-radimo", label: "Как мы работаем" },
      },
      {
        q: "Как узнать, куда ушли деньги?",
        a: "Каждый евро внутрь и наружу публикуется в открытом реестре — с датой, суммой и документами. Без входа, без PDF. Реестр только дописывается: после публикации ничего не редактируется, исправления — новые видимые строки.",
        link: { href: "/transparentnost", label: "Открыть реестр" },
      },
      {
        q: "Кто решает, кто получит помощь?",
        a: "Независимый комитет по грантам — три–пять человек, большинство не работает у нас — по опубликованным критериям. Конфликты интересов декларируются, участники отводятся. Ни основатель, ни директор не решают, кто получит средства.",
        link: { href: "/o-nama", label: "О структуре" },
      },
      {
        q: "Можно ли вернуть пожертвование?",
        a: "Пожертвования добровольны и, как правило, не возвращаются, но ошибки (двойной платёж, неверная сумма) мы исправляем — напишите в течение 14 дней. Каждый возврат виден в реестре как исправление.",
        link: { href: "/pravila-donacija", label: "Правила пожертвований" },
      },
      {
        q: "Как открыть свою страницу сбора?",
        a: "Войдите, создайте страницу, поставьте цель и поделитесь ссылкой. Пожертвования через вашу страницу засчитываются в ваш результат, и вы на лидерборде с первого евро.",
        link: { href: "/dashboard", label: "Создать страницу" },
      },
      {
        q: "Я собрал(а) наличные на событии или в офисе — что дальше?",
        a: "Наличные вносятся в платформу на вашу страницу, чтобы лидерборд не врал. Их считают два человека, и в тот же день они вносятся на счёт. Инструкция — в вашем кабинете.",
      },
      {
        q: "Можно ли пожертвовать банковским переводом?",
        a: "Да — это наш любимый канал. Каждая страница получает уникальное назначение платежа и QR-код, который в банковских приложениях ЕС заполняет перевод автоматически. Когда платёж появляется в выписке, он автоматически зачисляется нужной странице.",
        link: { href: "/podrzi", label: "Пожертвовать" },
      },
      {
        q: "Учитывается ли пожертвование для налогов?",
        a: "Черногорские компании и частные лица могут вычесть до 3,5% валового дохода на гуманитарные, спортивные, медицинские, культурные и экологические цели. Мы выдаём документы, которые примет ваш бухгалтер.",
        link: { href: "/partneri", label: "Для компаний" },
      },
      {
        q: "Можно ли остаться анонимным?",
        a: "Да. При пожертвовании вы выбираете имя для показа или «Аноним». В публичном реестре никогда не появится больше, чем вы выбрали.",
      },
      {
        q: "Куда идёт стартовый взнос за забег?",
        a: "Взносы идут в Операционный фонд — они покрывают организацию события — и публикуются в реестре, как и всё остальное. Пожертвования, собранные через событие, идут в Фонд помощи нетронутыми.",
      },
      {
        q: "Как попросить помощь — для себя или для другого?",
        a: "Подайте заявку — для семьи, детей, малого бизнеса или организации. Комитет рассматривает заявки по опубликованным критериям. Публично мы публикуем только анонимизированное резюме.",
        link: { href: "/prijava-za-pomoc", label: "Подать заявку" },
      },
      {
        q: "Как стать волонтёром?",
        a: "Расскажите, кто вы и что любите делать — в дни событий места хватает всегда, а между ними — тем более.",
        link: { href: "/volontiraj", label: "Волонтёрство" },
      },
    ],
  },
};
