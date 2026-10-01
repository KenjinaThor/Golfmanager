import React, { useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { Btn, Card, H, colors } from '../components/ui';
import { HoleImage } from '../components/HoleLayout';
import { holeImages } from '../data/holeImages';
import { getCourse } from '../data/courses';
import { courseHandicap, coursePar, teeRating } from '../lib/scoring';
import { useStore } from '../store/useStore';
import { Tee, TeeId } from '../types';

export default function CourseDetailScreen({ route, navigation }: any) {
  const course = getCourse(route.params.courseId)!;
  const hcp = useStore((s) => s.profile.handicapIndex);
  const gender = useStore((s) => s.profile.gender ?? 'men');
  const startRound = useStore((s) => s.startRound);
  const [tee, setTee] = useState<TeeId>(course.tees[0].id);
  const teeInfo = course.tees.find((t) => t.id === tee)!;
  const par = coursePar(course);
  const rating = teeRating(teeInfo, gender);
  const [openHole, setOpenHole] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const length = (t: Tee) => course.holes.reduce((sum, h) => sum + (h.distances[t.id] ?? 0), 0);

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      <Card>
        <H>{course.name}</H>
        {!course.verified && <Text style={{ color: colors.bad, marginBottom: 6 }}>⚠ Platzhalter-Daten – bitte mit der offiziellen Scorekarte abgleichen.</Text>}
        <Text style={{ color: colors.mute, marginBottom: 8 }}>Abschlag wählen:</Text>
        <View style={{ gap: 8, marginBottom: 10 }}>
          {course.tees.map((t) => {
            const sel = t.id === tee;
            const r = teeRating(t, gender);
            return (
              <Pressable key={t.id} onPress={() => setTee(t.id)} accessibilityRole="radio" accessibilityState={{ selected: sel }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: sel ? colors.green : colors.line, backgroundColor: sel ? colors.light : '#fff' }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: sel ? colors.green : '#9ca3af', alignItems: 'center', justifyContent: 'center' }}>
                  {sel && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green }} />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>{t.name}</Text>
                  <Text style={{ color: colors.mute, fontSize: 12 }}>
                    {[t.markers, `${length(t)} m`, r ? `CR ${r.rating} · Slope ${r.slope}` : null].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {!course.noHandicap && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontWeight: '700', color: colors.text }}>{courseHandicap(hcp, t, par, gender, course.holes.length)}</Text>
                    <Text style={{ color: colors.mute, fontSize: 11 }}>Vorgabe</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
        <Text>
          {rating ? `CR ${rating.rating} · Slope ${rating.slope}` : 'CR/Slope unbekannt'} · Par {par}
        </Text>
        {course.noHandicap && (
          <Text style={{ color: colors.mute, fontSize: 12 }}>
            Übungsplatz ohne Rating: keine Platzvorgabe, es zählen nur die Bruttoschläge.
          </Text>
        )}
        {!rating && !course.noHandicap && (
          <Text style={{ color: colors.mute, fontSize: 12 }}>
            Ohne offizielles Rating/Slope wird die Platzvorgabe nur angenähert (≈ Handicap-Index).
          </Text>
        )}
        <Text style={{ fontWeight: '700', marginTop: 4 }}>
          {course.noHandicap ? 'Keine Platzvorgabe' : `Deine Platzvorgabe: ${courseHandicap(hcp, teeInfo, par, gender, course.holes.length)} (HCP-Index ${hcp})`}
        </Text>
        <Btn
          title="Runde starten"
          onPress={() => {
            startRound(course.id, tee);
            navigation.navigate('Scorecard');
          }}
        />
      </Card>
      {course.overview && holeImages[course.overview] && (
        <Card>
          <Pressable onPress={() => setShowMap((v) => !v)}>
            <Text style={{ fontWeight: '700', color: colors.green }}>{showMap ? 'Platzübersicht ausblenden' : 'Platzübersicht anzeigen'}</Text>
          </Pressable>
          {showMap && <HoleImage imageKey={course.overview} />}
        </Card>
      )}
      <Card>
        <H>Löcher</H>
        <View style={{ flexDirection: 'row', paddingBottom: 4 }}>
          {['#', 'Par', 'HCP', 'Distanz'].map((h) => <Text key={h} style={{ flex: 1, fontWeight: '700', fontSize: 12 }}>{h}</Text>)}
        </View>
        {course.holes.map((h) => {
          const hasImg = !!h.image && !!holeImages[h.image];
          const open = openHole === h.number;
          return (
            <View key={h.number} style={{ borderTopWidth: 0.5, borderColor: colors.line }}>
              <Pressable onPress={() => hasImg && setOpenHole(open ? null : h.number)} style={{ flexDirection: 'row', paddingVertical: 6, alignItems: 'center' }}>
                <Text style={{ flex: 1 }}>{h.number}</Text>
                <Text style={{ flex: 1 }}>{h.par}</Text>
                <Text style={{ flex: 1 }}>{h.hcpIndex}</Text>
                <Text style={{ flex: 1 }}>{h.distances[tee] ?? '-'} m</Text>
                <Text style={{ width: 22, color: hasImg ? colors.green : 'transparent', fontWeight: '700' }}>{open ? '▴' : '▾'}</Text>
              </Pressable>
              {open && <HoleImage imageKey={h.image} />}
            </View>
          );
        })}
        <Text style={{ color: colors.mute, fontSize: 11, marginTop: 6 }}>Zeile antippen für das Lochlayout.</Text>
      </Card>
    </ScrollView>
  );
}
