/**
 * Erzeugt src/data/courses.json aus data/courses.csv (1 Zeile pro Loch) und data/tees.csv.
 * Spalten courses.csv: id,name,region,verified,hole,par,index,white,yellow,blue,red
 * Spalten tees.csv:    id,tee,rating,slope
 * Nutzung: npm run import-courses
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Course, Tee } from '../src/types';

const TEE_IDS = ['white', 'yellow', 'blue', 'red'];
const TEE_NAMES: Record<string, string> = { white: 'Weiss', yellow: 'Gelb', blue: 'Blau', red: 'Rot' };

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
  const rt = { rating: +r.rating, slope: +r.slope };
  const tee: Tee = { id: r.tee, name: TEE_NAMES[r.tee], ratings: { men: rt, ladies: rt } };
  courses.get(r.id)?.tees.push(tee);
}
// ---------------------------------------------------------------------------------------------
// Golfpark Waldkirch (offizielle Scorekarten + Rating-Blätter 2026)
//   data/scorecards/waldkirch-loops.csv    Lochdaten der 4 Neunlochplätze
//   data/scorecards/waldkirch-ratings.csv  CR/Slope je Route, Geschlecht und Abschlag (Herren/Damen)
// Routen: 4× 9 Loch, 6 Kombinationen (Loch 1–9 = erster Platz mit Index «vorne», Loch 10–18 = zweiter Platz mit
// Index «hinten»), sowie die zwei Heft-Routen Orange und Schwarz mit eigenem Ablauf und Index.
// ---------------------------------------------------------------------------------------------
{
  const TEES = [
    { id: 'back', name: 'Back Tees' },
    { id: 'backStandard', name: 'Back Standard Tees' },
    { id: 'standard', name: 'Standard Tees' },
    { id: 'frontStandard', name: 'Front Standard Tees' },
  ];
  const LOOP_LABEL: Record<string, string> = { blau: 'Blau', gelb: 'Gelb', rot: 'Rot', gruen: 'Grün' };
  const CODE: Record<string, string> = { b: 'blau', g: 'gelb', gr: 'gruen', r: 'rot' }; // Markerkürzel, z. B. B28, Gr26

  type LoopHole = { par: number; front: number; back: number; dist: Record<number, number> };
  const loops: Record<string, LoopHole[]> = {};
  for (const r of parseCsv('data/scorecards/waldkirch-loops.csv')) {
    (loops[r.loop] ??= [])[+r.hole - 1] ??= { par: +r.par, front: +r.index_front, back: +r.index_back, dist: {} };
    loops[r.loop][+r.hole - 1].dist[+r.tee_row] = +r.distance_m;
  }
  const rowsOf = (loop: string) => Object.keys(loops[loop][0].dist).map(Number).sort((a, b) => b - a); // lang → kurz

  type Rating = { gender: 'men' | 'ladies'; markers: string; rating: number; par: number; slope: number };
  const ratings = new Map<string, Map<string, Rating>>(); // route → tee_name → men/ladies
  const ratingKey = (route: string) => route;
  for (const r of parseCsv('data/scorecards/waldkirch-ratings.csv')) {
    const m = ratings.get(ratingKey(r.route)) ?? new Map<string, Rating>();
    m.set(`${r.tee_name}|${r.gender}`, { gender: r.gender as 'men' | 'ladies', markers: r.markers, rating: +r.course_rating, par: +r.par, slope: +r.slope });
    ratings.set(ratingKey(r.route), m);
  }

  const slug = (label: string) => 'waldkirch-' + label.toLowerCase().replace(/ü/g, 'ue').replace(/[^a-z0-9]+/g, '-');
  const seq = (loop: string, from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => [loop, from + i] as [string, number]);
  const rank9 = (vals: number[]) => vals.map((v) => [...vals].sort((a, b) => a - b).indexOf(v) + 1);

  interface RouteDef {
    label: string; // Schlüssel in waldkirch-ratings.csv
    name: string;
    holes: [string, number][]; // [Platz, Lochnummer im Neunlochplatz]
    index: number[];
    /** liefert pro Abschlag-Position (0..3) und Loch die Distanz */
    dist: (tee: number, holeNo: number, loop: string, n: number, markers: string) => number;
  }
  const byPosition: RouteDef['dist'] = (tee, _h, loop, n) => loops[loop][n - 1].dist[rowsOf(loop)[tee]];
  // Marker wie «R27-Gr28» wählen je Platz die genaue Distanzzeile (Kombinationen)
  const byMarker: RouteDef['dist'] = (_t, holeNo, loop, n, markers) => {
    const row = markers.split('-').map((m) => /^([A-Za-z]+)(\d+)$/.exec(m)!).map(([, c, num]) => [CODE[c.toLowerCase()], +num]).find(([l]) => l === loop);
    return loops[loop][n - 1].dist[row![1] as number];
  };

  const defs: RouteDef[] = [];
  for (const l of Object.keys(loops)) {
    defs.push({
      label: LOOP_LABEL[l], name: `Golfpark Waldkirch – ${LOOP_LABEL[l]} (9 Loch)`, holes: seq(l, 1, 9),
      index: rank9(loops[l].map((h) => h.front)), dist: byMarker,
    });
  }
  for (const [a, b] of [['blau', 'gelb'], ['blau', 'gruen'], ['blau', 'rot'], ['gruen', 'gelb'], ['rot', 'gelb'], ['rot', 'gruen']]) {
    defs.push({
      label: `${LOOP_LABEL[a]}-${LOOP_LABEL[b]}`, name: `Golfpark Waldkirch – ${LOOP_LABEL[a]}/${LOOP_LABEL[b]}`,
      holes: [...seq(a, 1, 9), ...seq(b, 1, 9)],
      index: [...loops[a].map((h) => h.front), ...loops[b].map((h) => h.back)], dist: byMarker,
    });
  }
  defs.push(
    {
      label: 'Schwarz', name: 'Golfpark Waldkirch – Schwarz (Grün/Rot)',
      holes: [...seq('gruen', 1, 9), ...seq('rot', 7, 9), ...seq('rot', 1, 6)],
      index: [7, 9, 11, 3, 15, 5, 13, 1, 17, 2, 18, 8, 6, 16, 4, 14, 10, 12], dist: byPosition,
    },
    {
      label: 'Orange', name: 'Golfpark Waldkirch – Orange (Blau/Gelb)',
      holes: [...seq('blau', 1, 2), ...seq('gelb', 9, 9), ...seq('gelb', 1, 8), ...seq('blau', 3, 9)],
      index: [9, 7, 15, 13, 3, 11, 5, 17, 1, 6, 4, 10, 14, 16, 2, 8, 12, 18], dist: byPosition,
    },
  );

  for (const d of defs) {
    const rt = ratings.get(d.label);
    if (!rt) throw new Error(`Keine Ratings für ${d.label}`);
    const par = d.holes.reduce((sum, [l, n]) => sum + loops[l][n - 1].par, 0);
    const tees: Tee[] = TEES.map((t, k) => {
      const men = rt.get(`${t.name}|men`)!;
      const ladies = rt.get(`${t.name}|ladies`)!;
      for (const x of [men, ladies]) if (x.par !== par) throw new Error(`${d.label}: Par ${par} ≠ Rating-Blatt ${x.par}`);
      return {
        id: t.id, name: t.name, markers: men.markers,
        ratings: { men: { rating: men.rating, slope: men.slope }, ladies: { rating: ladies.rating, slope: ladies.slope } },
      };
    });
    const id = slug(d.label.replace(/^(Blau|Gelb|Grün|Rot)$/, '$1-9'));
    courses.set(id, {
      id, name: d.name, region: 'St. Gallen', verified: true, tees,
      holes: d.holes.map(([loop, n], i) => ({
        number: i + 1,
        par: loops[loop][n - 1].par,
        hcpIndex: d.index[i],
        distances: Object.fromEntries(TEES.map((t, k) => [t.id, d.dist(k, i + 1, loop, n, tees[k].markers!)])),
      })),
    });
  }
}
// Waldkirch Kurzplatz (Übungsplatz): 3 Löcher A–C (Par 9), ohne Rating. Die Karte bietet Platz für zwei Runden.
{
  const rows = parseCsv('data/scorecards/waldkirch-kurzplatz.csv');
  courses.set('waldkirch-kurzplatz', {
    id: 'waldkirch-kurzplatz',
    name: 'Golfpark Waldkirch – Kurzplatz (3 Loch)',
    region: 'St. Gallen',
    verified: true,
    noHandicap: true,
    tees: [
      { id: 'm04', name: 'Marker 04', markers: '04', ratings: {} },
      { id: 'm03', name: 'Marker 03', markers: '03', ratings: {} },
    ],
    holes: rows.map((r) => ({ number: +r.hole, par: +r.par, hcpIndex: +r.index, distances: { m04: +r.dist_m04, m03: +r.dist_m03 } })),
  });
}
for (const c of courses.values()) {
  c.holes.sort((a, b) => a.number - b.number);
  const idx = c.holes.map((h) => h.hcpIndex).sort((a, b) => a - b).join();
  if (idx !== Array.from({ length: c.holes.length }, (_, i) => i + 1).join())
    throw new Error(`${c.id}: Stroke Index nicht 1..${c.holes.length} eindeutig`);
}
writeFileSync('src/data/courses.json', JSON.stringify([...courses.values()], null, 1) + '\n');
console.log(`${courses.size} Plätze geschrieben`);
