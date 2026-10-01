import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Btn, Card, colors, confirmDialog, Row } from '../components/ui';
import { getCourse } from '../data/courses';
import { roundLabels, roundTotals, strokesReceived, stableford } from '../lib/scoring';
import { useStore } from '../store/useStore';

/** Live-Eingabe: ein Loch pro Seite, Schläge, verlorene Bälle, automatische Netto-/Stableford-Berechnung. */
export default function ScorecardScreen({ navigation }: any) {
  const { active, rounds, profile, setStrokes, addLostBall, finishRound, discardRound } = useStore();
  const [i, setI] = useState(0);
  if (!active) return <View style={{ padding: 20 }}><Text>Keine laufende Runde.</Text></View>;
  const course = getCourse(active.courseId)!;
  const hole = course.holes[i];
  const hs = active.holes[i];
  const rec = strokesReceived(active.courseHandicap, hole.hcpIndex, course.holes.length);
  const tot = roundTotals(active, course.holes);
  const dist = hole.distances[active.teeId];
  const label = roundLabels([...rounds, active])[active.id];

  const finish = () => {
    finishRound();
    navigation.popToTop();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      <Card>
        <Text style={{ color: colors.mute }}>{label ? `${label} · ` : ''}{active.courseName} · Platzvorgabe {active.courseHandicap}</Text>
        <Text style={{ fontSize: 28, fontWeight: '800' }}>Loch {hole.number}</Text>
        <Text style={{ fontSize: 16 }}>Par {hole.par} · {dist ?? '-'} m · HCP {hole.hcpIndex}</Text>
        <Text style={{ color: colors.green, fontWeight: '600' }}>Vorgabeschläge auf diesem Loch: {rec}</Text>
      </Card>

      <Card>
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>Schläge</Text>
        <Row style={{ justifyContent: 'space-around' }}>
          <Btn kind="ghost" title="−" onPress={() => setStrokes(hole.number, Math.max(1, (hs.strokes ?? hole.par + 1) - 1))} />
          <Text style={{ fontSize: 44, fontWeight: '800' }}>{hs.strokes ?? '–'}</Text>
          <Btn kind="ghost" title="+" onPress={() => setStrokes(hole.number, (hs.strokes ?? hole.par - 1) + 1)} />
        </Row>
        {hs.strokes != null && (
          <Text style={{ textAlign: 'center', color: colors.mute }}>
            Netto {hs.strokes - rec} · Stableford {stableford(hs.strokes, hole.par, rec)}
          </Text>
        )}
      </Card>

      <Card>
        <Text style={{ fontWeight: '700' }}>Verlorene Bälle (Bag: {profile.ballCount})</Text>
        <Row style={{ justifyContent: 'space-around' }}>
          <Btn kind="ghost" title="−" onPress={() => addLostBall(hole.number, -1)} />
          <Text style={{ fontSize: 32, fontWeight: '800' }}>{hs.lostBalls}</Text>
          <Btn kind="ghost" title="+" onPress={() => addLostBall(hole.number, 1)} />
        </Row>
      </Card>

      <Row style={{ gap: 8 }}>
        <View style={{ flex: 1 }}><Btn kind="ghost" title="← Zurück" disabled={i === 0} onPress={() => setI(i - 1)} /></View>
        <View style={{ flex: 1 }}><Btn kind="ghost" title="Weiter →" disabled={i === course.holes.length - 1} onPress={() => setI(i + 1)} /></View>
      </Row>

      <Card style={{ marginTop: 12 }}>
        <Text style={{ fontWeight: '700' }}>Zwischenstand ({tot.played} Löcher)</Text>
        <Text>Brutto {tot.gross} ({tot.toPar >= 0 ? '+' : ''}{tot.toPar}) · Netto {tot.net} · Stableford {tot.stableford}</Text>
      </Card>

      <Btn title="Runde beenden & speichern" onPress={() => {
        if (tot.played < course.holes.length)
          confirmDialog('Runde unvollständig', `${course.holes.length - tot.played} Löcher ohne Score. Trotzdem speichern?`, 'Speichern', finish);
        else finish();
      }} />
      <Btn kind="danger" title="Runde verwerfen" onPress={() =>
        confirmDialog('Runde verwerfen?', 'Verlorene Bälle werden dem Bag wieder gutgeschrieben.', 'Verwerfen', () => { discardRound(); navigation.popToTop(); }, true)} />
    </ScrollView>
  );
}
