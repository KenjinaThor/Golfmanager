import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ScrollView, Text, TextInputProps, View } from 'react-native';
import { Btn, Card, Field, H, Row, Tag, VisibilityPicker, colors, notify } from '../components/ui';
import { ageFromBirthDate, effectiveAge, parseBirthDate, visibilityOf } from '../lib/privacy';
import { runSync } from '../lib/runSync';
import { supabase } from '../lib/supabase';
import { useSyncInfo } from '../lib/sync';
import { useStore } from '../store/useStore';
import { Profile, SharedField, Visibility } from '../types';

const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));

type Vis = (k: SharedField) => (v: Visibility) => void;

/** Eingabefeld mit eigener Wahl der Sichtbarkeit darunter (ausserhalb von ProfileScreen, damit die Felder beim Tippen nicht neu aufgebaut werden). */
function Shared({ k, label, profile, onVis, ...p }: { k: SharedField; label: string; profile: Profile; onVis: Vis } & TextInputProps) {
  return <Field label={label} footer={<VisibilityPicker value={visibilityOf(profile, k)} onChange={onVis(k)} />} {...p} />;
}

export default function ProfileScreen() {
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const info = useSyncInfo();
  const fromProfile = () => ({
    name: profile.name, username: profile.username, handicapIndex: String(profile.handicapIndex),
    heightCm: profile.heightCm?.toString() ?? '', homeClub: profile.homeClub, clubBrand: profile.clubBrand,
    ballBrand: profile.ballBrand, ballCount: String(profile.ballCount),
    driverDistance: profile.driverDistance?.toString() ?? '', bio: profile.bio,
  });
  const [f, setF] = useState<Record<string, string>>(fromProfile);
  const [dob, setDob] = useState('');
  const [editDob, setEditDob] = useState(false);
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

  const setVis = (k: SharedField) => (v: Visibility) => setProfile({ visibility: { ...profile.visibility, [k]: v } });
  const sp = { profile, onVis: setVis };

  const saveDob = () => {
    const iso = parseBirthDate(dob);
    if (!iso) return notify('Geburtsdatum prüfen', 'Bitte als TT.MM.JJJJ eingeben, zum Beispiel 17.05.1990.');
    setProfile({ birthDate: iso, age: ageFromBirthDate(iso) });
    setDob('');
    setEditDob(false);
  };
  const age = effectiveAge(profile);
  const showDobInput = editDob || (!profile.birthDate);

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }} keyboardShouldPersistTaps="handled">
      <Card>
        <H>Wer sieht was?</H>
        <Text style={{ color: colors.text, marginBottom: 8 }}>
          Bei jedem Feld wählst du selbst, wer es sieht. Übertragen wird nur, wenn du im Tab «Freunde» angemeldet bist.
        </Text>
        <Row style={{ gap: 8, marginBottom: 4, alignItems: 'flex-start' }}><Tag kind="private" /><Text style={{ flex: 1, color: colors.mute, fontSize: 12 }}>Liegt nur in deinem Cloud-Konto: kein anderer Spieler sieht es, auf deinen eigenen Geräten erscheint es nach der Anmeldung.</Text></Row>
        <Row style={{ gap: 8, marginBottom: 4, alignItems: 'flex-start' }}><Tag kind="friends" /><Text style={{ flex: 1, color: colors.mute, fontSize: 12 }}>Nur bestätigte Freunde sehen es.</Text></Row>
        <Row style={{ gap: 8, marginBottom: 8, alignItems: 'flex-start' }}><Tag kind="public" /><Text style={{ flex: 1, color: colors.mute, fontSize: 12 }}>Alle angemeldeten Spieler sehen es, zum Beispiel bei der Suche.</Text></Row>
        <Text style={{ color: colors.mute, fontSize: 12 }}>
          Der Benutzername ist immer öffentlich, sonst findet dich niemand. Das Geburtsdatum wird nie übertragen. Deine abgeschlossenen Runden sehen nur Freunde.
        </Text>
        {supabase && (
          <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderColor: colors.line }}>
            <Text style={{ color: info.state === 'error' ? colors.bad : info.state === 'ok' ? colors.green : colors.mute, fontWeight: '600' }}>
              {info.state === 'ok' ? '✓ ' : info.state === 'error' ? '✗ ' : ''}{info.message}
              {info.at ? ` (${new Date(info.at).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })})` : ''}
            </Text>
            <Btn kind="ghost" title={info.busy ? 'Überträgt …' : 'Jetzt übertragen'} disabled={info.busy} onPress={() => void runSync()} />
          </View>
        )}
      </Card>

      <Card>
        <H>Spieler</H>
        <Shared {...sp} k="name" label="Name (richtiger Name)" value={f.name} onChangeText={set('name')} />
        <Field label="Benutzername (a–z 0–9 _, min. 3)" value={f.username} onChangeText={set('username')} autoCapitalize="none" footer={<VisibilityPicker value="public" locked />} />
        <Shared {...sp} k="handicapIndex" label="Handicap-Index (−6 bis 54)" value={f.handicapIndex} onChangeText={set('handicapIndex')} keyboardType="decimal-pad" />

        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 12, color: colors.mute, marginBottom: 4 }}>Alter</Text>
          {!showDobInput ? (
            <Row style={{ justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{age != null ? `${age} Jahre` : '–'}</Text>
              <Btn kind="ghost" title="Geburtsdatum ändern" onPress={() => setEditDob(true)} />
            </Row>
          ) : (
            <View>
              {!profile.birthDate && profile.age != null && <Text style={{ color: colors.text, marginBottom: 6 }}>Aus der Cloud übernommen: {profile.age} Jahre</Text>}
              <Field label="Geburtsdatum (TT.MM.JJJJ)" value={dob} onChangeText={setDob} placeholder="z. B. 17.05.1990" keyboardType="numbers-and-punctuation"
                footer={<Text style={{ color: colors.mute, fontSize: 12 }}>Das Geburtsdatum bleibt auf diesem Gerät und wird nie übertragen. Angezeigt und übertragen wird nur das Alter.</Text>} />
              <Row style={{ gap: 8 }}>
                <View style={{ flex: 1 }}><Btn title="Alter übernehmen" onPress={saveDob} /></View>
                {profile.birthDate && <View style={{ flex: 1 }}><Btn kind="ghost" title="Abbrechen" onPress={() => { setEditDob(false); setDob(''); }} /></View>}
              </Row>
            </View>
          )}
          {profile.birthDate && !editDob && (
            <Text style={{ color: colors.mute, fontSize: 11, marginTop: 4 }}>Das Geburtsdatum ist gespeichert, bleibt auf diesem Gerät und wird nie übertragen.</Text>
          )}
          <View style={{ marginTop: 8 }}><VisibilityPicker value={visibilityOf(profile, 'age')} onChange={setVis('age')} /></View>
        </View>

        <Shared {...sp} k="homeClub" label="Heimclub" value={f.homeClub} onChangeText={set('homeClub')} />
        <Shared {...sp} k="heightCm" label="Grösse (cm)" value={f.heightCm} onChangeText={set('heightCm')} keyboardType="number-pad" />

        <Text style={{ fontSize: 12, color: colors.mute, marginBottom: 4 }}>Wertung (bestimmt Course Rating/Slope)</Text>
        <Row style={{ gap: 8, marginBottom: 6 }}>
          {(['men', 'ladies'] as Profile['gender'][]).map((g) => (
            <Btn key={g} kind={(profile.gender ?? 'men') === g ? 'primary' : 'ghost'} title={g === 'men' ? 'Herren' : 'Damen'} onPress={() => setProfile({ gender: g })} />
          ))}
        </Row>
        <View style={{ marginBottom: 14 }}><VisibilityPicker value={visibilityOf(profile, 'gender')} onChange={setVis('gender')} /></View>

        <Text style={{ fontSize: 12, color: colors.mute, marginBottom: 4 }}>Spielhand</Text>
        <Row style={{ gap: 8, marginBottom: 6 }}>
          {(['right', 'left'] as Profile['handedness'][]).map((h) => (
            <Btn key={h} kind={profile.handedness === h ? 'primary' : 'ghost'} title={h === 'right' ? 'Rechts' : 'Links'} onPress={() => setProfile({ handedness: h })} />
          ))}
        </Row>
        <View style={{ marginBottom: 6 }}><VisibilityPicker value={visibilityOf(profile, 'handedness')} onChange={setVis('handedness')} /></View>
      </Card>

      <Card>
        <H>Ausrüstung</H>
        <Shared {...sp} k="clubBrand" label="Schläger-Marke" value={f.clubBrand} onChangeText={set('clubBrand')} />
        <Shared {...sp} k="ballBrand" label="Ball-Marke" value={f.ballBrand} onChangeText={set('ballBrand')} />
        <Shared {...sp} k="ballCount" label="Anzahl Bälle im Bag (sinkt bei verlorenen Bällen)" value={f.ballCount} onChangeText={set('ballCount')} keyboardType="number-pad" />
        <Shared {...sp} k="driverDistance" label="Driver-Distanz (m)" value={f.driverDistance} onChangeText={set('driverDistance')} keyboardType="number-pad" />
        <Shared {...sp} k="bio" label="Über mich" value={f.bio} onChangeText={set('bio')} multiline />
      </Card>
      <Btn title="Speichern" onPress={save} />
      <Text style={{ color: colors.mute, marginTop: 8 }}>Beim Speichern und beim Ändern der Sichtbarkeit wird das Profil sofort übertragen, sofern du angemeldet bist.</Text>
    </ScrollView>
  );
}
