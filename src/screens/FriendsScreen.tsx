import React, { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Btn, Card, Field, H, Row, colors, confirmDialog, notify } from '../components/ui';
import { supabase, supabaseConfigError, supabaseHost } from '../lib/supabase';
import { checkCredentials, friendlyAuthError } from '../lib/supabaseConfig';
import { useStore } from '../store/useStore';
import { runSync } from '../lib/runSync';
import { refreshIncoming, useFriends } from '../lib/friends';

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
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const pwRef = useRef<ComponentRef<typeof TextInput>>(null);

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
    useFriends.setState({ incoming: list.filter((f) => f.status === 'pending' && f.addressee === me).length });
    const ids = [...new Set(list.flatMap((f) => [f.requester, f.addressee]))].filter((i) => i !== me);
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('*').in('id', ids);
      setPeople(Object.fromEntries(((ps ?? []) as Pub[]).map((p) => [p.id, p])));
    }
  }, [me]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  /** E-Mail/Passwort lesen (im Web zusätzlich direkt aus dem Feld, falls Autofill die Eingabe nicht gemeldet hat) und prüfen. */
  const credentials = (login: boolean) => {
    const domValue = (r: React.RefObject<ComponentRef<typeof TextInput> | null>) => (r.current as unknown as { value?: string } | null)?.value;
    const e = (email || domValue(emailRef) || '').trim();
    const p = pw || domValue(pwRef) || '';
    const problem = checkCredentials(e, p, login);
    if (problem) {
      notify('Bitte prüfen', problem);
      return null;
    }
    return { email: e, password: p };
  };

  if (!supabase)
    return (
      <View style={{ padding: 20 }}>
        <H>{supabaseConfigError ? 'Vernetzung: Konfiguration fehlerhaft' : 'Vernetzung nicht konfiguriert'}</H>
        {supabaseConfigError && <Text style={{ color: colors.bad, marginBottom: 8 }}>{supabaseConfigError}</Text>}
        <Text>Setze EXPO_PUBLIC_SUPABASE_URL und EXPO_PUBLIC_SUPABASE_ANON_KEY (siehe README), um dich mit anderen Spielern zu vernetzen. Alles andere funktioniert auch offline.</Text>
      </View>
    );

  if (!me)
    return (
      <ScrollView contentContainerStyle={{ padding: 12 }} keyboardShouldPersistTaps="handled">
        <Card>
          <H>Anmelden</H>
          <Field label="E-Mail" inputRef={emailRef} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
          <Field label="Passwort (min. 6 Zeichen)" inputRef={pwRef} value={pw} onChangeText={setPw} secureTextEntry autoComplete="current-password" />
          <Text style={{ color: colors.mute, fontSize: 12, marginBottom: 8 }}>Server: {supabaseHost}</Text>
          <Btn title="Anmelden" onPress={async () => {
            const c = credentials(true);
            if (!c) return;
            const { error } = await supabase!.auth.signInWithPassword({ email: c.email, password: c.password });
            if (error) notify('Fehler', friendlyAuthError(error.message, supabaseHost)); else void runSync();
          }} />
          <Btn kind="ghost" title="Konto erstellen" onPress={async () => {
            const c = credentials(false);
            if (!c) return;
            const { data, error } = await supabase!.auth.signUp({ email: c.email, password: c.password });
            if (error) notify('Fehler', friendlyAuthError(error.message, supabaseHost));
            else if (!data.session) notify('Fast geschafft', 'Bitte bestätige deine E-Mail-Adresse und melde dich dann an.');
            else void runSync();
          }} />
        </Card>
      </ScrollView>
    );

  const search = async () => {
    const { data } = await supabase!.from('profiles').select('*').ilike('username', `%${q.toLowerCase()}%`).neq('id', me).limit(20);
    setFound((data ?? []) as Pub[]);
  };
  const refresh = () => { void load(); void refreshIncoming(); };
  const request = async (id: string) => {
    const { error } = await supabase!.from('friendships').insert({ requester: me, addressee: id });
    notify(error ? 'Fehler' : 'Anfrage gesendet', error ? friendlyAuthError(error.message, supabaseHost) : '');
    refresh();
  };
  const accept = async (requester: string) => {
    const { error } = await supabase!.from('friendships').update({ status: 'accepted' }).eq('requester', requester).eq('addressee', me);
    if (error) notify('Fehler', friendlyAuthError(error.message, supabaseHost));
    refresh();
  };
  /** Ablehnen und Zurückziehen löschen die Anfrage; sie verschwindet bei beiden. */
  const dropRequest = async (requester: string, addressee: string) => {
    const { error } = await supabase!.from('friendships').delete().eq('requester', requester).eq('addressee', addressee).eq('status', 'pending');
    if (error) notify('Fehler', friendlyAuthError(error.message, supabaseHost));
    refresh();
  };
  const other = (f: Fs) => people[f.requester === me ? f.addressee : f.requester];
  /** «Name» und «@benutzername»; fehlt der Name, wird das sichtbar gesagt. */
  const who = (p?: Pub) => (
    <>
      <Text style={{ fontWeight: '700', color: colors.text }}>{p?.name || (p ? 'Kein Name hinterlegt' : '…')}</Text>
      <Text style={{ color: colors.mute, fontSize: 12 }}>{p ? `@${p.username}` : ''}{p?.handicap_index != null ? ` · HCP ${p.handicap_index}` : ''}</Text>
    </>
  );

  const incoming = fs.filter((f) => f.status === 'pending' && f.addressee === me);
  const outgoing = fs.filter((f) => f.status === 'pending' && f.requester === me);
  const friends = fs.filter((f) => f.status === 'accepted');

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }} keyboardShouldPersistTaps="handled">
      {!profile.username && <Card><Text style={{ color: colors.bad }}>Lege im Profil einen Benutzernamen fest, damit dich andere finden.</Text></Card>}

      {incoming.length > 0 && (
        <Card style={{ borderColor: colors.green, borderWidth: 2, backgroundColor: colors.light }}>
          <H>{incoming.length === 1 ? 'Neue Freundschaftsanfrage' : `${incoming.length} neue Freundschaftsanfragen`}</H>
          {incoming.map((f) => (
            <View key={f.requester} style={{ paddingVertical: 8, borderTopWidth: 0.5, borderColor: colors.line }}>
              {who(people[f.requester])}
              <Row style={{ gap: 8, marginTop: 6 }}>
                <View style={{ flex: 1 }}><Btn title="Annehmen" onPress={() => accept(f.requester)} /></View>
                <View style={{ flex: 1 }}><Btn kind="danger" title="Ablehnen" onPress={() => dropRequest(f.requester, me)} /></View>
              </Row>
            </View>
          ))}
        </Card>
      )}

      <Card>
        <H>Spieler suchen</H>
        <Field label="Benutzername" value={q} onChangeText={setQ} autoCapitalize="none" onSubmitEditing={search} />
        <Btn kind="ghost" title="Suchen" onPress={search} />
        {found.map((p) => (
          <Row key={p.id} style={{ justifyContent: 'space-between', paddingVertical: 6, gap: 8 }}>
            <View style={{ flex: 1, minWidth: 0 }}>{who(p)}</View>
            <Btn title="Anfragen" onPress={() => request(p.id)} />
          </Row>
        ))}
      </Card>

      <Card>
        <H>Freunde</H>
        {friends.length === 0 && <Text style={{ color: colors.mute }}>Noch keine Freunde.</Text>}
        {friends.map((f) => {
          const p = other(f);
          return (
            <Pressable key={f.requester + f.addressee} onPress={() => p && navigation.navigate('FriendDetail', { user: p })}
              style={{ paddingVertical: 8, borderTopWidth: 0.5, borderColor: colors.line }}>
              {who(p)}
            </Pressable>
          );
        })}
        {outgoing.length > 0 && (
          <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 0.5, borderColor: colors.line }}>
            <Text style={{ color: colors.mute, fontWeight: '600', marginBottom: 4 }}>Gesendete Anfragen (ausstehend)</Text>
            {outgoing.map((f) => (
              <Row key={f.addressee} style={{ justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flex: 1, minWidth: 0 }}>{who(people[f.addressee])}</View>
                <Btn kind="ghost" title="Zurückziehen" onPress={() => confirmDialog('Anfrage zurückziehen?', people[f.addressee]?.name || people[f.addressee]?.username || '', 'Zurückziehen', () => dropRequest(f.requester, f.addressee), true)} />
              </Row>
            ))}
          </View>
        )}
      </Card>
      <Btn kind="ghost" title="Abmelden" onPress={() => supabase!.auth.signOut()} />
    </ScrollView>
  );
}
