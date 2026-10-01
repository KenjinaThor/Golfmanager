import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getCourse } from '../data/courses';
import { HoleStat, roundTotals, strokesReceived, stableford } from '../lib/scoring';
import { Round } from '../types';
import { colors, fmtDate } from './ui';

const C = ({ children, w, bold, color }: { children: React.ReactNode; w?: number; bold?: boolean; color?: string }) => (
  <Text style={[t.cell, w ? { width: w } : { flex: 1 }, bold && { fontWeight: '700' }, color ? { color } : null]}>{children}</Text>
);

/** Scorekarte einer (abgeschlossenen) Runde: Par, Distanz, Schläge, Netto, Stableford, verlorene Bälle. */
export function RoundTable({ round }: { round: Round }) {
  const course = getCourse(round.courseId);
  if (!course) return <Text>Platz nicht mehr vorhanden.</Text>;
  const tot = roundTotals(round, course.holes);
  return (
    <View>
      <View style={t.row}><C w={28} bold>#</C><C bold>Par</C><C bold>m</C><C bold>Brutto</C><C bold>Netto</C><C bold>Stbf</C><C bold>🔴</C></View>
      {course.holes.map((h) => {
        const hs = round.holes.find((x) => x.number === h.number)!;
        const rec = strokesReceived(round.courseHandicap, h.hcpIndex, course.holes.length);
        return (
          <View key={h.number} style={t.row}>
            <C w={28}>{h.number}</C><C>{h.par}</C><C>{h.distances[round.teeId] ?? '-'}</C>
            <C bold>{hs.strokes ?? '-'}</C>
            <C>{hs.strokes == null ? '-' : hs.strokes - rec}</C>
            <C>{stableford(hs.strokes, h.par, rec)}</C>
            <C>{hs.lostBalls || ''}</C>
          </View>
        );
      })}
      <View style={[t.row, { borderTopWidth: 2 }]}>
        <C w={28} bold>Σ</C><C bold>{course.holes.reduce((a, h) => a + h.par, 0)}</C><C>{''}</C>
        <C bold>{tot.gross}</C><C bold>{tot.net}</C><C bold>{tot.stableford}</C><C bold>{tot.lostBalls}</C>
      </View>
    </View>
  );
}

/** Pro Loch: beste und schlechteste Runde mit Datum. */
export function HoleStatsTable({ stats, par, labels = {} }: { stats: HoleStat[]; par: number[]; labels?: Record<string, string> }) {
  const when = (e: { date: string; roundId: string }) => `${fmtDate(e.date)}${labels[e.roundId] ? ` (${labels[e.roundId]})` : ''}`;
  return (
    <View>
      <View style={t.row}><C w={28} bold>#</C><C w={34} bold>Par</C><C bold>Beste</C><C bold>Schlechteste</C><C w={40} bold>Ø</C></View>
      {stats.map((s) => (
        <View key={s.number} style={t.row}>
          <C w={28}>{s.number}</C><C w={34}>{par[s.number - 1]}</C>
          <C color="#1f7a3a">{s.best ? `${s.best.strokes} · ${when(s.best)}` : '-'}</C>
          <C color={colors.bad}>{s.worst ? `${s.worst.strokes} · ${when(s.worst)}` : '-'}</C>
          <C w={40}>{s.average ? s.average.toFixed(1) : '-'}</C>
        </View>
      ))}
    </View>
  );
}

const t = StyleSheet.create({
  row: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  cell: { fontSize: 13, color: colors.text },
});
