import test from 'node:test';
import assert from 'node:assert/strict';
import { strFromU8, unzipSync } from 'fflate';
import { buildExport } from '../src/lib/exportData';
import { writeXlsx } from '../src/lib/xlsx';
import { defaultProfile } from '../src/store/defaultProfile';
import { getCourse } from '../src/data/courses';
import { courseHandicap, coursePar, emptyScores } from '../src/lib/scoring';
import { Round } from '../src/types';

const mk = (id: string, courseId: string, tee: string, iso: string, fn: (n: number, par: number) => number | null, lost: Record<number, number> = {}): Round => {
  const c = getCourse(courseId)!;
  const t = c.tees.find((x) => x.id === tee)!;
  return {
    id, courseId, courseName: c.name, teeId: tee, date: iso, handicapIndex: 18.4, completed: true,
    courseHandicap: c.noHandicap ? 0 : courseHandicap(18.4, t, coursePar(c), 'men', c.holes.length),
    holes: emptyScores(c.holes).map((h, i) => ({ ...h, strokes: fn(i + 1, c.holes[i].par), lostBalls: lost[i + 1] ?? 0 })),
  };
};
const rounds = [
  mk('b', 'waldkirch-schwarz', 'back', '2026-09-30T14:40:00', (_, p) => p + 1),
  mk('a', 'waldkirch-schwarz', 'back', '2026-09-30T09:15:00', (_, p) => p + 2, { 4: 1, 9: 2 }),
  mk('c', 'waldkirch-kurzplatz', 'm04', '2026-10-01T08:00:00', () => 3),
  mk('d', 'waldkirch-blau-9', 'back', '2026-10-01T10:00:00', (n, p) => (n <= 4 ? p + 1 : null)),
];
const sheets = buildExport(rounds, { ...defaultProfile, name: 'Anna & <Co>', handicapIndex: 18.4 }, new Date('2026-10-01T12:00:00'));
const sheet = (n: string) => sheets.find((s) => s.name === n)!;

test('Blätter und Zeilenzahlen', () => {
  assert.deepEqual(sheets.map((s) => s.name), ['Runden', 'Löcher', 'Pro Loch', 'Info']);
  assert.equal(sheet('Runden').rows.length, 4);
  assert.equal(sheet('Löcher').rows.length, 18 + 18 + 3 + 9);
  assert.equal(sheet('Pro Loch').rows.length, 18 + 3 + 9);
  for (const s of sheets) for (const r of s.rows) assert.equal(r.length, s.header.length, `${s.name}: Spaltenzahl`);
});

test('Runden: chronologisch, Summen stimmen, «Runde des Tages», komplett ja/nein', () => {
  const rows = sheet('Runden').rows;
  assert.deepEqual(rows.map((r) => r[3]), ['Golfpark Waldkirch – Schwarz (Grün/Rot)', 'Golfpark Waldkirch – Schwarz (Grün/Rot)', 'Golfpark Waldkirch – Kurzplatz (3 Loch)', 'Golfpark Waldkirch – Blau (9 Loch)']);
  assert.deepEqual(rows.map((r) => r[2]), ['1. Runde', '2. Runde', '1. Runde', '2. Runde']);
  assert.deepEqual(rows.map((r) => r[8]), [106, 88, 9, 21]); // Brutto
  assert.deepEqual(rows.map((r) => r[7]), [18, 18, 3, 4]); // Löcher gespielt
  assert.deepEqual(rows.map((r) => r[12]), [3, 0, 0, 0]); // verlorene Bälle
  assert.deepEqual(rows.map((r) => r[13]), ['Ja', 'Ja', 'Ja', 'Nein']);
  assert.equal(rows[2][10], 6); // Kurzplatz: 3 × Par = 2 Punkte je Loch ohne Vorgabe
  assert.equal(rows[0][4], 'Back Tees');
});

test('Löcher: Netto und Stableford pro Loch aus Vorgabeschlägen', () => {
  const h1 = sheet('Löcher').rows[0]; // Runde a, Loch 1: Par 4, Index 7, Platzvorgabe 22 → 1 Vorgabeschlag, 6 Schläge
  assert.equal(h1[3], 1);
  assert.equal(h1[4], 4);
  assert.equal(h1[5], 7);
  assert.equal(h1[6], 358); // Distanz Back Tees
  assert.equal(h1[7], 6);
  assert.equal(h1[8], 1);
  assert.equal(h1[9], 5); // Netto
  assert.equal(h1[10], 1); // Stableford: 2 + 4 − 5
  assert.equal(h1[11], 2); // zu Par
  const unplayed = sheet('Löcher').rows.filter((r) => r[2] === 'Golfpark Waldkirch – Blau (9 Loch)' && r[7] === null);
  assert.equal(unplayed.length, 5); // nicht gespielte Löcher bleiben leer statt 0
  assert.ok(unplayed.every((r) => r[9] === null && r[10] === null));
});

test('Pro Loch: beste und schlechteste Runde je Loch', () => {
  const r = sheet('Pro Loch').rows[0]; // Schwarz Loch 1: 5 (Runde b) und 6 (Runde a)
  assert.equal(r[3], 2);
  assert.equal(r[4], 5);
  assert.equal(r[6], 6);
  assert.deepEqual(r[8], { dec: 5.5 });
});

test('xlsx: gültiges ZIP mit allen Teilen, Sonderzeichen maskiert, Filter und Datumswerte', () => {
  const bytes = writeXlsx(sheets);
  const files = unzipSync(bytes);
  for (const f of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet4.xml'])
    assert.ok(files[f], f);
  const wb = strFromU8(files['xl/workbook.xml']);
  assert.ok(wb.includes('name="Löcher"') && wb.includes('name="Pro Loch"'));
  assert.ok(wb.includes("'Runden'!$A$1:$N$5")); // Filterbereich: 4 Runden + Kopfzeile
  const info = strFromU8(files['xl/worksheets/sheet4.xml']);
  assert.ok(info.includes('Anna &amp; &lt;Co&gt;'));
  const runden = strFromU8(files['xl/worksheets/sheet1.xml']);
  assert.ok(runden.includes('<autoFilter ref="A1:N5"/>'));
  assert.ok(runden.includes('<pane ySplit="1"'));
  assert.ok(runden.includes('<c r="A2" s="2"><v>46295</v></c>')); // 30.09.2026 als Excel-Datum
  assert.ok(runden.includes('<c r="B3" s="3"><v>0.6111111111</v></c>')); // 14:40 exakt
});

import { exportFileName, toBase64 } from '../src/lib/exportFile';

test('Base64 stimmt mit Node überein (alle Restlängen)', () => {
  for (const n of [0, 1, 2, 3, 4, 5, 100, 257]) {
    const b = Uint8Array.from({ length: n }, (_, i) => (i * 37 + 11) % 256);
    assert.equal(toBase64(b), Buffer.from(b).toString('base64'), `Länge ${n}`);
  }
});

test('Dateiname mit Datum', () => {
  assert.equal(exportFileName(new Date(2026, 9, 1)), 'Golfmanager-Statistik-2026-10-01.xlsx');
});
