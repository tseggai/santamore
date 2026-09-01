import type { LegalContent } from "./types";

export const impressumContent: LegalContent = {
  me: {
    title: "Informacije o organizaciji",
    intro:
      "Zvanični podaci o organizaciji koja vodi ovaj sajt i prima uplate preko njega. Ista stranica služi i kao impressum koji banka prihvatilac provjerava prije uključivanja kartičnih plaćanja.",
    sections: [
      {
        heading: "Osnovni podaci",
        paragraphs: [],
        bullets: [
          "Registrovano ime: [[PLACEHOLDER: puno registrovano ime organizacije]]",
          "Pravna forma: nevladino udruženje",
          "Sjedište: [[PLACEHOLDER: registrovana adresa, Tivat]], Crna Gora",
          "Registarski broj: [[PLACEHOLDER: registarski broj]]",
          "PIB: [[PLACEHOLDER: PIB]]",
          "Upis u registar nevladinih organizacija: [[PLACEHOLDER: broj i datum upisa u registar nadležnog ministarstva]]",
        ],
      },
      {
        heading: "Ovlašćeno lice",
        paragraphs: [
          "Lice ovlašćeno za zastupanje: [[PLACEHOLDER: ime i funkcija ovlašćenog lica]].",
        ],
      },
      {
        heading: "Kontakt",
        paragraphs: [],
        bullets: [
          "E-mail: [[PLACEHOLDER: kontakt e-mail]]",
          "Telefon: [[PLACEHOLDER: kontakt telefon]]",
          "Adresa za poštu: [[PLACEHOLDER: registrovana adresa, Tivat]]",
        ],
      },
      {
        heading: "Bankovni račun",
        paragraphs: [],
        bullets: [
          "Banka: [[PLACEHOLDER: ime banke]]",
          "IBAN: [[PLACEHOLDER: IBAN]]",
          "BIC/SWIFT: [[PLACEHOLDER: BIC]]",
          "Valuta: EUR",
        ],
      },
      {
        heading: "Plaćanje karticama",
        paragraphs: [
          "Kartična plaćanja obrađuje Monri (Hrvatska), kada budu aktivna. Kartična plaćanja štiti 3-D Secure provjera, a podaci o kartici nikada ne prolaze kroz naše servere.",
          "Prihvatamo kartice: [[PLACEHOLDER: prihvaćeni brendovi kartica — na ovom mjestu prikazati i logotipe]].",
        ],
      },
      {
        heading: "Kuda ide novac",
        paragraphs: [
          "Vodimo dva odvojena fonda: donacije idu u Fond za pomoć i 100% se isplaćuje korisnicima, a kotizacije, sponzorstva i grantovi u Operativni fond, iz kojeg se plaća rad organizacije. Svaka uplata i isplata objavljena je u javnom registru na stranici Transparentnost. Uslovi plaćanja i refundacija: Pravila donacija.",
        ],
      },
    ],
  },
  en: {
    title: "Organisation details",
    intro:
      "The official details of the organisation that runs this site and receives payments through it. This page also serves as the impressum that the acquiring bank inspects before enabling card payments.",
    sections: [
      {
        heading: "Basic details",
        paragraphs: [],
        bullets: [
          "Registered name: [[PLACEHOLDER: full registered organisation name]]",
          "Legal form: non-governmental association (nevladino udruženje)",
          "Registered office: [[PLACEHOLDER: registered address, Tivat]], Montenegro",
          "Registration number: [[PLACEHOLDER: registration number]]",
          "Tax ID (PIB): [[PLACEHOLDER: PIB]]",
          "Entry in the register of non-governmental organisations: [[PLACEHOLDER: number and date of the entry in the competent ministry's register]]",
        ],
      },
      {
        heading: "Authorised representative",
        paragraphs: [
          "Person authorised to represent the organisation: [[PLACEHOLDER: name and role of the authorised representative]].",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [],
        bullets: [
          "Email: [[PLACEHOLDER: contact email]]",
          "Phone: [[PLACEHOLDER: contact phone]]",
          "Postal address: [[PLACEHOLDER: registered address, Tivat]]",
        ],
      },
      {
        heading: "Bank account",
        paragraphs: [],
        bullets: [
          "Bank: [[PLACEHOLDER: bank name]]",
          "IBAN: [[PLACEHOLDER: IBAN]]",
          "BIC/SWIFT: [[PLACEHOLDER: BIC]]",
          "Currency: EUR",
        ],
      },
      {
        heading: "Card payments",
        paragraphs: [
          "Card payments are processed by Monri (Croatia), once live. Card payments are protected by the 3-D Secure check, and card data never passes through our servers.",
          "We accept: [[PLACEHOLDER: accepted card brands — display the brand logos here]].",
        ],
      },
      {
        heading: "Where the money goes",
        paragraphs: [
          "We keep two separate funds: donations go to the Impact Fund and 100% is paid out to beneficiaries, while entry fees, sponsorships and grants go to the Operations Fund, which pays for the organisation's work. Every payment in and out is published in the public ledger on the Transparency page. Payment and refund terms: the Donation policy.",
        ],
      },
    ],
  },
  ru: {
    title: "Информация об организации",
    intro:
      "Официальные сведения об организации, которая ведёт этот сайт и принимает через него платежи. Эта же страница служит импрессумом, который банк-эквайер проверяет перед включением карточных платежей.",
    sections: [
      {
        heading: "Основные сведения",
        paragraphs: [],
        bullets: [
          "Зарегистрированное название: [[PLACEHOLDER: полное зарегистрированное название организации]]",
          "Правовая форма: неправительственное объединение (nevladino udruženje)",
          "Юридический адрес: [[PLACEHOLDER: зарегистрированный адрес, Тиват]], Черногория",
          "Регистрационный номер: [[PLACEHOLDER: регистрационный номер]]",
          "Налоговый номер (PIB): [[PLACEHOLDER: PIB]]",
          "Запись в реестре неправительственных организаций: [[PLACEHOLDER: номер и дата записи в реестре профильного министерства]]",
        ],
      },
      {
        heading: "Уполномоченный представитель",
        paragraphs: [
          "Лицо, уполномоченное представлять организацию: [[PLACEHOLDER: имя и должность уполномоченного лица]].",
        ],
      },
      {
        heading: "Контакты",
        paragraphs: [],
        bullets: [
          "E-mail: [[PLACEHOLDER: контактный e-mail]]",
          "Телефон: [[PLACEHOLDER: контактный телефон]]",
          "Почтовый адрес: [[PLACEHOLDER: зарегистрированный адрес, Тиват]]",
        ],
      },
      {
        heading: "Банковский счёт",
        paragraphs: [],
        bullets: [
          "Банк: [[PLACEHOLDER: название банка]]",
          "IBAN: [[PLACEHOLDER: IBAN]]",
          "BIC/SWIFT: [[PLACEHOLDER: BIC]]",
          "Валюта: EUR",
        ],
      },
      {
        heading: "Оплата картами",
        paragraphs: [
          "Карточные платежи обрабатывает Monri (Хорватия) — когда они заработают. Карточные платежи защищены проверкой 3-D Secure, данные карты никогда не проходят через наши серверы.",
          "Принимаем карты: [[PLACEHOLDER: принимаемые бренды карт — здесь показать и логотипы]].",
        ],
      },
      {
        heading: "Куда идут деньги",
        paragraphs: [
          "Мы ведём два раздельных фонда: пожертвования идут в Фонд помощи, и 100% выплачивается получателям, а взносы за участие, спонсорство и гранты — в Операционный фонд, из которого оплачивается работа организации. Каждое поступление и каждая выплата опубликованы в открытом реестре на странице «Прозрачность». Условия оплаты и возвратов — в Правилах пожертвований.",
        ],
      },
    ],
  },
};
