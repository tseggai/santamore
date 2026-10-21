/**
 * The organisation at a glance: who elects whom, who runs what, who is paid.
 * One SVG, Montenegrin or English, drawn from the statute drafts and the
 * team guide (docs/legal/governance/organisation-and-roles.*.md describes
 * the same structure in words). Head counts are planning figures.
 */
export type OrgChartLang = "me" | "en";

interface Box {
  name: string;
  lines: string[];
  paid?: boolean;
}

interface Strings {
  title: string;
  assembly: Box;
  rowB: [Box, Box, Box];
  rowC: [Box, Box, Box];
  rowD: [Box, Box, Box];
  keyPaid: string;
  keyUnpaid: string;
}

const STRINGS: Record<OrgChartLang, Strings> = {
  en: {
    title: "The Assembly elects, the Board governs, the Director runs, the Committee grants",
    assembly: { name: "Assembly · all members, one vote each", lines: ["At least once a year · elects the bodies and amends the statute · a tie: the President's vote decides · unpaid"] },
    rowB: [
      { name: "Board · 5–7 people", lines: ["4 meetings a year", "Strategy, budget, staffing, pay", "A tie: the President's vote", "Unpaid"] },
      { name: "Grants Committee · 3–5", lines: ["4 sittings a year", "Decides who receives funds", "Final; no founders or staff", "Unpaid"] },
      { name: "Executive Director · 1", lines: ["Founder, 5-year term, renewable", "Decides everything not reserved", "Removed only by 2/3 of members", "Paid once the fund exists"], paid: true },
    ],
    rowC: [
      { name: "Team leads · about 5", lines: ["4–6 hours a month", "One function each", "Report to the Director", "Unpaid"] },
      { name: "Chapter team · 3 per town", lines: ["Lead, treasurer, coordinator", "Appointed by the Board, 2 years", "Report to the Director", "Unpaid, lead part-paid later"] },
      { name: "Staff · 0 now, 1–2 by 2027", lines: ["Hired by the Board", "Pay set by independent members", "Report to the Director", "Paid from sponsorship"], paid: true },
    ],
    rowD: [
      { name: "Event volunteers · about 40", lines: ["1 day, briefed the week before", "Unpaid"] },
      { name: "Fundraisers · about 20", lines: ["About 3 hours in total", "Unpaid"] },
      { name: "Club connectors · a few", lines: ["A few calls, stay on the thread", "Unpaid"] },
    ],
    keyPaid: "Paid from sponsorship and grants, never from donations",
    keyUnpaid: "Unpaid · head counts are planning targets",
  },
  me: {
    title: "Skupština bira, Upravni odbor upravlja, direktor vodi, Komisija dodjeljuje",
    assembly: { name: "Skupština · svi članovi, po jedan glas", lines: ["Najmanje jednom godišnje · bira organe i mijenja statut · neriješeno: odlučuje glas Predsjednika · neplaćeno"] },
    rowB: [
      { name: "Upravni odbor · 5–7", lines: ["4 sjednice godišnje", "Strategija, budžet, zarade", "Neriješeno: glas predsjednika", "Neplaćeno"] },
      { name: "Komisija za sredstva · 3–5", lines: ["4 sjednice godišnje", "Odlučuje ko dobija sredstva", "Konačno; bez osnivača i osoblja", "Neplaćeno"] },
      { name: "Izvršni direktor · 1", lines: ["Osnivač, mandat 5 g., ponovljiv", "Odlučuje o svemu nerezervisanom", "Razrješenje samo sa 2/3 članova", "Plaćeno kad fond postoji"], paid: true },
    ],
    rowC: [
      { name: "Rukovodioci timova · oko 5", lines: ["4–6 sati mjesečno", "Po jedna funkcija", "Odgovaraju direktoru", "Neplaćeno"] },
      { name: "Tim ogranka · 3 po gradu", lines: ["Rukovodilac, blagajnik, koord.", "Imenuje Upravni odbor, 2 g.", "Odgovaraju direktoru", "Neplaćeno, kasnije dijelom"] },
      { name: "Osoblje · 0 sada, 1–2 do 2027.", lines: ["Zapošljava Upravni odbor", "Zaradu utvrđuju nezavisni", "Odgovaraju direktoru", "Plaćeno iz sponzorstava"], paid: true },
    ],
    rowD: [
      { name: "Volonteri događaja · oko 40", lines: ["1 dan, brifing sedmicu prije", "Neplaćeno"] },
      { name: "Prikupljači · oko 20", lines: ["Oko 3 sata ukupno", "Neplaćeno"] },
      { name: "Veze sa klubovima · nekoliko", lines: ["Nekoliko poziva", "Neplaćeno"] },
    ],
    keyPaid: "Plaćeno iz sponzorstava i grantova, nikad iz donacija",
    keyUnpaid: "Neplaćeno · brojevi su planski ciljevi",
  },
};

const W = 226;
const COLS = [24, 267, 510];
const MIDS = [137, 380, 623];
const ROW_A = 40;
const ROW_B = 124;
const ROW_C = 258;
const ROW_D = 392;
const H_B = 104;
const H_D = 72;
const EDGE = "#9AA7AD";
const RED = "#F35353";
const PAID_FILL = "#FDE4E4";
const MIST = "#F1F5F6";
const QUIET = "rgba(0,0,0,0.62)";

function BoxShape({ x, y, w, h, box }: { x: number; y: number; w: number; h: number; box: Box }) {
  const last = box.lines.length - 1;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={box.paid ? PAID_FILL : MIST} stroke={box.paid ? RED : "none"} strokeWidth={box.paid ? 2 : 0} />
      <text x={x + 12} y={y + 24} fontSize={13.5} fontWeight={700} fill="#000">{box.name}</text>
      {box.lines.map((line, i) => (
        <text key={i} x={x + 12} y={y + 41 + i * 16} fontSize={12} fill={i === last ? "#000" : QUIET} fontWeight={i === last ? 700 : 400}>{line}</text>
      ))}
    </g>
  );
}

function Down({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  return <line x1={x} y1={y1} x2={x} y2={y2} stroke={EDGE} strokeWidth={1.25} markerEnd="url(#org-chart-arrow)" />;
}

export function OrgChart({ lang, className = "" }: { lang: OrgChartLang; className?: string }) {
  const s = STRINGS[lang];
  const busB = ROW_B + H_B + 16;
  const busC = ROW_C + H_B + 16;
  const keyY = ROW_D + H_D + 22;
  return (
    <svg viewBox="0 0 760 508" role="img" aria-label={s.title} className={`block h-auto w-full ${className}`} fontSize={12}>
      <defs>
        <marker id="org-chart-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill={EDGE} />
        </marker>
      </defs>
      <text x={24} y={22} fontSize={15} fontWeight={700} fill="#000">{s.title}</text>
      <BoxShape x={24} y={ROW_A} w={712} h={56} box={s.assembly} />
      {MIDS.map((m) => <Down key={m} x={m} y1={ROW_A + 56} y2={ROW_B} />)}
      {s.rowB.map((box, i) => <BoxShape key={box.name} x={COLS[i]} y={ROW_B} w={W} h={H_B} box={box} />)}
      <line x1={MIDS[2]} y1={ROW_B + H_B} x2={MIDS[2]} y2={busB} stroke={EDGE} strokeWidth={1.25} />
      <line x1={MIDS[0]} y1={busB} x2={MIDS[2]} y2={busB} stroke={EDGE} strokeWidth={1.25} />
      {MIDS.map((m) => <Down key={m} x={m} y1={busB} y2={ROW_C} />)}
      {s.rowC.map((box, i) => <BoxShape key={box.name} x={COLS[i]} y={ROW_C} w={W} h={H_B} box={box} />)}
      <line x1={MIDS[0]} y1={ROW_C + H_B} x2={MIDS[0]} y2={busC} stroke={EDGE} strokeWidth={1.25} />
      <line x1={MIDS[1]} y1={ROW_C + H_B} x2={MIDS[1]} y2={busC} stroke={EDGE} strokeWidth={1.25} />
      <line x1={MIDS[0]} y1={busC} x2={MIDS[2]} y2={busC} stroke={EDGE} strokeWidth={1.25} />
      {MIDS.map((m) => <Down key={m} x={m} y1={busC} y2={ROW_D} />)}
      {s.rowD.map((box, i) => <BoxShape key={box.name} x={COLS[i]} y={ROW_D} w={W} h={H_D} box={box} />)}
      <rect x={24} y={keyY} width={14} height={14} rx={3} fill={PAID_FILL} stroke={RED} strokeWidth={2} />
      <text x={46} y={keyY + 11} fill="#000">{s.keyPaid}</text>
      <rect x={400} y={keyY} width={14} height={14} rx={3} fill={MIST} />
      <text x={422} y={keyY + 11} fill="#000">{s.keyUnpaid}</text>
    </svg>
  );
}
