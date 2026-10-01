import React, { useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { Btn, Card, H, colors } from '../components/ui';
import { getCourse } from '../data/courses';
import { courseHandicap, coursePar, teeRating } from '../lib/scoring';
import { useStore } from '../store/useStore';
import { TeeId } from '../types';

export default function CourseDetailScreen({ route, navigation }: any) {
  const course = getCourse(route.params.courseId)!;
  const hcp = useStore((s) => s.profile.handicapIndex);
  const gender = useStore((s) => s.profile.gender ?? 'men');
  const startRound = useStore((s) => s.startRound);
  const [tee, setTee] = useState<TeeId>(course.tees[0].id);
  const teeInfo = course.tees.find((t) => t.id === tee)!;
  const par = coursePar(course);
  const rating = teeRating(teeInfo, gender);

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      <Card>
        <H>{course.name}</H>
        {!course.verified && <Text style={{ color: colors.bad, marginBottom: 6 }}>⚠ Platzhalter-Daten – bitte mit der offiziellen Scorekarte abgleichen.</Text>}
        <Text style={{ color: colors.mute, marginBottom: 8 }}>Abschlag wählen:</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          {course.tees.map((t) => (
            <Pressable key={t.id} onPress={() => setTee(t.id)} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.id === tee ? colors.green : colors.light }}>
              <Text style={{ color: t.id === tee ? '#fff' : colors.green, fontWeight: '600' }}>{t.name}</Text>
            </Pressable>
          ))}
        </View>
        <Text>
          {teeInfo.markers ? `${teeInfo.markers} · ` : ''}{rating ? `CR ${rating.rating} · Slope ${rating.slope}` : 'CR/Slope unbekannt'} · Par {par}
        </Text>
        {!rating && (
          <Text style={{ color: colors.mute, fontSize: 12 }}>
            Ohne offizielles Rating/Slope wird die Platzvorgabe nur angenähert (≈ Handicap-Index).
          </Text>
        )}
        <Text style={{ fontWeight: '700', marginTop: 4 }}>
          Deine Platzvorgabe: {courseHandicap(hcp, teeInfo, par, gender, course.holes.length)} (HCP-Index {hcp})
        </Text>
        <Btn
          title="Runde starten"
          onPress={() => {
            startRound(course.id, tee);
            navigation.navigate('Scorecard');
          }}
        />
      </Card>
      <Card>
        <H>Löcher</H>
        <View style={{ flexDirection: 'row', paddingBottom: 4 }}>
          {['#', 'Par', 'HCP', 'Distanz'].map((h) => <Text key={h} style={{ flex: 1, fontWeight: '700', fontSize: 12 }}>{h}</Text>)}
        </View>
        {course.holes.map((h) => (
          <View key={h.number} style={{ flexDirection: 'row', paddingVertical: 5, borderTopWidth: 0.5, borderColor: colors.line }}>
            <Text style={{ flex: 1 }}>{h.number}</Text>
            <Text style={{ flex: 1 }}>{h.par}</Text>
            <Text style={{ flex: 1 }}>{h.hcpIndex}</Text>
            <Text style={{ flex: 1 }}>{h.distances[tee] ?? '-'} m</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}
