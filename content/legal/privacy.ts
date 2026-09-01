import type { LegalContent } from "./types";

export const privacyContent: LegalContent = {
  me: {
    title: "Pravila privatnosti",
    intro:
      "Ova pravila objašnjavaju koje podatke o ličnosti prikupljamo, zašto ih prikupljamo, kome ih povjeravamo i koja prava imate. Pišemo ih u skladu sa crnogorskim Zakonom o zaštiti podataka o ličnosti i, pošto imamo donatore iz EU, sa Opštom uredbom EU o zaštiti podataka (GDPR, Uredba (EU) 2016/679).",
    sections: [
      {
        heading: "Ko smo mi",
        paragraphs: [
          "Rukovalac podacima je [[PLACEHOLDER: puno registrovano ime organizacije]], nevladino udruženje sa sjedištem u Tivtu, [[PLACEHOLDER: registrovana adresa, Tivat]]. Za sva pitanja o podacima pišite na [[PLACEHOLDER: kontakt e-mail]].",
          "Naša osoba za kontakt u vezi zaštite podataka je [[PLACEHOLDER: ime osobe za kontakt za zaštitu podataka]].",
        ],
      },
      {
        heading: "Koje podatke prikupljamo",
        paragraphs: ["Prikupljamo samo ono što nam treba za konkretan posao:"],
        bullets: [
          "Kada donirate: ime i prezime, e-mail adresu, iznos i vaš izbor da li se ime prikazuje javno. Ako platite karticom, banka radi provjere može tražiti i telefon i adresu — ti podaci idu direktno platnom procesoru, ne nama.",
          "Kada se prijavite na događaj: ime, e-mail, telefon, distancu, veličinu majice, potpisanu izjavu o učešću i, za maloljetne, saglasnost staratelja.",
          "Kada otvorite stranicu prikupljača: e-mail za prijavu, fotografiju, priču i cilj koje sami objavite.",
          "Na događajima: fotografije i snimke, uz pravila opisana niže.",
          "Tehnički podaci: serverski logovi (IP adresa, vrijeme zahtjeva) radi bezbjednosti i otklanjanja grešaka.",
        ],
      },
      {
        heading: "Zašto ih prikupljamo i po kom osnovu",
        paragraphs: ["Svaku obradu vezujemo za jedan od ovih osnova:"],
        bullets: [
          "Izvršenje ugovora: obrada donacije, prijava na događaj, vođenje vaše stranice prikupljača.",
          "Zakonska obaveza: računovodstvena i poreska evidencija uplata i isplata.",
          "Legitimni interes: bezbjednost sajta, sprječavanje zloupotreba i javni registar uplata — pri čemu vi birate da li se vaše ime prikazuje ili ste anonimni.",
          "Saglasnost: objavljivanje fotografija na kojima ste prepoznatljivi, analitika i obavještenja e-poštom koja niste obavezni da primate. Saglasnost možete povući u svakom trenutku.",
        ],
      },
      {
        heading: "Kome povjeravamo podatke (obrađivači)",
        paragraphs: [
          "Ne prodajemo podatke nikome. Koristimo mali broj obrađivača bez kojih sajt ne radi:",
        ],
        bullets: [
          "Supabase — baza podataka, prijava i skladište fajlova. Region hostovanja: EU [[PLACEHOLDER: potvrditi region Supabase projekta]].",
          "Vercel — hosting sajta.",
          "Resend — slanje e-mail poruka (potvrde, uputstva za uplatu).",
          "Monri — obrada kartičnih plaćanja, Hrvatska (kada kartična plaćanja budu aktivna). Broj vaše kartice nikada ne prolazi kroz naše servere.",
        ],
      },
      {
        heading: "Javni registar i vaše ime",
        paragraphs: [
          "Svaku uplatu i isplatu objavljujemo u javnom registru — to je srž našeg rada. U registru se prikazuje ili ime koje ste sami izabrali za prikaz ili oznaka „Anonimno“, iznos i datum. Vaš e-mail, telefon i adresa se nikada ne objavljuju. Podaci o korisnicima pomoći objavljuju se samo u uopštenom obliku (npr. „porodica iz Tivta — troškovi liječenja“), nikad sa imenom bez izričite saglasnosti.",
        ],
      },
      {
        heading: "Fotografije",
        paragraphs: [
          "Na događajima fotografišemo i snimamo za galeriju i objave. Pri prijavi na događaj birate da li pristajete da budete prepoznatljivi na objavljenim fotografijama; taj izbor možete promijeniti. Ako se prepoznate na objavljenoj fotografiji i želite da je uklonimo, pišite na [[PLACEHOLDER: kontakt e-mail]] i uklonićemo je. Za djecu važe stroža pravila iz naše politike zaštite djece.",
        ],
      },
      {
        heading: "Koliko dugo čuvamo podatke",
        paragraphs: [
          "Podatke o uplatama i isplatama čuvamo onoliko koliko traže računovodstveni i poreski propisi Crne Gore. Nalog i stranicu prikupljača čuvamo dok ih ne obrišete ili ne zatražite brisanje. Fotografije čuvamo dok važi saglasnost. Serverske logove čuvamo kratko, radi bezbjednosti. Tačne rokove po propisima potvrdiće advokat prije objave ovih pravila.",
        ],
      },
      {
        heading: "Vaša prava",
        paragraphs: [
          "Po crnogorskom zakonu i GDPR-u imate pravo da tražite: pristup svojim podacima, ispravku, brisanje, ograničenje obrade, prenos podataka, kao i da prigovorite obradi ili povučete saglasnost. Zahtjev pošaljite na [[PLACEHOLDER: kontakt e-mail]] — odgovaramo bez odlaganja, a najkasnije u roku koji propisi predviđaju.",
          "Ako smatrate da smo vaša prava povrijedili, možete se žaliti Agenciji za zaštitu ličnih podataka i slobodan pristup informacijama Crne Gore, a donatori iz EU i nadzornom organu u svojoj zemlji.",
        ],
      },
      {
        heading: "Izmjene ovih pravila",
        paragraphs: [
          "Ako pravila izmijenimo, novu verziju objavljujemo na ovoj stranici sa datumom izmjene. Za suštinske izmjene obavijestićemo registrovane korisnike e-poštom.",
        ],
      },
    ],
  },
  en: {
    title: "Privacy policy",
    intro:
      "This policy explains what personal data we collect, why we collect it, who we entrust it to, and what rights you have. It is written to comply with Montenegro's Law on Personal Data Protection and, because we have EU donors, with the EU General Data Protection Regulation (GDPR, Regulation (EU) 2016/679).",
    sections: [
      {
        heading: "Who we are",
        paragraphs: [
          "The data controller is [[PLACEHOLDER: full registered organisation name]], a non-governmental association based in Tivat, [[PLACEHOLDER: registered address, Tivat]]. For anything data-related, write to [[PLACEHOLDER: contact email]].",
          "Our data protection contact is [[PLACEHOLDER: data protection contact name]].",
        ],
      },
      {
        heading: "What we collect",
        paragraphs: ["We collect only what we need for a specific job:"],
        bullets: [
          "When you donate: your name, email address, the amount, and your choice of whether your name is shown publicly. If you pay by card, the bank's verification may also require a phone number and address — those go directly to the payment processor, not to us.",
          "When you register for an event: name, email, phone, distance, shirt size, the signed participation waiver and, for minors, guardian consent.",
          "When you open a fundraiser page: your sign-in email, plus the photo, story and target you choose to publish.",
          "At events: photos and video, under the rules described below.",
          "Technical data: server logs (IP address, request time) for security and debugging.",
        ],
      },
      {
        heading: "Why we collect it, and on what legal basis",
        paragraphs: ["Every processing activity rests on one of these bases:"],
        bullets: [
          "Performance of a contract: processing your donation, registering you for an event, running your fundraiser page.",
          "Legal obligation: accounting and tax records of money in and money out.",
          "Legitimate interest: site security, abuse prevention, and the public ledger of payments — where you choose whether your name appears or you stay anonymous.",
          "Consent: publishing photos in which you are identifiable, analytics, and optional email updates. You can withdraw consent at any time.",
        ],
      },
      {
        heading: "Who we entrust data to (processors)",
        paragraphs: [
          "We sell data to no one. We use a small number of processors without which the site would not run:",
        ],
        bullets: [
          "Supabase — database, sign-in and file storage. Hosting region: EU [[PLACEHOLDER: confirm Supabase project region]].",
          "Vercel — website hosting.",
          "Resend — email delivery (confirmations, transfer instructions).",
          "Monri — card payment processing, Croatia (once card payments go live). Your card number never passes through our servers.",
        ],
      },
      {
        heading: "The public ledger and your name",
        paragraphs: [
          "We publish every payment in and out in a public ledger — that is the heart of what we do. The ledger shows either the display name you chose or the label \"Anonymous\", the amount, and the date. Your email, phone and address are never published. Beneficiaries appear only in generalised form (e.g. \"family in Tivat — medical costs\"), never by name without explicit consent.",
        ],
      },
      {
        heading: "Photos",
        paragraphs: [
          "We photograph and film at events for the gallery and our posts. When you register for an event you choose whether you consent to being identifiable in published photos; you can change that choice. If you recognise yourself in a published photo and want it removed, write to [[PLACEHOLDER: contact email]] and we will take it down. Stricter rules apply to children under our child safeguarding policy.",
        ],
      },
      {
        heading: "How long we keep data",
        paragraphs: [
          "We keep records of payments in and out for as long as Montenegro's accounting and tax regulations require. Your account and fundraiser page are kept until you delete them or ask us to. Photos are kept while consent stands. Server logs are kept briefly, for security. The exact statutory periods will be confirmed by a lawyer before this policy is published.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "Under Montenegrin law and the GDPR you can ask for: access to your data, correction, erasure, restriction of processing, data portability, and you can object to processing or withdraw consent. Send requests to [[PLACEHOLDER: contact email]] — we respond without delay, and at the latest within the period the regulations set.",
          "If you believe we have violated your rights, you can complain to Montenegro's Agency for Personal Data Protection and Free Access to Information; EU donors can also complain to the supervisory authority in their own country.",
        ],
      },
      {
        heading: "Changes to this policy",
        paragraphs: [
          "If we change this policy, we publish the new version on this page with the date of the change. For substantial changes we will notify registered users by email.",
        ],
      },
    ],
  },
  ru: {
    title: "Политика конфиденциальности",
    intro:
      "Эта политика объясняет, какие персональные данные мы собираем, зачем, кому их доверяем и какие у вас есть права. Она составлена в соответствии с черногорским Законом о защите персональных данных и — поскольку у нас есть доноры из ЕС — с Общим регламентом ЕС по защите данных (GDPR, Регламент (ЕС) 2016/679).",
    sections: [
      {
        heading: "Кто мы",
        paragraphs: [
          "Оператор данных — [[PLACEHOLDER: полное зарегистрированное название организации]], неправительственная организация из Тивата, [[PLACEHOLDER: зарегистрированный адрес, Тиват]]. По любым вопросам о данных пишите на [[PLACEHOLDER: контактный e-mail]].",
          "Наше контактное лицо по защите данных — [[PLACEHOLDER: имя контактного лица по защите данных]].",
        ],
      },
      {
        heading: "Какие данные мы собираем",
        paragraphs: ["Мы собираем только то, что нужно для конкретной задачи:"],
        bullets: [
          "Когда вы жертвуете: имя, e-mail, сумму и ваш выбор — показывать ли имя публично. При оплате картой банк для проверки может запросить телефон и адрес — эти данные идут напрямую платёжному процессору, а не нам.",
          "Когда вы регистрируетесь на событие: имя, e-mail, телефон, дистанцию, размер футболки, подписанное заявление участника и, для несовершеннолетних, согласие опекуна.",
          "Когда вы открываете страницу сборщика: e-mail для входа, а также фото, историю и цель, которые вы сами публикуете.",
          "На событиях: фотографии и видео, по правилам, описанным ниже.",
          "Технические данные: серверные логи (IP-адрес, время запроса) для безопасности и отладки.",
        ],
      },
      {
        heading: "Зачем и на каком основании",
        paragraphs: ["Каждая обработка опирается на одно из этих оснований:"],
        bullets: [
          "Исполнение договора: обработка пожертвования, регистрация на событие, ведение вашей страницы сборщика.",
          "Законная обязанность: бухгалтерский и налоговый учёт поступлений и выплат.",
          "Законный интерес: безопасность сайта, предотвращение злоупотреблений и публичный реестр платежей — при этом вы сами выбираете, показывать имя или остаться анонимным.",
          "Согласие: публикация фотографий, на которых вас можно узнать, аналитика и необязательные письма. Согласие можно отозвать в любой момент.",
        ],
      },
      {
        heading: "Кому мы доверяем данные (процессоры)",
        paragraphs: [
          "Мы никому не продаём данные. Мы используем небольшое число процессоров, без которых сайт не работает:",
        ],
        bullets: [
          "Supabase — база данных, вход и хранение файлов. Регион хостинга: ЕС [[PLACEHOLDER: подтвердить регион проекта Supabase]].",
          "Vercel — хостинг сайта.",
          "Resend — отправка электронной почты (подтверждения, инструкции для перевода).",
          "Monri — обработка карточных платежей, Хорватия (когда карточные платежи заработают). Номер вашей карты никогда не проходит через наши серверы.",
        ],
      },
      {
        heading: "Публичный реестр и ваше имя",
        paragraphs: [
          "Каждое поступление и каждую выплату мы публикуем в открытом реестре — это суть нашей работы. В реестре видно либо выбранное вами имя для показа, либо пометку «Анонимно», сумму и дату. Ваши e-mail, телефон и адрес никогда не публикуются. Получатели помощи упоминаются только обобщённо (например, «семья из Тивата — расходы на лечение»), никогда по имени без явного согласия.",
        ],
      },
      {
        heading: "Фотографии",
        paragraphs: [
          "На событиях мы фотографируем и снимаем видео для галереи и публикаций. При регистрации вы выбираете, согласны ли быть узнаваемым на опубликованных фото; этот выбор можно изменить. Если вы узнали себя на опубликованном фото и хотите его убрать, напишите на [[PLACEHOLDER: контактный e-mail]] — мы удалим его. Для детей действуют более строгие правила нашей политики защиты детей.",
        ],
      },
      {
        heading: "Сколько мы храним данные",
        paragraphs: [
          "Записи о поступлениях и выплатах мы храним столько, сколько требуют бухгалтерские и налоговые нормы Черногории. Аккаунт и страницу сборщика — пока вы их не удалите или не попросите об удалении. Фотографии — пока действует согласие. Серверные логи — недолго, для безопасности. Точные сроки по законодательству подтвердит юрист до публикации этой политики.",
        ],
      },
      {
        heading: "Ваши права",
        paragraphs: [
          "По черногорскому закону и GDPR вы можете запросить: доступ к своим данным, исправление, удаление, ограничение обработки, перенос данных, а также возразить против обработки или отозвать согласие. Запросы направляйте на [[PLACEHOLDER: контактный e-mail]] — мы отвечаем без задержек и не позднее срока, установленного нормами.",
          "Если вы считаете, что мы нарушили ваши права, вы можете пожаловаться в Агентство по защите персональных данных и свободному доступу к информации Черногории, а доноры из ЕС — также в надзорный орган своей страны.",
        ],
      },
      {
        heading: "Изменения этой политики",
        paragraphs: [
          "Если мы изменим политику, новая версия появится на этой странице с датой изменения. О существенных изменениях мы сообщим зарегистрированным пользователям по электронной почте.",
        ],
      },
    ],
  },
};
