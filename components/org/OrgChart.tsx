/**
 * The organisation at a glance, as the founders drew it: the Assembly on
 * top; under it the Board, the Executive Director and the Grants Committee
 * in one row, the Board governing the Director from the left and the
 * Committee's grant decisions reaching the Director from the right; under
 * the Director the team leads, the staff and the chapter teams; under
 * those the volunteer roles. One SVG, Montenegrin or English, drawn from the
 * statute as adopted on 2026-10-21 and the team guide
 * (docs/legal/governance/organisation-and-roles.*.md says the same in
 * words). Head counts are planning figures.
 */
export type OrgChartLang = "me" | "en";

interface Box {
  name: string;
  lines: string[];
  paid?: boolean;
  /** An independent body: elected by the Assembly, its decisions final, drawn with a dashed border. */
  independent?: boolean;
}

interface Strings {
  title: string;
  assembly: Box;
  board: Box;
  director: Box;
  committee: Box;
  rowC: [Box, Box, Box];
  rowD: [Box, Box, Box];
  elects: string;
  governs: string;
  implements: string;
  directs: string;
  runs: string;
  keyPaid: string;
  keyIndependent: string;
  keyUnpaid: string;
}

const STRINGS: Record<OrgChartLang, Strings> = {
  en: {
    title: "The Assembly elects, the Board governs, the Director runs, the Committee grants",
    assembly: { name: "Assembly · all members, one vote each", lines: ["Highest body · at least once a year · adopts the statute, budget and reports", "Its President chairs it, checks proxies and the quorum, and decides a tie · unpaid"] },
    board: { name: "Board · 5–7, unpaid", lines: ["Strategy, budget, staffing, pay", "Independent majority", "4 meetings a year", "A tie: its President decides"] },
    director: { name: "Executive Director · 1", lines: ["The founder · 6-year term, renewable", "Reports to Assembly and Board", "Decides everything not reserved", "Paid once the fund exists"], paid: true },
    committee: { name: "Grants Committee · 3–5", lines: ["Decides who receives funds", "Decisions final · unpaid", "No founders, Director or staff", "4 sittings a year"], independent: true },
    rowC: [
      { name: "Team leads · about 5", lines: ["One function each", "4–6 hours a month", "Unpaid"] },
      { name: "Staff · 0 now, 1–2 by 2027", lines: ["Hired by the Board", "Pay set by independent members", "Paid from sponsorship"], paid: true },
      { name: "Chapter team · 3 per town", lines: ["Lead, treasurer, coordinator", "Appointed by the Board, 2 years", "Unpaid, lead part-paid later"] },
    ],
    rowD: [
      { name: "Event volunteers · about 40", lines: ["1 day, briefed the week before", "Unpaid"] },
      { name: "Fundraisers · about 20", lines: ["About 3 hours in total", "Unpaid"] },
      { name: "Club connectors · a few", lines: ["A few calls, stay on the thread", "Unpaid"] },
    ],
    elects: "elects and recalls",
    governs: "governs",
    implements: "implements",
    directs: "directs",
    runs: "run",
    keyPaid: "Paid from sponsorship and grants, never from donations",
    keyIndependent: "Independent: its grant decisions are final",
    keyUnpaid: "Unpaid · head counts are planning targets",
  },
  me: {
    title: "Skupština bira, Upravni odbor upravlja, direktor vodi, Komisija dodjeljuje",
    assembly: { name: "Skupština · svi članovi, po jedan glas", lines: ["Najviši organ · najmanje jednom godišnje · usvaja statut, budžet i izvještaje", "Predsjednik njome rukovodi, provjerava punomoćja i kvorum i odlučuje neriješeno · neplaćeno"] },
    board: { name: "Upravni odbor · 5–7, neplaćeno", lines: ["Strategija, budžet, osoblje, zarade", "Nezavisna većina", "4 sjednice godišnje", "Neriješeno: odlučuje predsjednik"] },
    director: { name: "Izvršni direktor · 1", lines: ["Osnivač · mandat 6 g., ponovljiv", "Odgovara Skupštini i Odboru", "Odlučuje o svemu nerezervisanom", "Plaćeno kad fond postoji"], paid: true },
    committee: { name: "Komisija za sredstva · 3–5", lines: ["Odlučuje ko dobija sredstva", "Odluke konačne · neplaćeno", "Bez osnivača, direktora, osoblja", "4 sjednice godišnje"], independent: true },
    rowC: [
      { name: "Rukovodioci timova · oko 5", lines: ["Po jedna funkcija", "4–6 sati mjesečno", "Neplaćeno"] },
      { name: "Osoblje · 0 sada, 1–2 do 2027.", lines: ["Zapošljava Upravni odbor", "Zaradu utvrđuju nezavisni", "Plaćeno iz sponzorstava"], paid: true },
      { name: "Tim ogranka · 3 po gradu", lines: ["Rukovodilac, blagajnik, koord.", "Imenuje Upravni odbor, 2 g.", "Neplaćeno, kasnije dijelom"] },
    ],
    rowD: [
      { name: "Volonteri događaja · oko 40", lines: ["1 dan, brifing sedmicu prije", "Neplaćeno"] },
      { name: "Prikupljači · oko 20", lines: ["Oko 3 sata ukupno", "Neplaćeno"] },
      { name: "Veze sa klubovima · nekoliko", lines: ["Nekoliko poziva", "Neplaćeno"] },
    ],
    elects: "bira i razrješava",
    governs: "upravlja",
    implements: "sprovodi",
    directs: "rukovodi",
    runs: "vode",
    keyPaid: "Plaćeno iz sponzorstava i grantova, nikad iz donacija",
    keyIndependent: "Nezavisna: odluke o dodjeli su konačne",
    keyUnpaid: "Neplaćeno · brojevi su planski ciljevi",
  },
};

const W = 226;
const COLS = [24, 267, 510];
const MIDS = [137, 380, 623];
const EDGE = "#9AA7AD";
const RED = "#F35353";
const SEA = "#0E3A46";
const PAID_FILL = "#FDE4E4";
const MIST = "#F1F5F6";
const QUIET = "rgba(0,0,0,0.62)";

/** Rows, top down: the Assembly; the Board, the Director and the Committee; the team; the volunteers; the key. */
const ROW_A = 40;
const ROW_B = 148;
const ROW_C = 300;
const ROW_D = 432;
const H_A = 72;
const H_B = 104;
const H_C = 88;
const H_D = 72;

function BoxShape({ x, y, w, h, box }: { x: number; y: number; w: number; h: number; box: Box }) {
  const last = box.lines.length - 1;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={box.paid ? PAID_FILL : MIST}
        stroke={box.paid ? RED : box.independent ? SEA : "none"} strokeWidth={box.paid || box.independent ? 2 : 0} strokeDasharray={box.independent ? "6 4" : undefined} />
      <text x={x + 12} y={y + 24} fontSize={13.5} fontWeight={700} fill="#000">{box.name}</text>
      {box.lines.map((line, i) => (
        <text key={i} x={x + 12} y={y + 41 + i * 16} fontSize={12} fill={i === last ? "#000" : QUIET} fontWeight={i === last ? 700 : 400}>{line}</text>
      ))}
    </g>
  );
}

function Label({ x, y, text, anchor = "start" }: { x: number; y: number; text: string; anchor?: "start" | "middle" | "end" }) {
  return <text x={x} y={y} fontSize={11} fontStyle="italic" fill={QUIET} textAnchor={anchor}>{text}</text>;
}

export function OrgChart({ lang, className = "" }: { lang: OrgChartLang; className?: string }) {
  const s = STRINGS[lang];
  const busA = ROW_A + H_A + 18;
  const busC = ROW_C + H_C + 16;
  const dirMid = MIDS[1];
  const midB = ROW_B + H_B / 2;
  const keyY = ROW_D + H_D + 22;
  const arrow = "url(#org-chart-arrow)";
  return (
    <svg viewBox="0 0 760 580" role="img" aria-label={s.title} className={`block h-auto w-full ${className}`} fontSize={12}>
      <defs>
        <marker id="org-chart-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill={EDGE} />
        </marker>
      </defs>
      <text x={24} y={22} fontSize={15} fontWeight={700} fill="#000">{s.title}</text>

      {/* The Assembly elects the Board, the Director and the Committee. */}
      <BoxShape x={24} y={ROW_A} w={712} h={H_A} box={s.assembly} />
      <line x1={dirMid} y1={ROW_A + H_A} x2={dirMid} y2={busA} stroke={EDGE} strokeWidth={1.25} />
      <line x1={MIDS[0]} y1={busA} x2={MIDS[2]} y2={busA} stroke={EDGE} strokeWidth={1.25} />
      {MIDS.map((m) => <line key={m} x1={m} y1={busA} x2={m} y2={ROW_B} stroke={EDGE} strokeWidth={1.25} markerEnd={arrow} />)}
      <Label x={dirMid + 8} y={busA - 6} text={s.elects} />

      <BoxShape x={COLS[0]} y={ROW_B} w={W} h={H_B} box={s.board} />
      <BoxShape x={COLS[1]} y={ROW_B} w={W} h={H_B} box={s.director} />
      <BoxShape x={COLS[2]} y={ROW_B} w={W} h={H_B} box={s.committee} />

      {/* The Board governs the Director; the Committee's decisions reach the Director, who implements them. */}
      <line x1={COLS[0] + W} y1={midB} x2={COLS[1] - 2} y2={midB} stroke={EDGE} strokeWidth={1.25} markerEnd={arrow} />
      <Label x={(COLS[0] + W + COLS[1]) / 2} y={ROW_B - 6} text={s.governs} anchor="middle" />
      <line x1={COLS[2]} y1={midB} x2={COLS[1] + W + 2} y2={midB} stroke={EDGE} strokeWidth={1.25} strokeDasharray="5 4" markerEnd={arrow} />
      <Label x={(COLS[1] + W + COLS[2]) / 2} y={ROW_B - 6} text={s.implements} anchor="middle" />

      {/* The Director directs the team. */}
      <line x1={dirMid} y1={ROW_B + H_B} x2={dirMid} y2={busC - (busC - ROW_B - H_B) + 20} stroke={EDGE} strokeWidth={1.25} />
      <line x1={MIDS[0]} y1={ROW_B + H_B + 20} x2={MIDS[2]} y2={ROW_B + H_B + 20} stroke={EDGE} strokeWidth={1.25} />
      {MIDS.map((m) => <line key={m} x1={m} y1={ROW_B + H_B + 20} x2={m} y2={ROW_C} stroke={EDGE} strokeWidth={1.25} markerEnd={arrow} />)}
      <Label x={dirMid + 8} y={ROW_B + H_B + 15} text={s.directs} />
      {s.rowC.map((box, i) => <BoxShape key={box.name} x={COLS[i]} y={ROW_C} w={W} h={H_C} box={box} />)}

      {/* The team runs the volunteer roles. */}
      <line x1={MIDS[0]} y1={ROW_C + H_C} x2={MIDS[0]} y2={busC} stroke={EDGE} strokeWidth={1.25} />
      <line x1={MIDS[2]} y1={ROW_C + H_C} x2={MIDS[2]} y2={busC} stroke={EDGE} strokeWidth={1.25} />
      <line x1={MIDS[0]} y1={busC} x2={MIDS[2]} y2={busC} stroke={EDGE} strokeWidth={1.25} />
      {MIDS.map((m) => <line key={m} x1={m} y1={busC} x2={m} y2={ROW_D} stroke={EDGE} strokeWidth={1.25} markerEnd={arrow} />)}
      <Label x={MIDS[0] + 8} y={ROW_C + H_C + 13} text={s.runs} />
      {s.rowD.map((box, i) => <BoxShape key={box.name} x={COLS[i]} y={ROW_D} w={W} h={H_D} box={box} />)}

      <rect x={24} y={keyY} width={14} height={14} rx={3} fill={PAID_FILL} stroke={RED} strokeWidth={2} />
      <text x={46} y={keyY + 11} fill="#000">{s.keyPaid}</text>
      <rect x={400} y={keyY} width={14} height={14} rx={3} fill={MIST} stroke={SEA} strokeWidth={2} strokeDasharray="4 3" />
      <text x={422} y={keyY + 11} fill="#000">{s.keyIndependent}</text>
      <rect x={24} y={keyY + 22} width={14} height={14} rx={3} fill={MIST} />
      <text x={46} y={keyY + 33} fill="#000">{s.keyUnpaid}</text>
    </svg>
  );
}
