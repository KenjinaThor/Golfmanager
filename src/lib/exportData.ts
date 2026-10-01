import { getCourse } from '../data/courses';
import { HoleStat, holeStats, roundLabels, roundTotals, stableford, strokesReceived } from './scoring';
import { Profile, Round } from '../types';

/** Zelle einer Tabelle; Datum und Uhrzeit sind echte Excel-Werte (damit sich filtern und sortieren lässt). */
export type Cell = string | number | null | { date: Date } | { time: Date } | { dec: number };

export interface Sheet {
  name: string;
  header: string[];
  rows: Cell[][];
  /** Spaltenbreiten in Zeichen */
  widths: number[];
}

const yn = (b: boolean) => (b ? 'Ja' : 'Nein');
const sorted = (rounds: Round[]) => [...rounds].sort((a, b) => a.date.localeCompare(b.date));

/**
 * Blätter für den Excel-Export, bewusst als saubere Tabellen (eine Zeile pro Eintrag, eine Kopfzeile),
 * damit Filter, Pivot-Tabellen und Formeln direkt funktionieren.
 */
export function buildExport(rounds: Round[], profile: Profile, now = new Date()): Sheet[] {
  const labels = roundLabels(rounds);
  const ordered = sorted(rounds);
  const num = (n: number) => n;

  // --- Runden: eine Zeile pro Runde
  const roundRows: Cell[][] = ordered.map((r) => {
    const course = getCourse(r.courseId);
    const t = roundTotals(r, course?.holes ?? []);
    const d = new Date(r.date);
    return [
      { date: d },
      { time: d },
      labels[r.id] ?? '',
      r.courseName,
      course?.tees.find((x) => x.id === r.teeId)?.name ?? r.teeId,
      { dec: r.handicapIndex },
      r.courseHandicap,
      t.played,
      t.played ? t.gross : null,
      t.played ? t.net : null,
      t.stableford,
      t.played ? t.toPar : null,
      t.lostBalls,
      yn(!!course && t.played === course.holes.length),
    ];
  });

  // --- Löcher: eine Zeile pro gespieltem Loch und Runde
  const holeRows: Cell[][] = [];
  for (const r of ordered) {
    const course = getCourse(r.courseId);
    if (!course) continue;
    const d = new Date(r.date);
    for (const hs of r.holes) {
      const h = course.holes.find((x) => x.number === hs.number);
      if (!h) continue;
      const rec = strokesReceived(r.courseHandicap, h.hcpIndex, course.holes.length);
      const played = hs.strokes != null;
      holeRows.push([
        { date: d },
        labels[r.id] ?? '',
        r.courseName,
        h.number,
        h.par,
        h.hcpIndex,
        h.distances[r.teeId] ?? null,
        hs.strokes,
        rec,
        played ? hs.strokes! - rec : null,
        played ? stableford(hs.strokes, h.par, rec) : null,
        played ? hs.strokes! - h.par : null,
        hs.lostBalls,
      ]);
    }
  }

  // --- Pro Loch: Bestwerte je Platz (wie im Reiter «Statistik»)
  const bestRows: Cell[][] = [];
  const courseIds = [...new Set(ordered.map((r) => r.courseId))];
  for (const id of courseIds) {
    const course = getCourse(id);
    if (!course) continue;
    const stats: HoleStat[] = holeStats(rounds, id, course.holes.length);
    for (const s of stats) {
      const h = course.holes[s.number - 1];
      bestRows.push([
        course.name,
        s.number,
        h.par,
        s.plays,
        s.best ? s.best.strokes : null,
        s.best ? { date: new Date(s.best.date) } : null,
        s.worst ? s.worst.strokes : null,
        s.worst ? { date: new Date(s.worst.date) } : null,
        s.average != null ? { dec: Math.round(s.average * 100) / 100 } : null,
        s.lostBalls,
      ]);
    }
  }

  const info: Cell[][] = [
    ['Spieler', profile.name || profile.username || ''],
    ['Handicap-Index (aktuell)', { dec: profile.handicapIndex }],
    ['Anzahl Runden', num(rounds.length)],
    ['Exportiert am', { date: now }],
    ['Hinweis', 'Blatt «Runden»: eine Zeile pro Runde. Blatt «Löcher»: eine Zeile pro Loch und Runde (für Pivot-Tabellen). Blatt «Pro Loch»: beste und schlechteste Runde je Loch.'],
  ];

  return [
    {
      name: 'Runden',
      header: ['Datum', 'Uhrzeit', 'Runde des Tages', 'Platz', 'Abschlag', 'Handicap-Index', 'Platzvorgabe', 'Löcher gespielt', 'Brutto', 'Netto', 'Stableford', 'Brutto zu Par', 'Verlorene Bälle', 'Komplett'],
      rows: roundRows,
      widths: [12, 8, 14, 42, 22, 15, 13, 14, 8, 8, 11, 13, 15, 10],
    },
    {
      name: 'Löcher',
      header: ['Datum', 'Runde des Tages', 'Platz', 'Loch', 'Par', 'Stroke Index', 'Distanz (m)', 'Schläge', 'Vorgabeschläge', 'Netto', 'Stableford', 'Zu Par', 'Verlorene Bälle'],
      rows: holeRows,
      widths: [12, 14, 42, 6, 6, 12, 12, 9, 15, 8, 11, 8, 15],
    },
    {
      name: 'Pro Loch',
      header: ['Platz', 'Loch', 'Par', 'Gespielt', 'Beste Schläge', 'Datum beste', 'Schlechteste Schläge', 'Datum schlechteste', 'Durchschnitt', 'Verlorene Bälle'],
      rows: bestRows,
      widths: [42, 6, 6, 10, 14, 13, 20, 18, 13, 15],
    },
    { name: 'Info', header: ['Angabe', 'Wert'], rows: info, widths: [28, 90] },
  ];
}
