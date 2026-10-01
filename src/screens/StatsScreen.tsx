import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { HoleStatsTable, RoundTable } from '../components/Tables';
import { Card, H, colors, fmtDate } from '../components/ui';
import { courses, getCourse } from '../data/courses';
import { holeStats, roundTotals } from '../lib/scoring';
import { useStore } from '../store/useStore';

export default function StatsScreen({ navigation }: any) {
  const rounds = useStore((s) => s.rounds);
  const deleteRound = useStore((s) => s.deleteRound);
  const played = useMemo(() => [...new Set(rounds.map((r) => r.courseId))], [rounds]);
  const [courseId, setCourseId] = useState<string | undefined>(undefined);
  const sel = courseId ?? played[0];
  const course = sel ? getCourse(sel) : undefined;

  const withTotals = rounds.map((r) => ({ r, t: roundTotals(r, getCourse(r.courseId)?.holes ?? []) }));
  const complete = withTotals.filter((x) => x.r.completed && x.t.played === (getCourse(x.r.courseId)?.holes.length ?? 18));
  const bestGross = complete.length ? Math.min(...complete.map((x) => x.t.gross)) : null;
  const bestSbf = complete.length ? Math.max(...complete.map((x) => x.t.stableford)) : null;
  const lost = withTotals.reduce((n, x) => n + x.t.lostBalls, 0);

  if (!rounds.length)
    return <View style={{ padding: 20 }}><Text>Noch keine Runden gespielt. Starte eine Runde im Tab «Platz».</Text></View>;

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      <Card>
        <H>Übersicht</H>
        <Text>Runden: {rounds.length} · Verlorene Bälle total: {lost}</Text>
        <Text>Beste Brutto-Runde (komplett): {bestGross ?? '-'} · Bester Stableford: {bestSbf ?? '-'}</Text>
      </Card>

      <Card>
        <H>Pro Loch: beste & schlechteste Runde</H>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {played.map((id) => (
            <Pressable key={id} onPress={() => setCourseId(id)} style={{ marginRight: 8, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: id === sel ? colors.green : colors.light }}>
              <Text style={{ color: id === sel ? '#fff' : colors.green }}>{courses.find((c) => c.id === id)?.name ?? id}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {course && sel && <HoleStatsTable stats={holeStats(rounds, sel, course.holes.length)} par={course.holes.map((h) => h.par)} />}
      </Card>

      <Card>
        <H>Historie</H>
        {withTotals.map(({ r, t }) => (
          <Pressable key={r.id} onPress={() => navigation.navigate('RoundDetail', { roundId: r.id })} onLongPress={() =>
            Alert.alert('Runde löschen?', r.courseName, [{ text: 'Abbrechen', style: 'cancel' }, { text: 'Löschen', style: 'destructive', onPress: () => deleteRound(r.id) }])}
            style={{ paddingVertical: 8, borderTopWidth: 0.5, borderColor: colors.line }}>
            <Text style={{ fontWeight: '600' }}>{r.courseName}</Text>
            <Text style={{ color: colors.mute }}>{fmtDate(r.date)} · Brutto {t.gross} · Netto {t.net} · Stbf {t.stableford}</Text>
          </Pressable>
        ))}
        <Text style={{ color: colors.mute, fontSize: 12, marginTop: 6 }}>Lange drücken zum Löschen.</Text>
      </Card>
    </ScrollView>
  );
}

export function RoundDetailScreen({ route }: any) {
  const round = useStore((s) => s.rounds.find((r) => r.id === route.params.roundId));
  if (!round) return null;
  return (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      <Card>
        <H>{round.courseName}</H>
        <Text style={{ color: colors.mute, marginBottom: 8 }}>{fmtDate(round.date)} · Platzvorgabe {round.courseHandicap} (HCP {round.handicapIndex})</Text>
        <RoundTable round={round} />
      </Card>
    </ScrollView>
  );
}
