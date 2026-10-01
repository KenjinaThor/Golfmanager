import { Course, Gender, Hole, HoleScore, Round, Tee } from '../types';

export const coursePar = (c: Pick<Course, 'holes'>) => c.holes.reduce((s, h) => s + h.par, 0);

/**
 * WHS: Platzvorgabe = HCP-Index × Slope/113 + (Course Rating − Par).
 * Bei 9 Löchern gilt der halbe Handicap-Index (so auch in den Waldkirch-Tabellen).
 * Ohne Rating/Slope: Näherung über den Handicap-Index.
 */
export function courseHandicap(handicapIndex: number, tee: Tee, par: number, gender: Gender = 'men', holeCount = 18): number {
  const hi = holeCount === 9 ? handicapIndex / 2 : handicapIndex;
  const r = tee.ratings[gender] ?? tee.ratings.men;
  if (!r) return Math.round(hi);
  return Math.round(hi * (r.slope / 113) + (r.rating - par));
}

export const teeRating = (tee: Tee, gender: Gender) => tee.ratings[gender] ?? tee.ratings.men ?? null;

/** Vorgabeschläge auf einem Loch (auch Plus-Handicaps: negative Werte). */
export function strokesReceived(ch: number, hcpIndex: number, holeCount = 18): number {
  if (ch >= 0) {
    const base = Math.floor(ch / holeCount);
    return base + (hcpIndex <= ch % holeCount ? 1 : 0);
  }
  return hcpIndex > holeCount + ch ? -1 : 0;
}

export const netStrokes = (strokes: number, received: number) => strokes - received;

export const stableford = (strokes: number | null, par: number, received: number) =>
  strokes == null ? 0 : Math.max(0, 2 + par - (strokes - received));

export interface RoundTotals {
  played: number;
  gross: number;
  net: number;
  stableford: number;
  toPar: number; // brutto relativ zum Par der gespielten Löcher
  lostBalls: number;
}

export function roundTotals(round: Round, holes: Hole[]): RoundTotals {
  const t: RoundTotals = { played: 0, gross: 0, net: 0, stableford: 0, toPar: 0, lostBalls: 0 };
  for (const hs of round.holes) {
    t.lostBalls += hs.lostBalls;
    const hole = holes.find((h) => h.number === hs.number);
    if (!hole || hs.strokes == null) continue;
    const rec = strokesReceived(round.courseHandicap, hole.hcpIndex, holes.length);
    t.played++;
    t.gross += hs.strokes;
    t.net += hs.strokes - rec;
    t.toPar += hs.strokes - hole.par;
    t.stableford += stableford(hs.strokes, hole.par, rec);
  }
  return t;
}

export interface HoleExtreme {
  strokes: number;
  date: string;
  roundId: string;
}
export interface HoleStat {
  number: number;
  best?: HoleExtreme;
  worst?: HoleExtreme;
  average?: number;
  lostBalls: number;
  plays: number;
}

/** Beste/schlechteste Runde pro Loch eines Platzes inkl. Datum. */
export function holeStats(rounds: Round[], courseId: string, holeCount = 18): HoleStat[] {
  const stats: HoleStat[] = Array.from({ length: holeCount }, (_, i) => ({
    number: i + 1,
    lostBalls: 0,
    plays: 0,
  }));
  const sums = new Array(holeCount).fill(0);
  for (const r of rounds) {
    if (r.courseId !== courseId) continue;
    for (const hs of r.holes) {
      const s = stats[hs.number - 1];
      if (!s) continue;
      s.lostBalls += hs.lostBalls;
      if (hs.strokes == null) continue;
      s.plays++;
      sums[hs.number - 1] += hs.strokes;
      const ex: HoleExtreme = { strokes: hs.strokes, date: r.date, roundId: r.id };
      if (!s.best || hs.strokes < s.best.strokes) s.best = ex;
      if (!s.worst || hs.strokes > s.worst.strokes) s.worst = ex;
    }
  }
  stats.forEach((s, i) => {
    if (s.plays) s.average = sums[i] / s.plays;
  });
  return stats;
}

export const emptyScores = (holes: Hole[]): HoleScore[] =>
  holes.map((h) => ({ number: h.number, strokes: null, lostBalls: 0 }));

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

/**
 * «1. Runde», «2. Runde» … für Tage mit mehreren Runden (nach Startzeit, über alle Plätze).
 * Tage mit nur einer Runde bekommen keine Nummer.
 */
export function roundLabels(rounds: Round[]): Record<string, string> {
  const byDay = new Map<string, Round[]>();
  for (const r of rounds) byDay.set(dayKey(r.date), [...(byDay.get(dayKey(r.date)) ?? []), r]);
  const out: Record<string, string> = {};
  for (const list of byDay.values()) {
    if (list.length < 2) continue;
    [...list].sort((a, b) => a.date.localeCompare(b.date)).forEach((r, i) => (out[r.id] = `${i + 1}. Runde`));
  }
  return out;
}
