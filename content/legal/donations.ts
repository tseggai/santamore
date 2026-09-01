import type { LegalContent } from "./types";

export const donationsContent: LegalContent = {
  me: {
    title: "Pravila donacija",
    intro:
      "Ovdje piše kako primamo donacije, šta se dešava sa pogrešnim uplatama, kako radimo refundacije i šta biva sa kotizacijama ako se događaj otkaže ili odloži. Sve uplate su u eurima (EUR).",
    sections: [
      {
        heading: "Dva fonda — kuda ide novac",
        paragraphs: [
          "Držimo dva strogo odvojena fonda. Donacije idu u Fond za pomoć i 100% se isplaćuje korisnicima — ni cent na plate ili režije. Kotizacije za događaje, sponzorstva i grantovi idu u Operativni fond, iz kojeg se plaća organizacija. Svaka uplata i isplata vidi se u javnom registru na stranici Transparentnost.",
        ],
      },
      {
        heading: "Donacije su dobrovoljne",
        paragraphs: [
          "Donacija je dobrovoljan poklon, ne kupovina robe ni usluge. Zato se donacije načelno ne vraćaju. Izuzetke za duple i pogrešne uplate opisujemo niže — njih vraćamo bez natezanja.",
        ],
      },
      {
        heading: "Načini plaćanja",
        paragraphs: ["Donirati možete:"],
        bullets: [
          "karticom preko procesora Monri (kada kartična plaćanja budu aktivna) — plaćanja štiti 3-D Secure provjera, a broj kartice nikad ne prolazi kroz naše servere;",
          "SEPA bankovnim prenosom na naš račun, sa pozivom na broj koji vašu uplatu automatski poveže sa kampanjom;",
          "gotovinom na događajima, koju prikupljač evidentira i koja ulazi u isti javni registar.",
        ],
      },
      {
        heading: "Šta piše na izvodu kartice",
        paragraphs: [
          "Kartične uplate na vašem izvodu prikazuju se kao [[PLACEHOLDER: opis transakcije (descriptor) dogovoren sa Monri]]. Ako vidite tu stavku a ne sjećate se uplate, prvo pišite nama — brže je od reklamacije banci.",
        ],
      },
      {
        heading: "Dupla ili pogrešna uplata — kako do refundacije",
        paragraphs: [
          "Ako je uplata prošla dva puta, ako ste unijeli pogrešan iznos ili je karticu neko koristio bez ovlašćenja, pišite na [[PLACEHOLDER: kontakt e-mail]] u roku od 14 dana od zaduženja. Navedite datum, iznos i e-mail koji ste koristili pri uplati.",
          "Zahtjev provjerimo u odnosu na našu evidenciju i, kad je osnovan, vraćamo novac na istu karticu ili račun sa kojeg je uplata stigla. Ne tražimo ništa više od podataka potrebnih da uplatu nađemo.",
        ],
      },
      {
        heading: "Refundacije u javnom registru",
        paragraphs: [
          "Odobrene uplate u našoj evidenciji se ne brišu i ne prepravljaju. Refundacija se zato u javnom registru vidi kao nova stavka — ispravka sa suprotnim predznakom. Tako svaki posjetilac može provjeriti i uplatu i njen povraćaj.",
        ],
      },
      {
        heading: "Kotizacije: otkazan ili odložen događaj",
        paragraphs: [
          "Kotizacija je prijava na konkretan događaj i ide u Operativni fond. Ako događaj:",
        ],
        bullets: [
          "odložimo — vaša prijava automatski važi za novi termin; ako vam novi termin ne odgovara, možete prijavu prenijeti na drugu osobu;",
          "otkažemo mi — birate: povraćaj kotizacije u punom iznosu ili da je pretvorimo u donaciju Fondu za pomoć. Pitaćemo vas e-poštom, bez skrivenih podrazumijevanih opcija.",
        ],
      },
      {
        heading: "Mjesečne donacije",
        paragraphs: [
          "Mjesečnu donaciju možete otkazati u svakom trenutku porukom na [[PLACEHOLDER: kontakt e-mail]] ili preko veze u e-mail potvrdi. Otkazivanje zaustavlja buduća zaduženja; već izvršene mjesečne donacije ne vraćamo, osim po pravilima za duple i pogrešne uplate.",
        ],
      },
      {
        heading: "Pokrivanje troškova naplate",
        paragraphs: [
          "Pri donaciji možete dobrovoljno dodati mali iznos koji pokriva troškove naplate, da vaš puni iznos stigne do korisnika. To je opcija, ne obaveza, i uvijek je jasno prikazana prije potvrde uplate.",
        ],
      },
    ],
  },
  en: {
    title: "Donation policy",
    intro:
      "This page explains how we take donations, what happens with erroneous payments, how refunds work, and what happens to entry fees if an event is cancelled or postponed. All payments are in euros (EUR).",
    sections: [
      {
        heading: "Two funds — where the money goes",
        paragraphs: [
          "We keep two strictly separate funds. Donations go to the Impact Fund and 100% is paid out to beneficiaries — not a cent to salaries or overhead. Event entry fees, sponsorships and grants go to the Operations Fund, which pays for the organisation. Every payment in and out is visible in the public ledger on the Transparency page.",
        ],
      },
      {
        heading: "Donations are voluntary",
        paragraphs: [
          "A donation is a voluntary gift, not a purchase of goods or services. Donations are therefore generally non-refundable. The exceptions for duplicate and erroneous charges are described below — those we refund without fuss.",
        ],
      },
      {
        heading: "Ways to pay",
        paragraphs: ["You can donate:"],
        bullets: [
          "by card via the processor Monri (once card payments go live) — payments are protected by the 3-D Secure check, and your card number never passes through our servers;",
          "by SEPA bank transfer to our account, with a payment reference that automatically links your payment to the campaign;",
          "in cash at events, logged by the fundraiser and entered into the same public ledger.",
        ],
      },
      {
        heading: "What appears on your card statement",
        paragraphs: [
          "Card payments appear on your statement as [[PLACEHOLDER: statement descriptor agreed with Monri]]. If you see that entry and do not remember the payment, write to us first — it is faster than a chargeback with your bank.",
        ],
      },
      {
        heading: "Duplicate or erroneous charge — how to get a refund",
        paragraphs: [
          "If a payment went through twice, if you entered the wrong amount, or if your card was used without authorisation, write to [[PLACEHOLDER: contact email]] within 14 days of the charge. Include the date, the amount, and the email you used when paying.",
          "We check the request against our records and, where it is justified, refund to the same card or account the payment came from. We ask for nothing beyond what is needed to find the payment.",
        ],
      },
      {
        heading: "Refunds in the public ledger",
        paragraphs: [
          "Approved payments in our records are never deleted or edited. A refund therefore appears in the public ledger as a new entry — a correction with the opposite sign. That way any visitor can verify both the payment and its return.",
        ],
      },
      {
        heading: "Entry fees: cancelled or postponed events",
        paragraphs: [
          "An entry fee is a registration for a specific event and goes to the Operations Fund. If the event is:",
        ],
        bullets: [
          "postponed — your registration automatically carries over to the new date; if the new date does not suit you, you can transfer your registration to another person;",
          "cancelled by us — you choose: a full refund of the entry fee, or converting it into a donation to the Impact Fund. We will ask you by email, with no hidden defaults.",
        ],
      },
      {
        heading: "Monthly donations",
        paragraphs: [
          "You can cancel a monthly donation at any time by writing to [[PLACEHOLDER: contact email]] or via the link in your email confirmation. Cancelling stops future charges; monthly donations already made are not refunded, except under the rules for duplicate and erroneous charges.",
        ],
      },
      {
        heading: "Covering the processing fee",
        paragraphs: [
          "When donating you can voluntarily add a small amount that covers the processing cost, so your full amount reaches the cause. It is an option, not an obligation, and it is always shown clearly before you confirm the payment.",
        ],
      },
    ],
  },
  ru: {
    title: "Правила пожертвований",
    intro:
      "Здесь описано, как мы принимаем пожертвования, что происходит с ошибочными платежами, как работают возвраты и что будет со взносами за участие, если событие отменено или перенесено. Все платежи — в евро (EUR).",
    sections: [
      {
        heading: "Два фонда — куда идут деньги",
        paragraphs: [
          "Мы держим два строго раздельных фонда. Пожертвования идут в Фонд помощи, и 100% выплачивается получателям — ни цента на зарплаты или расходы. Взносы за участие, спонсорство и гранты идут в Операционный фонд, из которого оплачивается организация. Каждое поступление и каждая выплата видны в открытом реестре на странице «Прозрачность».",
        ],
      },
      {
        heading: "Пожертвования добровольны",
        paragraphs: [
          "Пожертвование — это добровольный дар, а не покупка товара или услуги. Поэтому пожертвования, как правило, не возвращаются. Исключения для двойных и ошибочных платежей описаны ниже — их мы возвращаем без проволочек.",
        ],
      },
      {
        heading: "Способы оплаты",
        paragraphs: ["Пожертвовать можно:"],
        bullets: [
          "картой через процессор Monri (когда карточные платежи заработают) — платежи защищены проверкой 3-D Secure, номер карты никогда не проходит через наши серверы;",
          "банковским переводом SEPA на наш счёт с назначением платежа, которое автоматически свяжет ваш перевод с кампанией;",
          "наличными на событиях — сборщик фиксирует их, и они попадают в тот же открытый реестр.",
        ],
      },
      {
        heading: "Что видно в выписке по карте",
        paragraphs: [
          "Карточные платежи в вашей выписке отображаются как [[PLACEHOLDER: дескриптор, согласованный с Monri]]. Если вы видите такую строку и не помните платёж, сначала напишите нам — это быстрее, чем претензия в банк.",
        ],
      },
      {
        heading: "Двойной или ошибочный платёж — как вернуть деньги",
        paragraphs: [
          "Если платёж прошёл дважды, вы ввели неверную сумму или картой воспользовались без разрешения, напишите на [[PLACEHOLDER: контактный e-mail]] в течение 14 дней с момента списания. Укажите дату, сумму и e-mail, использованный при оплате.",
          "Мы сверим запрос с нашими записями и, если он обоснован, вернём деньги на ту же карту или счёт, с которого пришёл платёж. Мы не запрашиваем ничего сверх того, что нужно, чтобы найти платёж.",
        ],
      },
      {
        heading: "Возвраты в открытом реестре",
        paragraphs: [
          "Подтверждённые платежи в наших записях никогда не удаляются и не правятся. Поэтому возврат появляется в открытом реестре как новая запись — корректировка с обратным знаком. Так любой посетитель может проверить и платёж, и его возврат.",
        ],
      },
      {
        heading: "Взносы за участие: отмена или перенос события",
        paragraphs: [
          "Взнос за участие — это регистрация на конкретное событие; он идёт в Операционный фонд. Если событие:",
        ],
        bullets: [
          "перенесено — ваша регистрация автоматически действует на новую дату; если новая дата не подходит, регистрацию можно передать другому человеку;",
          "отменено нами — вы выбираете: полный возврат взноса или превращение его в пожертвование в Фонд помощи. Мы спросим вас по e-mail, без скрытых вариантов по умолчанию.",
        ],
      },
      {
        heading: "Ежемесячные пожертвования",
        paragraphs: [
          "Ежемесячное пожертвование можно отменить в любой момент, написав на [[PLACEHOLDER: контактный e-mail]] или по ссылке в письме-подтверждении. Отмена останавливает будущие списания; уже совершённые ежемесячные пожертвования не возвращаются, кроме случаев двойных и ошибочных платежей.",
        ],
      },
      {
        heading: "Покрытие комиссии",
        paragraphs: [
          "При пожертвовании вы можете добровольно добавить небольшую сумму, покрывающую комиссию за обработку, чтобы вся ваша сумма дошла до цели. Это опция, а не обязанность, и она всегда ясно показана до подтверждения платежа.",
        ],
      },
    ],
  },
};
