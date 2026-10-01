import test from 'node:test';
import assert from 'node:assert/strict';
import { courseHandicap, strokesReceived, stableford, holeStats } from '../src/lib/scoring';
import { Round } from '../src/types';

test('Platzvorgabe nach WHS', () => {
  // 18.4 × 130/113 + (71.2 − 72) = 20.4 → 20
  assert.equal(courseHandicap(18.4, { id: 'yellow', name: 'Gelb', rating: 71.2, slope: 130 }, 72), 20);
});

test('Vorgabeschläge werden nach Stroke Index verteilt', () => {
  assert.equal(strokesReceived(20, 1), 2);
  assert.equal(strokesReceived(20, 2), 2);
  assert.equal(strokesReceived(20, 3), 1);
  assert.equal(strokesReceived(0, 1), 0);
  assert.equal(strokesReceived(-2, 18), -1);
  assert.equal(strokesReceived(-2, 1), 0);
});

test('Stableford', () => {
  assert.equal(stableford(5, 4, 1), 2); // Netto-Par
  assert.equal(stableford(8, 4, 0), 0);
  assert.equal(stableford(null, 4, 1), 0);
});

test('Beste/schlechteste Runde pro Loch mit Datum', () => {
  const mk = (id: string, date: string, s: number): Round => ({
    id, courseId: 'c', courseName: 'C', teeId: 'yellow', date, handicapIndex: 10,
    courseHandicap: 10, completed: true, holes: [{ number: 1, strokes: s, lostBalls: 1 }],
  });
  const st = holeStats([mk('a', '2026-05-01', 4), mk('b', '2026-06-01', 7)], 'c', 1)[0];
  assert.equal(st.best?.strokes, 4);
  assert.equal(st.best?.date, '2026-05-01');
  assert.equal(st.worst?.strokes, 7);
  assert.equal(st.lostBalls, 2);
  assert.equal(st.average, 5.5);
});
