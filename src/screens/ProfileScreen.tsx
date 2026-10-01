import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ScrollView, Text, View } from 'react-native';
import { Btn, Card, Field, H, Row, Tag, colors } from '../components/ui';
import { supabase } from '../lib/supabase';
import { syncAll, useSyncInfo } from '../lib/sync';
import { useStore } from '../store/useStore';
import { Profile } from '../types';

const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));

export default function ProfileScreen() {
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const rounds = useStore((s) => s.rounds);
  const info = useSyncInfo();
  const fromProfile = () => ({
    name: profile.name, username: profile.username, handicapIndex: String(profile.handicapIndex),
    heightCm: profile.heightCm?.toString() ?? '', homeClub: profile.homeClub, clubBrand: profile.clubBrand,
    ballBrand: profile.ballBrand, ballCount: String(profile.ballCount),
    driverDistance: profile.driverDistance?.toString() ?? '', bio: profile.bio,
  });
  const [f, setF] = useState<Record<string, string>>(fromProfile);
  // Beim Öffnen des Reiters die Felder neu aus dem Profil lesen (z. B. nach verlorenen Bällen in einer Runde),
  // sonst würde «Speichern» einen veralteten Ballvorrat zurückschreiben.
  useFocusEffect(useCallback(() => { setF(fromProfile()); }, [profile])); // eslint-disable-line react-hooks/exhaustive-deps
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
        <H>Was wird übertragen?</H>
        <Text style={{ color: colors.text, marginBottom: 6 }}>
          Nur wenn du im Tab «Freunde» angemeldet bist. Ohne Anmeldung bleibt alles auf diesem Gerät.
        </Text>
        <Row style={{ gap: 8, marginBottom: 4 }}><Tag kind="public" /><Text style={{ flex: 1, color: colors.mute, fontSize: 12 }}>Alle angemeldeten Spieler können es bei der Suche sehen.</Text></Row>
        <Row style={{ gap: 8, marginBottom: 8 }}><Tag kind="friends" /><Text style={{ flex: 1, color: colors.mute, fontSize: 12 }}>Nur bestätigte Freunde sehen es. Das gilt auch für deine abgeschlossenen Runden.</Text></Row>
        <Text style={{ color: colors.mute, fontSize: 12 }}>Felder ohne Kennzeichnung bleiben nur auf dem Gerät (z. B. die laufende Runde).</Text>
        {supabase && (
          <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderColor: colors.line }}>
            <Text style={{ color: info.state === 'error' ? colors.bad : info.state === 'ok' ? colors.green : colors.mute, fontWeight: '600' }}>
              {info.state === 'ok' ? '✓ ' : info.state === 'error' ? '✗ ' : ''}{info.message}
              {info.at ? ` (${new Date(info.at).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })})` : ''}
            </Text>
            <Btn kind="ghost" title={info.busy ? 'Überträgt …' : 'Jetzt übertragen'} disabled={info.busy} onPress={() => void syncAll(profile, rounds)} />
          </View>
        )}
      </Card>
      <Card>
        <H>Spieler</H>
        <Field label="Name (richtiger Name)" visible="public" value={f.name} onChangeText={set('name')} />
        <Field label="Benutzername (a–z 0–9 _, min. 3)" visible="public" value={f.username} onChangeText={set('username')} autoCapitalize="none" />
        <Field label="Handicap-Index (−6 bis 54)" visible="public" value={f.handicapIndex} onChangeText={set('handicapIndex')} keyboardType="decimal-pad" />
        <Field label="Heimclub" visible="friends" value={f.homeClub} onChangeText={set('homeClub')} />
        <Field label="Grösse (cm)" visible="friends" value={f.heightCm} onChangeText={set('heightCm')} keyboardType="number-pad" />
        <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ fontSize: 12, color: colors.mute }}>Wertung (bestimmt Course Rating/Slope)</Text>
          <Tag kind="friends" />
        </Row>
        <Row style={{ gap: 8, marginBottom: 12 }}>
          {(['men', 'ladies'] as Profile['gender'][]).map((g) => (
            <Btn key={g} kind={(profile.gender ?? 'men') === g ? 'primary' : 'ghost'} title={g === 'men' ? 'Herren' : 'Damen'} onPress={() => setProfile({ gender: g })} />
          ))}
        </Row>
        <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ fontSize: 12, color: colors.mute }}>Spielhand</Text>
          <Tag kind="friends" />
        </Row>
        <Row style={{ gap: 8, marginBottom: 12 }}>
          {(['right', 'left'] as Profile['handedness'][]).map((h) => (
            <Btn key={h} kind={profile.handedness === h ? 'primary' : 'ghost'} title={h === 'right' ? 'Rechts' : 'Links'} onPress={() => setProfile({ handedness: h })} />
          ))}
        </Row>
      </Card>
      <Card>
        <H>Ausrüstung</H>
        <Field label="Schläger-Marke" visible="friends" value={f.clubBrand} onChangeText={set('clubBrand')} />
        <Field label="Ball-Marke" visible="friends" value={f.ballBrand} onChangeText={set('ballBrand')} />
        <Field label="Anzahl Bälle im Bag (sinkt bei verlorenen Bällen)" visible="friends" value={f.ballCount} onChangeText={set('ballCount')} keyboardType="number-pad" />
        <Field label="Driver-Distanz (m)" visible="friends" value={f.driverDistance} onChangeText={set('driverDistance')} keyboardType="number-pad" />
        <Field label="Über mich" visible="friends" value={f.bio} onChangeText={set('bio')} multiline />
      </Card>
      <Btn title="Speichern" onPress={save} />
      <Text style={{ color: colors.mute, marginTop: 8 }}>Beim Speichern wird das Profil sofort übertragen, sofern du angemeldet bist.</Text>
    </ScrollView>
  );
}
