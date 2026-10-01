import { create } from 'zustand';
import { supabase } from './supabase';

/** Anzahl offener, an mich gerichteter Freundschaftsanfragen (für das Zeichen am Reiter «Freunde»). */
export const useFriends = create<{ incoming: number }>(() => ({ incoming: 0 }));

export async function refreshIncoming(): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  const me = data.session?.user.id;
  if (!me) {
    useFriends.setState({ incoming: 0 });
    return;
  }
  const { count, error } = await supabase
    .from('friendships')
    .select('requester', { count: 'exact', head: true })
    .eq('addressee', me)
    .eq('status', 'pending');
  if (!error) useFriends.setState({ incoming: count ?? 0 });
}

/** Filter zum Löschen einer Freundschaft in beide Richtungen. */
export const bothWays = (a: string, b: string) => `and(requester.eq.${a},addressee.eq.${b}),and(requester.eq.${b},addressee.eq.${a})`;
