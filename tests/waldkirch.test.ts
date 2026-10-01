import test from 'node:test';
import assert from 'node:assert/strict';
import raw from '../src/data/courses.json';
import { Course } from '../src/types';

const courses = raw as Course[];
const get = (id: string) => courses.find((c) => c.id === id)!;
const tees = ['white', 'yellow', 'blue', 'red'] as const;
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

test('alle Waldkirch-Plätze haben Stroke Index 1–18 genau einmal', () => {
  for (const c of courses.filter((x) => x.id.startsWith('waldkirch'))) {
    assert.deepEqual(c.holes.map((h) => h.hcpIndex).sort((a, b) => a - b), Array.from({ length: 18 }, (_, i) => i + 1), c.id);
  }
});
