/**
 * Erzeugt src/data/courses.json aus data/courses.csv (1 Zeile pro Loch) und data/tees.csv.
 * Spalten courses.csv: id,name,region,verified,hole,par,index,white,yellow,blue,red
 * Spalten tees.csv:    id,tee,rating,slope
 * Nutzung: npm run import-courses
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Course, Tee, TeeId } from '../src/types';

const TEE_IDS: TeeId[] = ['white', 'yellow', 'blue', 'red'];
const TEE_NAMES: Record<TeeId, string> = { white: 'Weiss', yellow: 'Gelb', blue: 'Blau', red: 'Rot' };

function parseCsv(path: string): Record<string, string>[] {
  const [head, ...lines] = readFileSync(path, 'utf8').trim().split(/\r?\n/);
  const cols = head.split(',');
  return lines.map((l) => {
    const cells = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.slice(0, cols.length).map((c) =>
      c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
    return Object.fromEntries(cols.map((c, i) => [c, cells[i] ?? '']));
  });
}

const courses = new Map<string, Course>();
for (const r of parseCsv('data/courses.csv')) {
  let c = courses.get(r.id);
  if (!c) {
    c = { id: r.id, name: r.name, region: r.region, verified: r.verified === 'true', tees: [], holes: [] };
    courses.set(r.id, c);
  }
  c.holes.push({
    number: +r.hole,
    par: +r.par,
    hcpIndex: +r.index,
    distances: Object.fromEntries(TEE_IDS.filter((t) => r[t]).map((t) => [t, +r[t]])),
  });
}
for (const r of parseCsv('data/tees.csv')) {
  const tee: Tee = { id: r.tee as TeeId, name: TEE_NAMES[r.tee as TeeId], rating: +r.rating, slope: +r.slope };
  courses.get(r.id)?.tees.push(tee);
}
// Waldkirch: 4 Neunlochplätze, je 2 (geordnet) zu einer 18-Loch-Runde kombinierbar.
// Loch 1–9 = erster Platz mit index_front, Loch 10–18 = zweiter Platz mit index_back (Kartenspalte «1/10»).
// Zeilenreihenfolge der Abschläge = Weiss, Gelb, Blau, Rot (längste → kürzeste Zeile; deckt sich mit Golfpass-Totalen).
// Course Rating/Slope sind für die Kombinationen nicht bekannt → null.
{
  const WALDKIRCH_TEES: TeeId[] = ['white', 'yellow', 'blue', 'red'];
  const LOOP_NAMES: Record<string, string> = { blau: 'Blau', gelb: 'Gelb', rot: 'Rot', gruen: 'Grün' };
  type Row = { par: number; front: number; back: number; dist: Record<number, number[]> };
  const loops: Record<string, Row[]> = {};
  for (const r of parseCsv('data/scorecards/waldkirch-loops.csv')) {
    const hole = (loops[r.loop] ??= [])[+r.hole - 1] ??= { par: +r.par, front: +r.index_front, back: +r.index_back, dist: {} };
    (hole.dist[+r.tee_row] ??= []).push(+r.distance_m);
  }
  const teeRowsOf = (loop: string) => Object.keys(loops[loop][0].dist).map(Number).sort((a, b) => b - a);
  // Offizielle 18-Loch-Routen laut Heft «Waldkirch» (Strokesaver): Ablauf und Stroke Index je Loch.
  // Schwarz: Grün 1–9, dann Rot 7,8,9,1–6 (Index = Kartenwerte). Orange: Blau 1–2, Gelb 9, Gelb 1–8, Blau 3–9
  // (eigener Index, weicht bei Blau 1/2 und Gelb 7/8 von der Karte ab).
  const seq = (loop: string, from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => [loop, from + i] as [string, number]);
  const ROUTES = [
    {
      id: 'waldkirch-schwarz', name: 'Golfpark Waldkirch – Schwarz (Grün/Rot)',
      holes: [...seq('gruen', 1, 9), ...seq('rot', 7, 9), ...seq('rot', 1, 6)],
      index: [7, 9, 11, 3, 15, 5, 13, 1, 17, 2, 18, 8, 6, 16, 4, 14, 10, 12],
    },
    {
      id: 'waldkirch-orange', name: 'Golfpark Waldkirch – Orange (Blau/Gelb)',
      holes: [...seq('blau', 1, 2), ...seq('gelb', 9, 9), ...seq('gelb', 1, 8), ...seq('blau', 3, 9)],
      index: [9, 7, 15, 13, 3, 11, 5, 17, 1, 6, 4, 10, 14, 16, 2, 8, 12, 18],
    },
  ];
  for (const r of ROUTES) {
    courses.set(r.id, {
      id: r.id,
      name: r.name,
      region: 'St. Gallen',
      verified: true,
      tees: WALDKIRCH_TEES.map((t) => ({ id: t, name: TEE_NAMES[t], rating: null, slope: null })),
      holes: r.holes.map(([loop, n], i) => ({
        number: i + 1,
        par: loops[loop][n - 1].par,
        hcpIndex: r.index[i],
        distances: Object.fromEntries(WALDKIRCH_TEES.map((t, k) => [t, loops[loop][n - 1].dist[teeRowsOf(loop)[k]][0]])),
      })),
    });
  }
  for (const a of Object.keys(loops)) for (const b of Object.keys(loops)) {
    if (a === b) continue;
    const id = `waldkirch-${a}-${b}`;
    const holes = [...loops[a].map((h, i) => ({ h, i, front: true, loop: a })), ...loops[b].map((h, i) => ({ h, i, front: false, loop: b }))];
    courses.set(id, {
      id,
      name: `Golfpark Waldkirch – ${LOOP_NAMES[a]}/${LOOP_NAMES[b]}`,
      region: 'St. Gallen',
      verified: true,
      tees: WALDKIRCH_TEES.map((t) => ({ id: t, name: TEE_NAMES[t], rating: null, slope: null })),
      holes: holes.map(({ h, i, front, loop }, n) => ({
        number: n + 1,
        par: h.par,
        hcpIndex: front ? h.front : h.back,
        distances: Object.fromEntries(WALDKIRCH_TEES.map((t, k) => [t, h.dist[teeRowsOf(loop)[k]][0]])),
      })),
    });
  }
}
for (const c of courses.values()) {
  c.holes.sort((a, b) => a.number - b.number);
  const idx = c.holes.map((h) => h.hcpIndex).sort((a, b) => a - b).join();
  if (idx !== Array.from({ length: c.holes.length }, (_, i) => i + 1).join())
    throw new Error(`${c.id}: Stroke Index nicht 1..${c.holes.length} eindeutig`);
}
writeFileSync('src/data/courses.json', JSON.stringify([...courses.values()], null, 1) + '\n');
console.log(`${courses.size} Plätze geschrieben`);
