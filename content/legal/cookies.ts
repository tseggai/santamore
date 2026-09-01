import type { LegalContent } from "./types";

export const cookiesContent: LegalContent = {
  me: {
    title: "Kolačići",
    intro:
      "Ova stranica objašnjava koje kolačiće (cookies) sajt koristi, čemu služe i kako mijenjate svoj izbor. Ukratko: koristimo samo ono što je neophodno da sajt radi, a analitika je isključena dok je sami ne uključite.",
    sections: [
      {
        heading: "Šta su kolačići",
        paragraphs: [
          "Kolačići su male tekstualne datoteke koje sajt čuva u vašem pregledaču da bi zapamtio stvari između dvije posjete — na primjer da ste prijavljeni ili šta ste izabrali u obavještenju o kolačićima.",
        ],
      },
      {
        heading: "Strogo neophodni kolačići",
        paragraphs: [
          "Ovi kolačići su potrebni da sajt uopšte radi i za njih se po propisima ne traži saglasnost:",
        ],
        bullets: [
          "Kolačići sesije za prijavu — drže prijavljene prikupljače, volontere i administratore ulogovanim. Postavljaju se tek kada se prijavite.",
          "Kolačić izbora o kolačićima — pamti da li ste analitiku prihvatili ili odbili, da vas ne pitamo na svakoj stranici.",
          "Bezbjednosni kolačići pri kartičnom plaćanju — kada kartična plaćanja budu aktivna, platni procesor Monri može postaviti kolačiće neophodne za sigurnu obradu plaćanja i 3-D Secure provjeru.",
        ],
      },
      {
        heading: "Analitika — isključena dok ne pristanete",
        paragraphs: [
          "Za mjerenje posjeta koristimo Plausible, alat koji ne pravi profile korisnika i ne prati vas po drugim sajtovima. Podrazumijevano je isključen: skripta se uopšte ne učitava dok u obavještenju o kolačićima ne izaberete „Prihvatam“. Odbijanje je jednako jednostavno kao prihvatanje i sajt radi potpuno isto i bez analitike.",
        ],
      },
      {
        heading: "Čega nema",
        paragraphs: ["Na ovom sajtu nema i neće biti:"],
        bullets: [
          "reklamnih piksela (Facebook, Google Ads i slično),",
          "Google Analytics-a,",
          "prodaje ili razmjene podataka sa oglašivačima,",
          "praćenja preko drugih sajtova.",
        ],
      },
      {
        heading: "Kako da promijenite svoj izbor",
        paragraphs: [
          "Izbor možete promijeniti u svakom trenutku: otvorite podešavanja kolačića preko veze u podnožju sajta i izaberite ponovo. Ako obrišete kolačiće u pregledaču, obavještenje će se ponovo pojaviti pri sljedećoj posjeti. Kolačiće možete blokirati i u podešavanjima samog pregledača — sajt će raditi, ali prijava neće biti moguća bez kolačića sesije.",
        ],
      },
      {
        heading: "Izmjene i kontakt",
        paragraphs: [
          "Ako počnemo koristiti novi kolačić, prvo ažuriramo ovu stranicu, a za sve što nije strogo neophodno tražimo saglasnost prije učitavanja. Pitanja: [[PLACEHOLDER: kontakt e-mail]].",
        ],
      },
    ],
  },
  en: {
    title: "Cookies",
    intro:
      "This page explains which cookies the site uses, what they are for, and how to change your choice. In short: we use only what is necessary for the site to work, and analytics stays off until you switch it on yourself.",
    sections: [
      {
        heading: "What cookies are",
        paragraphs: [
          "Cookies are small text files a site stores in your browser to remember things between visits — for example that you are signed in, or what you chose in the cookie notice.",
        ],
      },
      {
        heading: "Strictly necessary cookies",
        paragraphs: [
          "These cookies are required for the site to work at all, and the rules do not require consent for them:",
        ],
        bullets: [
          "Sign-in session cookies — keep fundraisers, volunteers and administrators signed in. They are set only when you sign in.",
          "The cookie-choice cookie — remembers whether you accepted or rejected analytics, so we do not ask on every page.",
          "Security cookies during card payment — once card payments go live, the payment processor Monri may set cookies necessary for secure payment processing and the 3-D Secure check.",
        ],
      },
      {
        heading: "Analytics — off until you consent",
        paragraphs: [
          "To measure visits we use Plausible, a tool that builds no user profiles and does not follow you across other sites. It is off by default: the script does not load at all until you choose \"Accept\" in the cookie notice. Rejecting is exactly as easy as accepting, and the site works just the same without analytics.",
        ],
      },
      {
        heading: "What is not here",
        paragraphs: ["This site has none of the following, and will not:"],
        bullets: [
          "advertising pixels (Facebook, Google Ads and the like),",
          "Google Analytics,",
          "selling or sharing data with advertisers,",
          "cross-site tracking.",
        ],
      },
      {
        heading: "How to change your choice",
        paragraphs: [
          "You can change your choice at any time: open the cookie settings via the link in the site footer and choose again. If you clear cookies in your browser, the notice will reappear on your next visit. You can also block cookies in your browser settings — the site will work, but signing in is not possible without the session cookie.",
        ],
      },
      {
        heading: "Changes and contact",
        paragraphs: [
          "If we start using a new cookie, we update this page first, and for anything that is not strictly necessary we ask for consent before it loads. Questions: [[PLACEHOLDER: contact email]].",
        ],
      },
    ],
  },
  ru: {
    title: "Файлы cookie",
    intro:
      "Эта страница объясняет, какие cookie использует сайт, зачем они нужны и как изменить свой выбор. Коротко: мы используем только необходимое для работы сайта, а аналитика выключена, пока вы сами её не включите.",
    sections: [
      {
        heading: "Что такое cookie",
        paragraphs: [
          "Cookie — это небольшие текстовые файлы, которые сайт сохраняет в вашем браузере, чтобы помнить что-то между визитами — например, что вы вошли в аккаунт или что вы выбрали в уведомлении о cookie.",
        ],
      },
      {
        heading: "Строго необходимые cookie",
        paragraphs: [
          "Эти cookie нужны, чтобы сайт вообще работал; согласие на них по правилам не требуется:",
        ],
        bullets: [
          "Сессионные cookie входа — держат сборщиков, волонтёров и администраторов в системе. Ставятся только при входе.",
          "Cookie выбора — запоминает, приняли вы аналитику или отклонили, чтобы не спрашивать на каждой странице.",
          "Cookie безопасности при оплате картой — когда карточные платежи заработают, платёжный процессор Monri может ставить cookie, необходимые для безопасной обработки платежа и проверки 3-D Secure.",
        ],
      },
      {
        heading: "Аналитика — выключена, пока вы не согласитесь",
        paragraphs: [
          "Для подсчёта посещений мы используем Plausible — инструмент, который не строит профили пользователей и не следит за вами на других сайтах. По умолчанию он выключен: скрипт вообще не загружается, пока вы не выберете «Принять» в уведомлении о cookie. Отклонить так же просто, как принять, и без аналитики сайт работает точно так же.",
        ],
      },
      {
        heading: "Чего здесь нет",
        paragraphs: ["На этом сайте нет и не будет:"],
        bullets: [
          "рекламных пикселей (Facebook, Google Ads и подобных),",
          "Google Analytics,",
          "продажи или передачи данных рекламодателям,",
          "межсайтового отслеживания.",
        ],
      },
      {
        heading: "Как изменить свой выбор",
        paragraphs: [
          "Выбор можно изменить в любой момент: откройте настройки cookie по ссылке в подвале сайта и выберите заново. Если вы очистите cookie в браузере, уведомление появится снова при следующем визите. Cookie можно заблокировать и в настройках браузера — сайт будет работать, но вход в аккаунт без сессионного cookie невозможен.",
        ],
      },
      {
        heading: "Изменения и контакт",
        paragraphs: [
          "Если мы начнём использовать новый cookie, сначала обновим эту страницу, а для всего, что не строго необходимо, запросим согласие до загрузки. Вопросы: [[PLACEHOLDER: контактный e-mail]].",
        ],
      },
    ],
  },
};
