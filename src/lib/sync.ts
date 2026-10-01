import { Profile, Round } from '../types';
import { supabase } from './supabase';

async function uid() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Best-effort: ohne Login/Backend passiert nichts, lokale Daten bleiben die Quelle der Wahrheit. */
export async function pushProfile(p: Profile) {
  const id = await uid();
  if (!supabase || !id || !p.username) return;
  await supabase.from('profiles').upsert({
    id,
    username: p.username.toLowerCase(),
    name: p.name,
    handicap_index: p.handicapIndex,
  });
  await supabase.from('profile_details').upsert({ id, data: p });
}

export async function pushRound(r: Round) {
  const id = await uid();
  if (!supabase || !id) return;
  await supabase.from('rounds').upsert({
    id: r.id,
    user_id: id,
    course_id: r.courseId,
    played_at: r.date,
    data: r,
  });
}
