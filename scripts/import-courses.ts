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
for (const c of courses.values()) {
  c.holes.sort((a, b) => a.number - b.number);
  const idx = c.holes.map((h) => h.hcpIndex).sort((a, b) => a - b).join();
  if (idx !== Array.from({ length: c.holes.length }, (_, i) => i + 1).join())
    throw new Error(`${c.id}: Stroke Index nicht 1..${c.holes.length} eindeutig`);
}
writeFileSync('src/data/courses.json', JSON.stringify([...courses.values()], null, 1) + '\n');
console.log(`${courses.size} Plätze geschrieben`);
