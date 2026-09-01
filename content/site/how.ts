// /kako-radimo editorial content — the two funds, the 70/20/10 split, and why
// the ledger is public. Verbatim-adjacent from docs/reference/team-guide.html.
// ru drafted, flagged for native review like messages/ru.json.

import type { Locale } from "@/i18n/routing";

export interface HowContent {
  heroEyebrow: string;
  heroTitle: string;
  heroLead: string;
  fundsHeading: string;
  funds: { name: string; inFlows: string; outFlows: string; rule: string }[];
  fundsNote: string;
  splitHeading: string;
  splitLead: string;
  split: { pct: string; label: string }[];
  splitReasons: { title: string; desc: string }[];
  ledgerHeading: string;
  ledgerLead: string;
  ledgerPoints: { title: string; desc: string }[];
  ledgerCta: string;
  decideHeading: string;
  decide: string[];
  decideCta: string;
}

export const howContent: Record<Locale, HowContent> = {
  me: {
    heroEyebrow: "Kako radimo",
    heroTitle: "Dva fonda. Jedna formula. Javni registar.",
    heroLead:
      "U zemlji naše veličine, reputacija je jedina imovina koja se računa — i jedina koju ne možemo kupiti nazad. Zato uklanjamo raspravu u potpunosti.",
    fundsHeading: "Dva fonda koja se nikad ne miješaju",
    funds: [
      {
        name: "Fond za pomoć",
        inFlows: "Donacije — svaka, sa svakog kanala.",
        outFlows: "Isplate korisnicima, po odluci nezavisnog odbora.",
        rule: "100% korisnicima. Ništa se ne odbija — ni provizije, ni troškovi.",
      },
      {
        name: "Operativni fond",
        inFlows: "Sponzorstva, kotizacije i grantovi.",
        outFlows: "Plate, osiguranje, oprema, troškovi događaja.",
        rule: "Naši sponzori plaćaju naš tim, da donacije ne moraju.",
      },
    ],
    fundsNote:
      "Objavljujemo oba fonda jedan pored drugog, u istom registru, u realnom vremenu.",
    splitHeading: "Euro prikupljen u jednom gradu",
    splitLead:
      "Ogranci su interni timovi, ne posebna pravna lica. Jedan bankovni račun, jedne knjige, jedna revizija — a formula podjele je javna:",
    split: [
      { pct: "70%", label: "korisnicima u tom istom gradu" },
      { pct: "20%", label: "nacionalne operacije" },
      { pct: "10%", label: "Fond solidarnosti" },
    ],
    splitReasons: [
      {
        title: "Zašto 70% lokalno",
        desc: "Odgovara na jedino pitanje koje lokalni sponzor stvarno postavlja: ostaje li moj novac ovdje? I daje svakom novom gradu razlog da pokrene svoj ogranak.",
      },
      {
        title: "Zašto Fond solidarnosti",
        desc: "Sjever ima najveću potrebu i najmanje startne linije. Bez ovoga bismo služili samo gradove koji mogu napuniti trku — upravo pogrešan ishod.",
      },
      {
        title: "Zašto objavljujemo formulu",
        desc: "Jer podjela koju ljudi mogu pročitati je podjela u koju niko ne mora da nam vjeruje na riječ.",
      },
    ],
    ledgerHeading: "Objavljujemo registar. U oba smjera.",
    ledgerLead: "Generisan iz baze — ne ukucan u PDF jednom godišnje.",
    ledgerPoints: [
      {
        title: "Svaki euro koji uđe",
        desc: "Datum, iznos, ime koje je donator izabrao ili „Anonimno“, kojoj stranici pripada, koji grad.",
      },
      {
        title: "Svaki euro koji izađe",
        desc: "Datum, iznos, za šta je bio, i link ka dokazu: račun, faktura, potpisana primopredaja, odluka odbora.",
      },
      {
        title: "Samo dopisivanje",
        desc: "Ništa se ne mijenja nakon objave. Ispravke se pojavljuju kao novi, datirani, vidljivi redovi. Registar koji se može tiho prepraviti nije registar.",
      },
      {
        title: "Privatnost i dalje zaštićena",
        desc: "„Porodica iz Tivta, medicinski troškovi, €1.200“ dovoljno je za javnost. Imena i papirologija ostaju kod našeg revizora, ne na internetu.",
      },
    ],
    ledgerCta: "Otvori registar",
    decideHeading: "Ko odlučuje ko dobija pomoć",
    decide: [
      "Odbor za dodjelu: tri do pet ljudi, većina nezaposlena kod nas, odlučuje po objavljenim kriterijumima. Sukobi interesa se prijavljuju i izuzimaju. Ni osnivač ni direktor ne odlučuju o primaocima.",
      "Ovo takođe štiti nas. Gotovinu broje dvije osobe, uplata na račun istog dana, račun za sve. Ne zato što ne vjerujemo jedni drugima — nego zato što osoba koja rukuje novcem nikad ne smije biti jedina koja može da garantuje za njega.",
    ],
    decideCta: "Više o strukturi na stranici O nama",
  },
  en: {
    heroEyebrow: "How we work",
    heroTitle: "Two funds. One formula. A public ledger.",
    heroLead:
      "In a country our size, reputation is the only asset that matters and the one thing we can't buy back. So we remove the argument entirely.",
    fundsHeading: "Two funds that are never mixed",
    funds: [
      {
        name: "Impact Fund",
        inFlows: "Donations — every one, from every rail.",
        outFlows: "Disbursements to beneficiaries, decided by the independent committee.",
        rule: "100% to beneficiaries. Nothing deducted — no fees, no costs.",
      },
      {
        name: "Operations Fund",
        inFlows: "Sponsorship, entry fees and grants.",
        outFlows: "Salaries, insurance, equipment, event costs.",
        rule: "Our sponsors pay for our team, so donations don't have to.",
      },
    ],
    fundsNote:
      "We publish both funds side by side, in the same ledger, in real time.",
    splitHeading: "A euro raised in a town",
    splitLead:
      "Chapters are internal teams, not separate legal entities. One bank account, one set of books, one audit — and the split formula is public:",
    split: [
      { pct: "70%", label: "beneficiaries in that same town" },
      { pct: "20%", label: "national operations" },
      { pct: "10%", label: "Solidarity Fund" },
    ],
    splitReasons: [
      {
        title: "Why 70% local",
        desc: "It answers the only question a local sponsor really asks: does my money stay here? And it gives every new town a reason to start a chapter of its own.",
      },
      {
        title: "Why a Solidarity Fund",
        desc: "The north has the greatest need and the smallest start lines. Without this we'd only serve towns that can fill a race — exactly the wrong outcome.",
      },
      {
        title: "Why we publish the formula",
        desc: "Because a split people can read is a split nobody has to trust us about.",
      },
    ],
    ledgerHeading: "We publish the ledger. Both directions.",
    ledgerLead: "Generated from the database — not typed into a PDF once a year.",
    ledgerPoints: [
      {
        title: "Every euro in",
        desc: "Date, amount, the donor's chosen display name or “Anonymous”, which fundraiser it belongs to, which town.",
      },
      {
        title: "Every euro out",
        desc: "Date, amount, what it was for, and a link to the proof: receipt, invoice, signed handover, committee decision.",
      },
      {
        title: "Append-only",
        desc: "Nothing is editable once published. Corrections appear as new, dated, visible rows. A ledger that can be quietly rewritten isn't a ledger.",
      },
      {
        title: "Privacy still protected",
        desc: "“A family in Tivat, medical costs, €1,200” is enough for the public. Names and paperwork stay with our auditor, not the internet.",
      },
    ],
    ledgerCta: "Open the ledger",
    decideHeading: "Who decides who receives support",
    decide: [
      "The Grants Committee: three to five people, majority not employed by us, deciding against published criteria. Conflicts declared and recused. Neither the founder nor the director decides on recipients.",
      "This also protects us. Cash counted by two people, same-day deposits, receipts for everything. Not because we distrust each other — because the person who handles money should never be the only person who can vouch for it.",
    ],
    decideCta: "More on the structure on our About page",
  },
  ru: {
    heroEyebrow: "Как мы работаем",
    heroTitle: "Два фонда. Одна формула. Публичный реестр.",
    heroLead:
      "В стране нашего размера репутация — единственный актив, который имеет значение, и единственное, что нельзя выкупить обратно. Поэтому мы убираем сам предмет спора.",
    fundsHeading: "Два фонда, которые никогда не смешиваются",
    funds: [
      {
        name: "Фонд помощи",
        inFlows: "Пожертвования — каждое, с любого канала.",
        outFlows: "Выплаты получателям — по решению независимого комитета.",
        rule: "100% получателям. Без вычетов — ни комиссий, ни расходов.",
      },
      {
        name: "Операционный фонд",
        inFlows: "Спонсорство, стартовые взносы и гранты.",
        outFlows: "Зарплаты, страховка, оборудование, расходы на события.",
        rule: "Наши спонсоры оплачивают нашу команду, чтобы пожертвованиям не пришлось.",
      },
    ],
    fundsNote:
      "Мы публикуем оба фонда рядом, в одном реестре, в реальном времени.",
    splitHeading: "Евро, собранный в одном городе",
    splitLead:
      "Отделения — это внутренние команды, а не отдельные юрлица. Один банковский счёт, одни книги, один аудит — а формула распределения публична:",
    split: [
      { pct: "70%", label: "получателям в том же городе" },
      { pct: "20%", label: "национальные операции" },
      { pct: "10%", label: "Фонд солидарности" },
    ],
    splitReasons: [
      {
        title: "Почему 70% остаётся на месте",
        desc: "Это отвечает на единственный вопрос, который действительно задаёт местный спонсор: остаются ли мои деньги здесь? И даёт каждому новому городу причину открыть своё отделение.",
      },
      {
        title: "Почему Фонд солидарности",
        desc: "На севере самая большая нужда и самые маленькие стартовые линии. Без этого мы помогали бы только городам, способным собрать забег — ровно неправильный результат.",
      },
      {
        title: "Почему мы публикуем формулу",
        desc: "Потому что распределение, которое можно прочитать, — это распределение, в котором никому не нужно верить нам на слово.",
      },
    ],
    ledgerHeading: "Мы публикуем реестр. В обе стороны.",
    ledgerLead: "Он генерируется из базы данных — а не набирается в PDF раз в год.",
    ledgerPoints: [
      {
        title: "Каждый евро внутрь",
        desc: "Дата, сумма, выбранное донором имя или «Аноним», к какой странице относится, какой город.",
      },
      {
        title: "Каждый евро наружу",
        desc: "Дата, сумма, на что, и ссылка на доказательство: чек, счёт, подписанная передача, решение комитета.",
      },
      {
        title: "Только дописывание",
        desc: "После публикации ничего не редактируется. Исправления появляются как новые, датированные, видимые строки. Реестр, который можно тихо переписать, — не реестр.",
      },
      {
        title: "Приватность защищена",
        desc: "«Семья из Тивата, медицинские расходы, €1 200» — достаточно для публики. Имена и документы остаются у нашего аудитора, а не в интернете.",
      },
    ],
    ledgerCta: "Открыть реестр",
    decideHeading: "Кто решает, кто получает помощь",
    decide: [
      "Комитет по грантам: три–пять человек, большинство не работает у нас, решают по опубликованным критериям. Конфликты интересов декларируются, участники отводятся. Ни основатель, ни директор не решают, кто получит средства.",
      "Это защищает и нас. Наличные считают два человека, депозит в тот же день, чеки на всё. Не потому, что мы не доверяем друг другу — а потому, что человек, который держит деньги, никогда не должен быть единственным, кто может за них поручиться.",
    ],
    decideCta: "Подробнее о структуре — на странице «О нас»",
  },
};
