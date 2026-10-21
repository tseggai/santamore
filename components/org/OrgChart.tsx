/**
 * The organisation at a glance, top down: the Assembly elects the Board and
 * the Grants Committee and the Executive Director; the Board governs the
 * Director; the Director directs the team leads, the chapter teams and the
 * staff; those run the volunteer roles. One SVG, Montenegrin or English,
 * drawn from the statute as adopted on 2026-10-21 and the team guide
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
  committee: Box;
  director: Box;
  rowC: [Box, Box, Box];
  rowD: [Box, Box, Box];
  elects: string;
  governs: string;
  reports: string;
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
    assembly: { name: "Assembly · all members, one vote each", lines: ["Highest body · at least once a year · adopts the statute, budget and reports · a tie: the President's vote decides · unpaid"] },
    board: { name: "Board · 5–7 people, unpaid", lines: ["Strategy, budget, staffing, pay", "Independent majority · 4 meetings a year", "A tie: the President's vote decides"] },
    committee: { name: "Grants Committee · 3–5, unpaid", lines: ["Decides who receives funds · final", "No founders, Director or staff", "4 sittings a year"], independent: true },
    director: { name: "Executive Director · 1", lines: ["The founder · 6-year term, renewable", "Decides everything not reserved", "Removed only by 2/3 of all members", "Paid once the Operations Fund exists"], paid: true },
    rowC: [
      { name: "Team leads · about 5", lines: ["One function each", "4–6 hours a month", "Unpaid"] },
      { name: "Chapter team · 3 per town", lines: ["Lead, treasurer, coordinator", "Appointed by the Board, 2 years", "Unpaid, lead part-paid later"] },
      { name: "Staff · 0 now, 1–2 by 2027", lines: ["Hired by the Board", "Pay set by independent members", "Paid from sponsorship"], paid: true },
    ],
    rowD: [
      { name: "Event volunteers · about 40", lines: ["1 day, briefed the week before", "Unpaid"] },
      { name: "Fundraisers · about 20", lines: ["About 3 hours in total", "Unpaid"] },
      { name: "Club connectors · a few", lines: ["A few calls, stay on the thread", "Unpaid"] },
    ],
    elects: "elects and recalls",
    governs: "governs",
    reports: "reports to both",
    implements: "implements",
    directs: "directs",
    runs: "run",
    keyPaid: "Paid from sponsorship and grants, never from donations",
    keyIndependent: "Independent: its grant decisions are final",
    keyUnpaid: "Unpaid · head counts are planning targets",
  },
  me: {
    title: "Skupština bira, Upravni odbor upravlja, direktor vodi, Komisija dodjeljuje",
    assembly: { name: "Skupština · svi članovi, po jedan glas", lines: ["Najviši organ · najmanje jednom godišnje · usvaja statut, budžet i izvještaje · neriješeno: glas Predsjednika · neplaćeno"] },
    board: { name: "Upravni odbor · 5–7, neplaćeno", lines: ["Strategija, budžet, osoblje, zarade", "Nezavisna većina · 4 sjednice godišnje", "Neriješeno: odlučuje glas predsjednika"] },
    committee: { name: "Komisija za sredstva · 3–5, neplaćeno", lines: ["Odlučuje ko dobija sredstva · konačno", "Bez osnivača, direktora i osoblja", "4 sjednice godišnje"], independent: true },
    director: { name: "Izvršni direktor · 1", lines: ["Osnivač · mandat 6 g., ponovljiv", "Odlučuje o svemu nerezervisanom", "Razrješenje samo sa 2/3 svih članova", "Plaćeno kad Operativni fond postoji"], paid: true },
    rowC: [
      { name: "Rukovodioci timova · oko 5", lines: ["Po jedna funkcija", "4–6 sati mjesečno", "Neplaćeno"] },
      { name: "Tim ogranka · 3 po gradu", lines: ["Rukovodilac, blagajnik, koord.", "Imenuje Upravni odbor, 2 g.", "Neplaćeno, kasnije dijelom"] },
      { name: "Osoblje · 0 sada, 1–2 do 2027.", lines: ["Zapošljava Upravni odbor", "Zaradu utvrđuju nezavisni", "Plaćeno iz sponzorstava"], paid: true },
    ],
    rowD: [
      { name: "Volonteri događaja · oko 40", lines: ["1 dan, brifing sedmicu prije", "Neplaćeno"] },
      { name: "Prikupljači · oko 20", lines: ["Oko 3 sata ukupno", "Neplaćeno"] },
      { name: "Veze sa klubovima · nekoliko", lines: ["Nekoliko poziva", "Neplaćeno"] },
    ],
    elects: "bira i razrješava",
    governs: "upravlja",
    reports: "odgovara obojici",
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

/** Rows, top down: the Assembly, the Board with the Committee beside it, the Director, the team, the volunteers, the key. */
const ROW_A = 40;
const ROW_B = 136;
const ROW_C = 272;
const ROW_D = 404;
const ROW_E = 522;
const H_A = 56;
const H_B = 88;
const H_C = 104;
const H_D = 88;
const H_E = 72;

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

function Arrow({ x, y1, y2, dashed }: { x: number; y1: number; y2: number; dashed?: boolean }) {
  return <line x1={x} y1={y1} x2={x} y2={y2} stroke={EDGE} strokeWidth={1.25} strokeDasharray={dashed ? "5 4" : undefined} markerEnd="url(#org-chart-arrow)" />;
}

function Label({ x, y, text, anchor = "start" }: { x: number; y: number; text: string; anchor?: "start" | "middle" | "end" }) {
  return <text x={x} y={y} fontSize={11} fontStyle="italic" fill={QUIET} textAnchor={anchor}>{text}</text>;
}

export function OrgChart({ lang, className = "" }: { lang: OrgChartLang; className?: string }) {
  const s = STRINGS[lang];
  const boardX = 24;
  const boardW = 340;
  const boardMid = boardX + boardW / 2;
  const commX = 396;
  const commW = 340;
  const commMid = commX + commW / 2;
  const dirX = 24;
  const dirW = 340;
  const dirMid = dirX + dirW / 2;
  const busC = ROW_C + H_C + 16;
  const busD = ROW_D + H_D + 16;
  const keyY = ROW_E + H_E + 22;
  return (
    <svg viewBox="0 0 760 668" role="img" aria-label={s.title} className={`block h-auto w-full ${className}`} fontSize={12}>
      <defs>
        <marker id="org-chart-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill={EDGE} />
        </marker>
      </defs>
      <text x={24} y={22} fontSize={15} fontWeight={700} fill="#000">{s.title}</text>

      {/* The Assembly elects the Board, the Committee and the Director. */}
      <BoxShape x={24} y={ROW_A} w={712} h={H_A} box={s.assembly} />
      <Arrow x={boardMid} y1={ROW_A + H_A} y2={ROW_B} />
      <Arrow x={commMid} y1={ROW_A + H_A} y2={ROW_B} />
      <Label x={boardMid + 8} y={ROW_A + H_A + 26} text={s.elects} />
      <Label x={commMid + 8} y={ROW_A + H_A + 26} text={s.elects} />

      <BoxShape x={boardX} y={ROW_B} w={boardW} h={H_B} box={s.board} />
      <BoxShape x={commX} y={ROW_B} w={commW} h={H_B} box={s.committee} />

      {/* The Board governs the Director; the Director reports to the Assembly and the Board and implements the Committee's decisions. */}
      <Arrow x={boardMid} y1={ROW_B + H_B} y2={ROW_C} />
      <Label x={boardMid + 8} y={ROW_B + H_B + 22} text={s.governs} />
      <Label x={boardMid + 8} y={ROW_B + H_B + 38} text={s.reports} />
      <line x1={commMid} y1={ROW_B + H_B} x2={commMid} y2={ROW_C + 44} stroke={EDGE} strokeWidth={1.25} strokeDasharray="5 4" />
      <line x1={commMid} y1={ROW_C + 44} x2={dirX + dirW + 2} y2={ROW_C + 44} stroke={EDGE} strokeWidth={1.25} strokeDasharray="5 4" markerEnd="url(#org-chart-arrow)" />
      <Label x={commMid - 8} y={ROW_C + 36} text={s.implements} anchor="end" />

      <BoxShape x={dirX} y={ROW_C} w={dirW} h={H_C} box={s.director} />

      {/* The Director directs the team. */}
      <line x1={dirMid} y1={ROW_C + H_C} x2={dirMid} y2={busC} stroke={EDGE} strokeWidth={1.25} />
      <line x1={MIDS[0]} y1={busC} x2={MIDS[2]} y2={busC} stroke={EDGE} strokeWidth={1.25} />
      {MIDS.map((m) => <Arrow key={m} x={m} y1={busC} y2={ROW_D} />)}
      <Label x={dirMid + 8} y={ROW_C + H_C + 14} text={s.directs} />
      {s.rowC.map((box, i) => <BoxShape key={box.name} x={COLS[i]} y={ROW_D} w={W} h={H_D} box={box} />)}

      {/* The team runs the volunteer roles. */}
      <line x1={MIDS[0]} y1={ROW_D + H_D} x2={MIDS[0]} y2={busD} stroke={EDGE} strokeWidth={1.25} />
      <line x1={MIDS[1]} y1={ROW_D + H_D} x2={MIDS[1]} y2={busD} stroke={EDGE} strokeWidth={1.25} />
      <line x1={MIDS[0]} y1={busD} x2={MIDS[2]} y2={busD} stroke={EDGE} strokeWidth={1.25} />
      {MIDS.map((m) => <Arrow key={m} x={m} y1={busD} y2={ROW_E} />)}
      <Label x={MIDS[0] + 8} y={ROW_D + H_D + 14} text={s.runs} />
      {s.rowD.map((box, i) => <BoxShape key={box.name} x={COLS[i]} y={ROW_E} w={W} h={H_E} box={box} />)}

      <rect x={24} y={keyY} width={14} height={14} rx={3} fill={PAID_FILL} stroke={RED} strokeWidth={2} />
      <text x={46} y={keyY + 11} fill="#000">{s.keyPaid}</text>
      <rect x={400} y={keyY} width={14} height={14} rx={3} fill={MIST} stroke={SEA} strokeWidth={2} strokeDasharray="4 3" />
      <text x={422} y={keyY + 11} fill="#000">{s.keyIndependent}</text>
      <rect x={24} y={keyY + 22} width={14} height={14} rx={3} fill={MIST} />
      <text x={46} y={keyY + 33} fill="#000">{s.keyUnpaid}</text>
    </svg>
  );
}
