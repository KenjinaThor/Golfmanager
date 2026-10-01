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

test('Alle Löcher aller Waldkirch-Routen (ausser Kurzplatz) haben ein Lochbild und eine Platzübersicht', () => {
  for (const c of courses.filter((x) => x.id.startsWith('waldkirch') && x.id !== 'waldkirch-kurzplatz')) {
    assert.ok(c.holes.every((h) => h.image), `${c.id}: Loch ohne Bild`);
    assert.equal(c.overview, 'uebersicht', c.id);
  }
});
