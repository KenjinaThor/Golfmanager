import { create } from 'zustand';
import { Profile, Round } from '../types';
import { supabase } from './supabase';
import { profileRows, roundRow } from './syncRows';
import { mergeProfile, mergeRounds } from './syncMerge';
import { friendlySyncError } from './supabaseConfig';

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
  const c = a.error || b?.error ? null : await supabase.from('profile_private').upsert(rows.privateRow);
  const err = a.error ?? b?.error ?? c?.error;
  if (err) {
    setInfo({ state: 'error', message: `Profil konnte nicht übertragen werden: ${friendlySyncError(err.message)}`, busy: false });
    return false;
  }
  setInfo({ state: 'ok', message: 'Profil übertragen.', at: Date.now(), busy: false });
  return true;
}

export async function pushRound(r: Round): Promise<boolean> {
  return pushRounds([r]);
}

/** true nur, wenn die Runden tatsächlich in der Cloud angekommen sind (nicht bei fehlender Anmeldung oder Konfiguration). */
export async function pushRounds(rounds: Round[]): Promise<boolean> {
  if (!supabase) return false;
  if (!rounds.length) return true;
  const id = await uid();
  if (!id) return false;
  const { error } = await supabase.from('rounds').upsert(rounds.map((r) => roundRow(id, r)));
  if (error) {
    setInfo({ state: 'error', message: `Runden konnten nicht übertragen werden: ${error.message}`, busy: false });
    return false;
  }
  return true;
}

export interface SyncInput {
  profile: Profile;
  rounds: Round[];
  syncedRoundIds: string[];
  deletedRoundIds: string[];
}
export interface SyncResult {
  profile: Profile;
  addRounds: Round[];
  removeRoundIds: string[];
  syncedRoundIds: string[];
  /** Löschungen, die in der Cloud erledigt sind */
  clearedDeletes: string[];
}

/**
 * Abgleich in beide Richtungen (nach Anmeldung, App-Start, «Jetzt übertragen»):
 * holt Profil und Runden aus der Cloud, führt sie mit dem Gerät zusammen und lädt Neues hoch.
 * Gibt null zurück, wenn etwas schiefging (Grund in useSyncInfo); lokal wird dann nichts verändert.
 */
export async function syncAll(i: SyncInput): Promise<SyncResult | null> {
  if (!supabase) return null;
  const me = await uid();
  if (!me) {
    setInfo({ state: 'idle', message: 'Nicht angemeldet: Die Daten bleiben auf diesem Gerät.' });
    return null;
  }
  setInfo({ busy: true });
  const fail = (what: string, message: string) => {
    setInfo({ state: 'error', message: `${what}: ${message}`, busy: false });
    return null;
  };

  // 1. Cloud lesen (eigene Daten; RLS würde sonst auch Freunde liefern)
  const det = await supabase.from('profile_details').select('data').eq('id', me).maybeSingle();
  if (det.error) return fail('Profil laden fehlgeschlagen', det.error.message);
  const priv = await supabase.from('profile_private').select('data').eq('id', me).maybeSingle();
  if (priv.error) return fail('Profil laden fehlgeschlagen', priv.error.message);
  const rem = await supabase.from('rounds').select('data').eq('user_id', me);
  if (rem.error) return fail('Runden laden fehlgeschlagen', rem.error.message);
  const cloudShared = (det.data?.data as Profile | undefined) ?? null;
  // eigene «Nur für mich»-Felder aus dem privaten Speicher dazunehmen
  const cloudProfile = cloudShared ? ({ ...cloudShared, ...(priv.data?.data as Partial<Profile> | undefined) } as Profile) : null;
  const remoteRounds = (rem.data ?? []).map((x) => x.data as Round);

  // 2. Zusammenführen
  const mp = mergeProfile(i.profile, cloudProfile);
  const mr = mergeRounds(i.rounds, remoteRounds, i.syncedRoundIds, i.deletedRoundIds);

  // 3. Lokal gelöschte Runden in der Cloud löschen, Neues hochladen
  const cleared: string[] = [];
  if (mr.deleteRemote.length) {
    const del = await supabase.from('rounds').delete().in('id', mr.deleteRemote);
    if (!del.error) cleared.push(...mr.deleteRemote);
  }
  if (mr.upload.length) {
    const up = await supabase.from('rounds').upsert(mr.upload.map((r) => roundRow(me, r)));
    if (up.error) return fail('Runden hochladen fehlgeschlagen', up.error.message);
  }
  if (mp.push && !(await pushProfile(mp.profile))) return null;

  const parts = [mp.fromCloud ? 'Profil aus der Cloud geladen' : 'Profil abgeglichen'];
  if (mr.add.length) parts.push(`${mr.add.length} Runde${mr.add.length === 1 ? '' : 'n'} geladen`);
  if (mr.upload.length) parts.push(`${mr.upload.length} hochgeladen`);
  if (mr.removeIds.length) parts.push(`${mr.removeIds.length} entfernt (anderswo gelöscht)`);
  setInfo({ state: 'ok', message: parts.join(', ') + '.', at: Date.now(), busy: false });
  return { profile: mp.profile, addRounds: mr.add, removeRoundIds: mr.removeIds, syncedRoundIds: mr.synced, clearedDeletes: cleared };
}

/** true, wenn die Runde in der Cloud gelöscht wurde (sonst bleibt die Löschung vorgemerkt und wird beim nächsten Abgleich erledigt). */
export async function deleteRemoteRound(id: string): Promise<boolean> {
  if (!supabase || !(await uid())) return false;
  const { error } = await supabase.from('rounds').delete().eq('id', id);
  return !error;
}

let timer: ReturnType<typeof setTimeout> | undefined;
/** Profil kurz verzögert übertragen (z. B. wenn sich während der Runde der Ballvorrat ändert). */
export function scheduleProfilePush(get: () => Profile, delayMs = 1500) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void pushProfile(get()), delayMs);
}
