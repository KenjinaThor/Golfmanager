import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { Course } from '../src/types';

const courses = JSON.parse(readFileSync('src/data/courses.json', 'utf8')) as Course[];

test('jedes referenzierte Lochbild existiert als Datei und ist in holeImages.ts eingebunden', () => {
  const index = readFileSync('src/data/holeImages.ts', 'utf8');
  for (const c of courses)
    for (const h of c.holes.filter((x) => x.image)) {
      assert.ok(existsSync(`assets/holes/${h.image}.webp`), `${c.id} Loch ${h.number}: Datei fehlt`);
      assert.ok(index.includes(`'${h.image}'`), `${h.image} fehlt in holeImages.ts`);
    }
  assert.ok(index.includes("'uebersicht'") && index.includes("'legende'"));
});

test('Bekannte Lücke: nur Rot 9 hat noch kein Bild; alle anderen Waldkirch-Löcher haben eines', () => {
  const missing = new Set<string>();
  for (const c of courses.filter((x) => x.id.startsWith('waldkirch') && x.id !== 'waldkirch-kurzplatz'))
    for (const h of c.holes.filter((x) => !x.image)) missing.add(`${c.id}#${h.number}`);
  // Rot Loch 9 steckt in diesen Routen an Loch 9 bzw. 18 bzw. 12
  for (const m of missing) {
    const [id, no] = m.split('#');
    const c = courses.find((x) => x.id === id)!;
    const hole = c.holes[+no - 1];
    assert.ok(/rot|schwarz/.test(id), `${m}: ohne Bild, aber kein Rot-Platz`);
    assert.equal(hole.par, 5, `${m}: Rot 9 ist ein Par 5`);
  }
  assert.ok(courses.find((x) => x.id === 'waldkirch-blau-9')!.holes.every((h) => h.image));
  assert.equal(courses.find((x) => x.id === 'waldkirch-orange')!.overview, 'uebersicht');
});
