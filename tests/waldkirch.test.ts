import test from 'node:test';
import assert from 'node:assert/strict';
import raw from '../src/data/courses.json';
import { Course } from '../src/types';

const courses = raw as Course[];
const get = (id: string) => courses.find((c) => c.id === id)!;
const tees = ['back', 'backStandard', 'standard', 'frontStandard'] as const;
const sum = (c: Course, t: (typeof tees)[number], a: number, b: number) =>
  c.holes.slice(a, b).reduce((s, h) => s + (h.distances[t] ?? 0), 0);

// Totale laut offizieller Scorekarte «Platz Orange» / «Platz Schwarz» (OUT / IN / TOT je Abschlag)
const CARDS: Record<string, { out: number[]; inn: number[]; par: number[]; index: number[] }> = {
  'waldkirch-orange': {
    out: [3208, 3088, 2862, 2756], inn: [2627, 2495, 2315, 2201], par: [37, 34],
    index: [9, 7, 15, 13, 3, 11, 5, 17, 1, 6, 4, 10, 14, 16, 2, 8, 12, 18],
  },
  'waldkirch-schwarz': {
    out: [2792, 2646, 2431, 2338], inn: [2812, 2677, 2488, 2368], par: [35, 35],
    index: [7, 9, 11, 3, 15, 5, 13, 1, 17, 2, 18, 8, 6, 16, 4, 14, 10, 12],
  },
};

for (const [id, card] of Object.entries(CARDS)) {
  test(`${id} stimmt mit der Scorekarte überein`, () => {
    const c = get(id);
    tees.forEach((t, i) => {
      assert.equal(sum(c, t, 0, 9), card.out[i], `OUT ${t}`);
      assert.equal(sum(c, t, 9, 18), card.inn[i], `IN ${t}`);
    });
    assert.equal(c.holes.slice(0, 9).reduce((s, h) => s + h.par, 0), card.par[0]);
    assert.equal(c.holes.slice(9).reduce((s, h) => s + h.par, 0), card.par[1]);
    assert.deepEqual(c.holes.map((h) => h.hcpIndex), card.index);
  });
}

test('alle Waldkirch-Plätze haben Stroke Index 1..n genau einmal', () => {
  for (const c of courses.filter((x) => x.id.startsWith('waldkirch'))) {
    assert.deepEqual(c.holes.map((h) => h.hcpIndex).sort((a, b) => a - b), Array.from({ length: c.holes.length }, (_, i) => i + 1), c.id);
  }
});

test('Waldkirch: 12 Routen mit Rating, Par wie auf den Rating-Blättern', () => {
  const pars: Record<string, number> = {
    'waldkirch-blau-9': 35, 'waldkirch-gelb-9': 36, 'waldkirch-rot-9': 35, 'waldkirch-gruen-9': 35,
    'waldkirch-blau-gelb': 71, 'waldkirch-blau-gruen': 70, 'waldkirch-blau-rot': 70,
    'waldkirch-gruen-gelb': 71, 'waldkirch-rot-gelb': 71, 'waldkirch-rot-gruen': 70,
    'waldkirch-schwarz': 70, 'waldkirch-orange': 71,
  };
  for (const [id, par] of Object.entries(pars)) {
    const c = get(id);
    assert.equal(c.holes.reduce((s, h) => s + h.par, 0), par, id);
    for (const t of c.tees) assert.ok(t.ratings.men && t.ratings.ladies, `${id} ${t.id}`);
  }
});

test('Waldkirch: Ratings aus den Blättern (Stichproben)', () => {
  assert.deepEqual(get('waldkirch-blau-9').tees[0].ratings.men, { rating: 35.1, slope: 127 });
  assert.deepEqual(get('waldkirch-rot-gruen').tees[1].ratings.ladies, { rating: 75.0, slope: 135 });
  assert.deepEqual(get('waldkirch-orange').tees[3].ratings.men, { rating: 66.7, slope: 123 });
  assert.equal(get('waldkirch-schwarz').tees[0].markers, '56');
});

test('Waldkirch: Marker wählt die Distanzzeile je Platz (Rot-Grün, Back Standard = R27-Gr28)', () => {
  const c = get('waldkirch-rot-gruen');
  assert.equal(c.tees[1].markers, 'R27-Gr28');
  assert.equal(c.holes[0].distances.backStandard, 414); // Rot 1, Zeile 27
  assert.equal(c.holes[9].distances.backStandard, 358); // Grün 1, Zeile 28 (nicht 338)
});

test('Waldkirch: 9-Loch-Plätze haben Stroke Index 1–9', () => {
  const c = get('waldkirch-blau-9');
  assert.deepEqual(c.holes.map((h) => h.hcpIndex), [3, 2, 5, 7, 8, 1, 4, 6, 9]); // wie im Heft
});

test('Waldkirch Kurzplatz: 3 Löcher, Par 9, Distanz-Totale wie auf der Karte, keine Platzvorgabe', () => {
  const c = get('waldkirch-kurzplatz');
  assert.equal(c.holes.length, 3);
  assert.equal(c.holes.reduce((s, h) => s + h.par, 0), 9);
  assert.equal(c.holes.reduce((s, h) => s + h.distances.m04, 0), 379);
  assert.equal(c.holes.reduce((s, h) => s + h.distances.m03, 0), 349);
  assert.deepEqual(c.holes.map((h) => h.hcpIndex), [3, 2, 1]);
  assert.equal(c.noHandicap, true);
});

test('Es sind nur Waldkirch-Plätze freigeschaltet', () => {
  assert.equal(courses.length, 13);
  assert.ok(courses.every((c) => c.id.startsWith('waldkirch') && c.verified));
});
