import React, { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { HoleStatsTable } from '../components/Tables';
import { Card, H, colors, fmtDate } from '../components/ui';
import { getCourse } from '../data/courses';
import { holeStats, roundTotals } from '../lib/scoring';
import { supabase } from '../lib/supabase';
import { Profile, Round } from '../types';

export default function FriendDetailScreen({ route }: any) {
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
  return (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      <Card>
        <H>{user.name || user.username}</H>
        {details ? (
          <>
            <Text>Handicap-Index: {details.handicapIndex} · Heimclub: {details.homeClub || '-'}</Text>
            <Text>Grösse: {details.heightCm ?? '-'} cm · Spielhand: {details.handedness === 'left' ? 'Links' : 'Rechts'}</Text>
            <Text>Schläger: {details.clubBrand || '-'} · Ball: {details.ballBrand || '-'} ({details.ballCount} im Bag)</Text>
            <Text>Driver: {details.driverDistance ?? '-'} m</Text>
            {!!details.bio && <Text style={{ marginTop: 6 }}>{details.bio}</Text>}
          </>
        ) : <Text style={{ color: colors.mute }}>Keine Details hinterlegt.</Text>}
      </Card>
      {course && courseId && (
        <Card>
          <H>Pro Loch: {course.name}</H>
          <HoleStatsTable stats={holeStats(rounds, courseId, course.holes.length)} par={course.holes.map((h) => h.par)} />
        </Card>
      )}
      <Card>
        <H>Runden</H>
        {rounds.map((r) => {
          const t = roundTotals(r, getCourse(r.courseId)?.holes ?? []);
          return (
            <Text key={r.id} style={{ paddingVertical: 4 }}>
              {fmtDate(r.date)} · {r.courseName} · Brutto {t.gross} · Stbf {t.stableford}
            </Text>
          );
        })}
        {!rounds.length && <Text style={{ color: colors.mute }}>Noch keine Runden.</Text>}
      </Card>
    </ScrollView>
  );
}
