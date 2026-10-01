import React, { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { Btn, Card, Field, H, Row, colors } from '../components/ui';
import { useStore } from '../store/useStore';
import { Profile } from '../types';

const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));

export default function ProfileScreen() {
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const [f, setF] = useState<Record<string, string>>({
    name: profile.name, username: profile.username, handicapIndex: String(profile.handicapIndex),
    heightCm: profile.heightCm?.toString() ?? '', homeClub: profile.homeClub, clubBrand: profile.clubBrand,
    ballBrand: profile.ballBrand, ballCount: String(profile.ballCount),
    driverDistance: profile.driverDistance?.toString() ?? '', bio: profile.bio,
  });
  const set = (k: string) => (v: string) => setF((o) => ({ ...o, [k]: v }));

  const save = () => {
    const hcp = num(f.handicapIndex);
    setProfile({
      name: f.name, username: f.username.toLowerCase().replace(/[^a-z0-9_]/g, ''),
      handicapIndex: hcp == null || isNaN(hcp) ? profile.handicapIndex : Math.min(54, Math.max(-6, hcp)),
      heightCm: num(f.heightCm), homeClub: f.homeClub, clubBrand: f.clubBrand, ballBrand: f.ballBrand,
      ballCount: Math.max(0, Math.round(num(f.ballCount) ?? 0)), driverDistance: num(f.driverDistance), bio: f.bio,
    });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }} keyboardShouldPersistTaps="handled">
      <Card>
        <H>Spieler</H>
        <Field label="Name" value={f.name} onChangeText={set('name')} />
        <Field label="Benutzername (für Freunde, a–z 0–9 _, min. 3)" value={f.username} onChangeText={set('username')} autoCapitalize="none" />
        <Field label="Handicap-Index (−6 bis 54)" value={f.handicapIndex} onChangeText={set('handicapIndex')} keyboardType="decimal-pad" />
        <Field label="Heimclub" value={f.homeClub} onChangeText={set('homeClub')} />
        <Field label="Grösse (cm)" value={f.heightCm} onChangeText={set('heightCm')} keyboardType="number-pad" />
        <Text style={{ fontSize: 12, color: colors.mute, marginBottom: 4 }}>Spielhand</Text>
        <Row style={{ gap: 8, marginBottom: 12 }}>
          {(['right', 'left'] as Profile['handedness'][]).map((h) => (
            <Btn key={h} kind={profile.handedness === h ? 'primary' : 'ghost'} title={h === 'right' ? 'Rechts' : 'Links'} onPress={() => setProfile({ handedness: h })} />
          ))}
        </Row>
      </Card>
      <Card>
        <H>Ausrüstung</H>
        <Field label="Schläger-Marke" value={f.clubBrand} onChangeText={set('clubBrand')} />
        <Field label="Ball-Marke" value={f.ballBrand} onChangeText={set('ballBrand')} />
        <Field label="Anzahl Bälle im Bag (wird bei verlorenen Bällen reduziert)" value={f.ballCount} onChangeText={set('ballCount')} keyboardType="number-pad" />
        <Field label="Driver-Distanz (m)" value={f.driverDistance} onChangeText={set('driverDistance')} keyboardType="number-pad" />
        <Field label="Über mich" value={f.bio} onChangeText={set('bio')} multiline />
      </Card>
      <Btn title="Speichern" onPress={save} />
      <Text style={{ color: colors.mute, marginTop: 8 }}>Lokal gespeichert. Mit Login im Tab «Freunde» wird das Profil synchronisiert.</Text>
    </ScrollView>
  );
}
