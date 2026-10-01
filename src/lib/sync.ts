import { create } from 'zustand';
import { Profile, Round } from '../types';
import { supabase } from './supabase';
import { profileRows, roundRow } from './syncRows';

export interface SyncInfo {
  state: 'idle' | 'ok' | 'error';
  message: string;
  at: number | null;
  busy: boolean;
}

/** Ergebnis der letzten Übertragung (wird im Profil angezeigt). */
export const useSyncInfo = create<SyncInfo>(() => ({ state: 'idle', message: 'Noch nichts übertragen.', at: null, busy: false }));
const setInfo = (p: Partial<SyncInfo>) => useSyncInfo.setState(p);

async function uid() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Profil übertragen. Gibt true zurück, wenn alles ankam; der Grund bei false steht in useSyncInfo. */
export async function pushProfile(p: Profile): Promise<boolean> {
  if (!supabase) return false;
  const id = await uid();
  if (!id) {
    setInfo({ state: 'idle', message: 'Nicht angemeldet: Die Daten bleiben auf diesem Gerät.' });
    return false;
  }
  if (!p.username) {
    setInfo({ state: 'idle', message: 'Benutzername fehlt: Es wird noch nichts übertragen.' });
    return false;
  }
  setInfo({ busy: true });
  const rows = profileRows(id, p);
  const a = await supabase.from('profiles').upsert(rows.profile);
  const b = a.error ? null : await supabase.from('profile_details').upsert(rows.details);
  const err = a.error ?? b?.error;
  if (err) {
    setInfo({ state: 'error', message: `Profil konnte nicht übertragen werden: ${err.message}`, busy: false });
    return false;
  }
  setInfo({ state: 'ok', message: 'Profil übertragen.', at: Date.now(), busy: false });
  return true;
}

export async function pushRound(r: Round): Promise<boolean> {
  return pushRounds([r]);
}

export async function pushRounds(rounds: Round[]): Promise<boolean> {
  if (!supabase || !rounds.length) return true;
  const id = await uid();
  if (!id) return false;
  const { error } = await supabase.from('rounds').upsert(rounds.map((r) => roundRow(id, r)));
  if (error) {
    setInfo({ state: 'error', message: `Runden konnten nicht übertragen werden: ${error.message}`, busy: false });
    return false;
  }
  return true;
}

/** Profil und alle abgeschlossenen Runden abgleichen (nach Anmeldung, beim Start und auf Knopfdruck). */
export async function syncAll(profile: Profile, rounds: Round[]): Promise<boolean> {
  const ok = await pushProfile(profile);
  if (!ok) return false;
  const roundsOk = await pushRounds(rounds);
  if (roundsOk) setInfo({ state: 'ok', message: `Profil und ${rounds.length} Runde${rounds.length === 1 ? '' : 'n'} übertragen.`, at: Date.now(), busy: false });
  return roundsOk;
}

export async function deleteRemoteRound(id: string): Promise<void> {
  if (!supabase || !(await uid())) return;
  await supabase.from('rounds').delete().eq('id', id);
}

let timer: ReturnType<typeof setTimeout> | undefined;
/** Profil kurz verzögert übertragen (z. B. wenn sich während der Runde der Ballvorrat ändert). */
export function scheduleProfilePush(get: () => Profile, delayMs = 1500) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void pushProfile(get()), delayMs);
}
