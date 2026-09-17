-- 0033 · The Santamore 25 donor wall.
-- The forty gifts taken on the 2025 site, as exported by the owner
-- (2026-09-17): names as the donors entered them for the public wall,
-- amounts as paid, newest first. One line without a name is shown as
-- Anonymous. Written only while the 2025 report's wall is still empty,
-- so a later edit in the admin is never overwritten. Re-runnable.

update public.year_reports
   set donors_list = $donors$
[
  {
    "name": "Eric Shapiro",
    "amount_cents": 2500
  },
  {
    "name": "Predrag Nenezic",
    "amount_cents": 10000
  },
  {
    "name": "Anton",
    "amount_cents": 1000
  },
  {
    "name": "Ksenija",
    "amount_cents": 1000
  },
  {
    "name": "Seth Carmichael",
    "amount_cents": 1000
  },
  {
    "name": "Jovana Bojin",
    "amount_cents": 5000
  },
  {
    "name": "Anna Solomakha",
    "amount_cents": 2500
  },
  {
    "name": "Dejan Brkan",
    "amount_cents": 20000
  },
  {
    "name": "Vjekoslav Vucinovic",
    "amount_cents": 5000
  },
  {
    "name": "Lucy Waalkens",
    "amount_cents": 2500
  },
  {
    "name": "Milos Jeknic",
    "amount_cents": 2500
  },
  {
    "name": "Olesya Bazhanova",
    "amount_cents": 1000
  },
  {
    "name": "Zoran Vucetic",
    "amount_cents": 2500
  },
  {
    "name": "Anastasia",
    "amount_cents": 5000
  },
  {
    "name": "Edin Zoronjic",
    "amount_cents": 10000
  },
  {
    "name": "Gustaf",
    "amount_cents": 10000
  },
  {
    "name": "Steven Ross",
    "amount_cents": 10000
  },
  {
    "name": "RR Var",
    "amount_cents": 20000
  },
  {
    "name": "Ema Hodzic",
    "amount_cents": 1000
  },
  {
    "name": "Nikola Andjelic",
    "amount_cents": 1000
  },
  {
    "name": "Ivica Radovanovic",
    "amount_cents": 10000
  },
  {
    "name": "Tseggai Debrezion",
    "amount_cents": 1000
  },
  {
    "name": "Bar Pizzeria Roma Vidoje Manojlovic",
    "amount_cents": 10000
  },
  {
    "name": "Stephen Komorowski",
    "amount_cents": 2500
  },
  {
    "name": "Tseggai Debrezion",
    "amount_cents": 1000
  },
  {
    "name": "Tseggai Debrezion",
    "amount_cents": 1000
  },
  {
    "name": "Tseggai Debrezion",
    "amount_cents": 1000
  },
  {
    "name": "Tseggai Debrezion",
    "amount_cents": 1000
  },
  {
    "name": "Mikhail Rybakov",
    "amount_cents": 1000
  },
  {
    "name": "Tripko Krgovic",
    "amount_cents": 20000
  },
  {
    "name": "aleksandra bozovic",
    "amount_cents": 1000
  },
  {
    "name": "Stasa",
    "amount_cents": 2500
  },
  {
    "name": "Meltem Yılmaz",
    "amount_cents": 10000
  },
  {
    "name": "E",
    "amount_cents": 2500
  },
  {
    "name": "Stasa C",
    "amount_cents": 2500
  },
  {
    "name": "Anonymous",
    "amount_cents": 5000
  },
  {
    "name": "Dragana Durica",
    "amount_cents": 1000
  },
  {
    "name": "Milla Willy",
    "amount_cents": 1000
  },
  {
    "name": "Tseggai Debrezion",
    "amount_cents": 2500
  },
  {
    "name": "Tseggai Debrezion",
    "amount_cents": 2500
  }
]
$donors$::jsonb
 where year = 2025
   and donors_list = '[]'::jsonb;
