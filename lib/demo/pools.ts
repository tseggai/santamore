// Word pools for the demo-data generator. Every name here is invented for
// demo purposes; none refers to a real person, sponsor or beneficiary. The
// team names are the prototype's placeholder teams.

export const FIRST_NAMES = [
  "Ana", "Marko", "Jelena", "Nikola", "Milica", "Stefan", "Ivana", "Petar",
  "Sara", "Luka", "Tamara", "Đorđe", "Nina", "Vuk", "Maša", "Filip",
  "Katarina", "Aleksa", "Lana", "Božidar", "Teodora", "Andrija", "Una", "Danilo",
];

export const LAST_NAMES = [
  "Đurović", "Radulović", "Kovačević", "Perović", "Vuković", "Bulatović",
  "Nikolić", "Marković", "Popović", "Jovanović", "Vujović", "Lakić",
  "Šćepanović", "Dragović", "Mijović", "Pavićević", "Žižić", "Čelebić",
];

export const TEAM_NAMES = [
  "Porto Runners", "Tim Boka", "Gimnazija Tivat", "Boka Trail Klub",
  "Familija Marković", "Jedriličari Tivat", "Kotor Swim Crew", "Budva Ravnica",
  "Lučka Kapetanija", "Vaterpolo Veterani",
];

export const TEAM_DESCRIPTIONS = [
  "Trčimo zajedno od proljeća — kolege s posla, komšije i dvoje djece koja nas sve prestignu. Ove godine skupljamo za porodice u Tivtu.",
  "Naš klub je mali, ali uporan. Svaki kilometar koji pretrčimo neko iz kraja plaća, i svaki euro ide u javni registar.",
  "Razred, roditelji i dva profesora. Cilj: da nas bude više nego prošle godine i da skupimo duplo.",
  "Porodični tim — tri generacije na startu. Djed ide pješke, ostali trče.",
  "Društvo s mora koje zimi ne miruje. Plivamo, trčimo i prikupljamo za komšije kojima je teško.",
];

export const STORY_OPENERS = [
  "Trčim Santa Run jer je to najljepši dan u godini u Boki.",
  "Prošle godine sam gledao/la sa strane, ove godine sam na startu.",
  "Prvi put trčim za nekog drugog, a ne za sebe.",
  "Moja baka je govorila da se dobro vraća — provjeravam.",
  "Ne trčim brzo, ali trčim za pravu stvar.",
];

export const STORY_MIDDLES = [
  "Svaki euro koji uplatiš ide porodicama iz našeg kraja, a Santamore objavljuje svaku uplatu i isplatu u javnom registru.",
  "Novac ne prolazi kroz moje ruke — ide direktno u fond, a komisija odlučuje kome je najpotrebniji.",
  "Cilj mi je skroman, ali svaka podrška je ohrabrenje da istrčam do kraja.",
  "Znam kome je novac stigao prošle godine, i zato vjerujem u ovo.",
];

export const STORY_CLOSERS = [
  "Podrži me sa koliko možeš — i podijeli stranicu dalje.",
  "Ako ne možeš da doniraš, dođi na start i navijaj.",
  "Hvala unaprijed. Vidimo se na obali.",
  "Svaki euro se broji, i svaki se vidi.",
];

export const DONOR_NAMES = [
  "Milan", "Jovana", "Tetka Rada", "Kolege iz firme", "Porodica Vukić",
  "Nenad", "Slavica", "Zoran i Maja", "Stric Đuro", "Kum Boban",
  "Marija", "Dragan", "Anonimni prijatelj", "Komšije s trećeg sprata",
];

export const DONOR_MESSAGES = [
  "Samo naprijed!",
  "Ponosni na tebe.",
  "Za Boku i za ljude.",
  "Trči i za mene, koljena mi ne daju.",
  "Sretno na startu — navijamo!",
  "Bravo, lijepa stvar.",
  "Sve najbolje ekipi.",
  "",
  "",
  "",
];

/** Two-colour palettes for generated avatars: sea, red, sand, mist. */
export const AVATAR_PALETTES: [top: [number, number, number], bottom: [number, number, number], accent: [number, number, number]][] = [
  [[14, 58, 70], [21, 80, 95], [234, 241, 242]],
  [[243, 83, 83], [217, 59, 59], [255, 236, 230]],
  [[54, 67, 75], [14, 58, 70], [246, 243, 238]],
  [[21, 80, 95], [243, 83, 83], [255, 255, 255]],
  [[234, 241, 242], [21, 80, 95], [54, 67, 75]],
];
