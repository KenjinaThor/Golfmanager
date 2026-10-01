import test from 'node:test';
import assert from 'node:assert/strict';
import { courseHandicap, strokesReceived, stableford, holeStats, roundLabels } from '../src/lib/scoring';
import { Round } from '../src/types';

test('Platzvorgabe nach WHS', () => {
  // 18.4 × 130/113 + (71.2 − 72) = 20.4 → 20
  assert.equal(courseHandicap(18.4, { id: 'yellow', name: 'Gelb', ratings: { men: { rating: 71.2, slope: 130 } } }, 72), 20);
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

test('Platzvorgabe ohne Rating/Slope: Näherung über Handicap-Index', () => {
  assert.equal(courseHandicap(18.4, { id: 'back', name: 'Back', ratings: {} }, 70), 18);
});

test('Damen-Rating wird verwendet, 9 Löcher nutzen den halben Index', () => {
  const tee = { id: 'back', name: 'Back', ratings: { men: { rating: 35.1, slope: 127 }, ladies: { rating: 38.0, slope: 137 } } };
  assert.equal(courseHandicap(5.0, tee, 35, 'men', 9), 3); // Tabelle Blau Herren B28: 4.3–6.0 → 3
  assert.equal(courseHandicap(10.0, tee, 35, 'ladies', 9), 9);
});

test('Mehrere Runden am selben Tag werden als 1. Runde, 2. Runde … beschriftet', () => {
  const mk = (id: string, date: string): Round => ({
    id, courseId: 'c', courseName: 'C', teeId: 'back', date, handicapIndex: 10, courseHandicap: 10, completed: true, holes: [],
  });
  const labels = roundLabels([
    mk('b', '2026-06-01T14:00:00'), mk('x', '2026-06-02T12:00:00'), mk('a', '2026-06-01T09:00:00'), mk('c', '2026-06-01T17:30:00'),
  ]);
  assert.equal(labels.a, '1. Runde');
  assert.equal(labels.b, '2. Runde');
  assert.equal(labels.c, '3. Runde');
  assert.equal(labels.x, undefined); // einzige Runde dieses Tages
});
