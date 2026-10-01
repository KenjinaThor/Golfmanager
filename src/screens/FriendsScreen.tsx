import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Btn, Card, Field, H, Row, colors } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { pushProfile } from '../lib/sync';

interface Pub { id: string; username: string; name: string; handicap_index: number | null }
interface Fs { requester: string; addressee: string; status: 'pending' | 'accepted' }

export default function FriendsScreen({ navigation }: any) {
  const [me, setMe] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Pub[]>([]);
  const [fs, setFs] = useState<Fs[]>([]);
  const [people, setPeople] = useState<Record<string, Pub>>({});
  const profile = useStore((s) => s.profile);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setMe(data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, sess) => setMe(sess?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    if (!supabase || !me) return;
    const { data: rows } = await supabase.from('friendships').select('*');
    const list = (rows ?? []) as Fs[];
    setFs(list);
    const ids = [...new Set(list.flatMap((f) => [f.requester, f.addressee]))].filter((i) => i !== me);
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('*').in('id', ids);
      setPeople(Object.fromEntries(((ps ?? []) as Pub[]).map((p) => [p.id, p])));
    }
  }, [me]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!supabase)
    return (
      <View style={{ padding: 20 }}>
        <H>Vernetzung nicht konfiguriert</H>
        <Text>Setze EXPO_PUBLIC_SUPABASE_URL und EXPO_PUBLIC_SUPABASE_ANON_KEY (siehe README), um dich mit anderen Spielern zu vernetzen. Alles andere funktioniert auch offline.</Text>
      </View>
    );

  if (!me)
    return (
      <ScrollView contentContainerStyle={{ padding: 12 }} keyboardShouldPersistTaps="handled">
        <Card>
          <H>Anmelden</H>
          <Field label="E-Mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Field label="Passwort (min. 6 Zeichen)" value={pw} onChangeText={setPw} secureTextEntry />
          <Btn title="Anmelden" onPress={async () => {
            const { error } = await supabase!.auth.signInWithPassword({ email, password: pw });
            if (error) Alert.alert('Fehler', error.message); else void pushProfile(profile);
          }} />
          <Btn kind="ghost" title="Konto erstellen" onPress={async () => {
            const { data, error } = await supabase!.auth.signUp({ email, password: pw });
            if (error) Alert.alert('Fehler', error.message);
            else if (!data.session) Alert.alert('Fast geschafft', 'Bitte bestätige deine E-Mail-Adresse und melde dich dann an.');
            else void pushProfile(profile);
          }} />
        </Card>
      </ScrollView>
    );

  const search = async () => {
    const { data } = await supabase!.from('profiles').select('*').ilike('username', `%${q.toLowerCase()}%`).neq('id', me).limit(20);
    setFound((data ?? []) as Pub[]);
  };
  const request = async (id: string) => {
    const { error } = await supabase!.from('friendships').insert({ requester: me, addressee: id });
    Alert.alert(error ? 'Fehler' : 'Anfrage gesendet', error?.message ?? '');
    void load();
  };
  const other = (f: Fs) => people[f.requester === me ? f.addressee : f.requester];

  const incoming = fs.filter((f) => f.status === 'pending' && f.addressee === me);
  const outgoing = fs.filter((f) => f.status === 'pending' && f.requester === me);
  const friends = fs.filter((f) => f.status === 'accepted');

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }} keyboardShouldPersistTaps="handled">
      {!profile.username && <Card><Text style={{ color: colors.bad }}>Lege im Profil einen Benutzernamen fest, damit dich andere finden.</Text></Card>}
      <Card>
        <H>Spieler suchen</H>
        <Field label="Benutzername" value={q} onChangeText={setQ} autoCapitalize="none" onSubmitEditing={search} />
        <Btn kind="ghost" title="Suchen" onPress={search} />
        {found.map((p) => (
          <Row key={p.id} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text>{p.name || p.username} (@{p.username})</Text>
            <Btn title="Anfragen" onPress={() => request(p.id)} />
          </Row>
        ))}
      </Card>

      {incoming.length > 0 && (
        <Card>
          <H>Anfragen</H>
          {incoming.map((f) => (
            <Row key={f.requester} style={{ justifyContent: 'space-between' }}>
              <Text>{people[f.requester]?.name || people[f.requester]?.username || '…'}</Text>
              <Btn title="Annehmen" onPress={async () => {
                await supabase!.from('friendships').update({ status: 'accepted' }).eq('requester', f.requester).eq('addressee', me);
                void load();
              }} />
            </Row>
          ))}
        </Card>
      )}

      <Card>
        <H>Freunde</H>
        {friends.length === 0 && <Text style={{ color: colors.mute }}>Noch keine Freunde.</Text>}
        {friends.map((f) => {
          const p = other(f);
          return (
            <Pressable key={f.requester + f.addressee} onPress={() => p && navigation.navigate('FriendDetail', { user: p })}
              style={{ paddingVertical: 8, borderTopWidth: 0.5, borderColor: colors.line }}>
              <Text style={{ fontWeight: '600' }}>{p?.name || p?.username || '…'}</Text>
              <Text style={{ color: colors.mute }}>@{p?.username} · HCP {p?.handicap_index ?? '-'}</Text>
            </Pressable>
          );
        })}
        {outgoing.length > 0 && <Text style={{ color: colors.mute, marginTop: 8 }}>{outgoing.length} Anfrage(n) ausstehend</Text>}
      </Card>
      <Btn kind="ghost" title="Abmelden" onPress={() => supabase!.auth.signOut()} />
    </ScrollView>
  );
}
