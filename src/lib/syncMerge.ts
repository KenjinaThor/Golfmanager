import { Profile, Round } from '../types';

/** Ein Profil ohne Eingaben (frisch installiert): hier gewinnt immer der Stand aus der Cloud. */
const isBlank = (p: Profile) => !p.username && !p.name && !p.updatedAt;

/** Profil abgleichen: der neuere Stand gewinnt; auf einem neuen Gerät wird der Cloud-Stand übernommen. */
export function mergeProfile(local: Profile, cloud: Profile | null): { profile: Profile; push: boolean } {
  if (!cloud) return { profile: local, push: !!local.username };
  if (isBlank(local)) return { profile: cloud, push: false };
  const lu = local.updatedAt ?? 0;
  const cu = cloud.updatedAt ?? 0;
  if (cu > lu) return { profile: cloud, push: false };
  // lokal neuer oder gleich alt: lokal behalten; Cloud ohne Zeitstempel (ältere Version) wird dabei aufgefrischt
  return { profile: local, push: !!local.username && (lu > cu || !cloud.updatedAt) };
}

export interface RoundMerge {
  /** in der Cloud vorhanden, lokal nicht: hinzufügen */
  add: Round[];
  /** auf einem anderen Gerät gelöscht (früher synchronisiert, jetzt in der Cloud weg): lokal entfernen */
  removeIds: string[];
  /** lokal neu, noch nie hochgeladen: hochladen */
  upload: Round[];
  /** lokal gelöscht: in der Cloud löschen */
  deleteRemote: string[];
  /** nach erfolgreichem Abgleich alle Runden, die in der Cloud liegen */
  synced: string[];
}

/**
 * Runden abgleichen, ohne dass gelöschte Runden wieder auftauchen:
 * - `synced` = Runden, die dieses Gerät schon einmal in der Cloud gesehen hat
 * - `deleted` = lokal gelöschte Runden, deren Löschung in der Cloud noch aussteht
 */
export function mergeRounds(local: Round[], remote: Round[], synced: string[], deleted: string[]): RoundMerge {
  const L = new Set(local.map((r) => r.id));
  const R = new Set(remote.map((r) => r.id));
  const S = new Set(synced);
  const D = new Set(deleted);
  const add = remote.filter((r) => !L.has(r.id) && !D.has(r.id));
  const removeIds = local.filter((r) => S.has(r.id) && !R.has(r.id)).map((r) => r.id);
  const upload = local.filter((r) => !R.has(r.id) && !S.has(r.id));
  const inCloud = new Set([...R].filter((id) => !D.has(id)));
  for (const r of upload) inCloud.add(r.id);
  return { add, removeIds, upload, deleteRemote: [...D], synced: [...inCloud] };
}
