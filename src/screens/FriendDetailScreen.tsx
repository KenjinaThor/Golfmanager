import React, { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { HoleStatsTable } from '../components/Tables';
import { Btn, Card, H, colors, confirmDialog, fmtDate, notify } from '../components/ui';
import { bothWays, refreshIncoming } from '../lib/friends';
import { getCourse } from '../data/courses';
import { holeStats, roundLabels, roundTotals } from '../lib/scoring';
import { supabase } from '../lib/supabase';
import { Profile, Round } from '../types';

export default function FriendDetailScreen({ route, navigation }: any) {
  const user = route.params.user as { id: string; username: string; name: string };
  const [details, setDetails] = useState<Profile | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [courseId, setCourseId] = useState<string>();

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data: d } = await supabase.from('profile_details').select('data').eq('id', user.id).maybeSingle();
      setDetails((d?.data as Profile) ?? null);
      const { data: r } = await supabase.from('rounds').select('data').eq('user_id', user.id).order('played_at', { ascending: false });
      const rs = (r ?? []).map((x) => x.data as Round);
      setRounds(rs);
      setCourseId(rs[0]?.courseId);
    })();
  }, [user.id]);

  /** Nur Angaben, die der Spieler für Freunde freigegeben hat (andere fehlen in den Daten). */
  const shared: [string, string | number][] = details
    ? ([
        ['Alter', details.age != null ? `${details.age} Jahre` : null],
        ['Handicap-Index', details.handicapIndex ?? null],
        ['Heimclub', details.homeClub || null],
        ['Grösse', details.heightCm != null ? `${details.heightCm} cm` : null],
        ['Wertung', details.gender ? (details.gender === 'ladies' ? 'Damen' : 'Herren') : null],
        ['Spielhand', details.handedness ? (details.handedness === 'left' ? 'Links' : 'Rechts') : null],
        ['Schläger', details.clubBrand || null],
        ['Ball', details.ballBrand || null],
        ['Bälle im Bag', details.ballCount ?? null],
        ['Driver', details.driverDistance != null ? `${details.driverDistance} m` : null],
      ] as [string, string | number | null][]).filter((r): r is [string, string | number] => r[1] != null)
    : [];
  const course = courseId ? getCourse(courseId) : undefined;
  const labels = roundLabels(rounds);

  /** Löscht die Verbindung in beide Richtungen: danach sehen sich beide nicht mehr. */
  const remove = () =>
    confirmDialog('Freund entfernen?', `${user.name || user.username} wird aus deinen Freunden entfernt. Ihr seht euch danach gegenseitig nicht mehr.`, 'Entfernen', async () => {
      const { data: sess } = await supabase!.auth.getSession();
      const me = sess.session?.user.id;
      if (!me) return;
      const { error } = await supabase!.from('friendships').delete().or(bothWays(me, user.id));
      if (error) { notify('Fehler', error.message); return; }
      void refreshIncoming();
      navigation.goBack();
    }, true);
  return (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      <Card>
        <H>{user.name || details?.name || 'Name nicht freigegeben'}</H>
        <Text style={{ color: colors.mute, marginBottom: 6 }}>@{user.username}</Text>
        {details ? (
          <>
            {shared.length ? shared.map(([label, value]) => <Text key={label}>{label}: {value}</Text>) : <Text style={{ color: colors.mute }}>Dieser Spieler teilt keine weiteren Angaben.</Text>}
            {!!details.bio && <Text style={{ marginTop: 6 }}>{details.bio}</Text>}
          </>
        ) : <Text style={{ color: colors.mute }}>Keine Details freigegeben.</Text>}
      </Card>
      {course && courseId && (
        <Card>
          <H>Pro Loch: {course.name}</H>
          <HoleStatsTable stats={holeStats(rounds, courseId, course.holes.length)} par={course.holes.map((h) => h.par)} labels={labels} />
        </Card>
      )}
      <Card>
        <H>Runden</H>
        {rounds.map((r) => {
          const t = roundTotals(r, getCourse(r.courseId)?.holes ?? []);
          return (
            <Text key={r.id} style={{ paddingVertical: 4 }}>
              {fmtDate(r.date)}{labels[r.id] ? ` (${labels[r.id]})` : ''} · {r.courseName} · Brutto {t.gross} · Stbf {t.stableford}
            </Text>
          );
        })}
        {!rounds.length && <Text style={{ color: colors.mute }}>Noch keine Runden.</Text>}
      </Card>
      <Btn kind="danger" title="Freund entfernen" onPress={remove} />
    </ScrollView>
  );
}
