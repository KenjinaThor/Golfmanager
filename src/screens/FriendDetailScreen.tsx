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
        <H>{user.name || details?.name || 'Kein Name hinterlegt'}</H>
        <Text style={{ color: colors.mute, marginBottom: 6 }}>@{user.username}</Text>
        {details ? (
          <>
            <Text>Handicap-Index: {details.handicapIndex} · Heimclub: {details.homeClub || '-'}</Text>
            <Text>Grösse: {details.heightCm ?? '-'} cm · Spielhand: {details.handedness === 'left' ? 'Links' : 'Rechts'}</Text>
            <Text>Schläger: {details.clubBrand || '-'} · Ball: {details.ballBrand || '-'}</Text>
            <Text>Bälle im Bag: {details.ballCount ?? '-'}</Text>
            <Text>Driver: {details.driverDistance ?? '-'} m</Text>
            {!!details.bio && <Text style={{ marginTop: 6 }}>{details.bio}</Text>}
          </>
        ) : <Text style={{ color: colors.mute }}>Keine Details hinterlegt.</Text>}
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
