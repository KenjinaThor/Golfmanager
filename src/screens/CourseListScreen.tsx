import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Btn, Card, colors } from '../components/ui';
import { courses } from '../data/courses';
import { coursePar } from '../lib/scoring';
import { useStore } from '../store/useStore';

export default function CourseListScreen({ navigation }: any) {
  const [q, setQ] = useState('');
  const active = useStore((s) => s.active);
  const list = useMemo(
    () => courses.filter((c) => (c.name + c.region).toLowerCase().includes(q.toLowerCase())),
    [q],
  );
  return (
    <View style={{ flex: 1, padding: 12 }}>
      {active && (
        <Card style={{ backgroundColor: colors.light }}>
          <Text style={{ fontWeight: '700' }}>Laufende Runde: {active.courseName}</Text>
          <Btn title="Fortsetzen" onPress={() => navigation.navigate('Scorecard')} />
        </Card>
      )}
      <TextInput
        placeholder="Platz oder Region suchen…"
        value={q}
        onChangeText={setQ}
        style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 10, backgroundColor: '#fff', marginBottom: 10 }}
      />
      <FlatList
        data={list}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}>
            <Card>
              <Text style={{ fontWeight: '700', fontSize: 16 }}>{item.name}</Text>
              <Text style={{ color: colors.mute }}>
                {item.region} · Par {coursePar(item)} · {item.holes.length} Löcher{item.verified ? '' : ' · ⚠ Daten ungeprüft'}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}
