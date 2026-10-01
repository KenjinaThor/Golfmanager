import { Profile, SharedField, Visibility } from '../types';

/** Felder, deren Sichtbarkeit einstellbar ist, mit Anzeigename. */
export const SHARED_FIELDS: { key: SharedField; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'handicapIndex', label: 'Handicap-Index' },
  { key: 'age', label: 'Alter' },
  { key: 'homeClub', label: 'Heimclub' },
  { key: 'heightCm', label: 'Grösse' },
  { key: 'gender', label: 'Wertung (Herren/Damen)' },
  { key: 'handedness', label: 'Spielhand' },
  { key: 'clubBrand', label: 'Schläger-Marke' },
  { key: 'ballBrand', label: 'Ball-Marke' },
  { key: 'ballCount', label: 'Anzahl Bälle' },
  { key: 'driverDistance', label: 'Driver-Distanz' },
  { key: 'bio', label: 'Über mich' },
];

/** Voreinstellung: Name und Handicap öffentlich (Suche), alles andere nur für Freunde. */
export const DEFAULT_VISIBILITY: Record<SharedField, Visibility> = {
  name: 'public', handicapIndex: 'public', age: 'friends', homeClub: 'friends', heightCm: 'friends', gender: 'friends',
  handedness: 'friends', clubBrand: 'friends', ballBrand: 'friends', ballCount: 'friends', driverDistance: 'friends', bio: 'friends',
};

export const VISIBILITY_LABEL: Record<Visibility, string> = { private: 'Nur für mich', friends: 'Für Freunde', public: 'Öffentlich' };

export const visibilityOf = (p: Pick<Profile, 'visibility'>, k: SharedField): Visibility => p.visibility?.[k] ?? DEFAULT_VISIBILITY[k];

/** Vollständige Sichtbarkeitstabelle (Voreinstellung + eigene Wahl). */
export const fullVisibility = (p: Pick<Profile, 'visibility'>): Record<SharedField, Visibility> =>
  Object.fromEntries(SHARED_FIELDS.map((f) => [f.key, visibilityOf(p, f.key)])) as Record<SharedField, Visibility>;

/** Alter in Jahren zum Stichtag; null bei ungültigem oder zukünftigem Datum. */
export function ageFromBirthDate(birth: string, now = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth);
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)) age--;
  return age >= 0 ? age : null;
}

/** «TT.MM.JJJJ» (auch mit - oder /) in JJJJ-MM-TT umwandeln; null, wenn ungültig oder unplausibel (Alter 3–110). */
export function parseBirthDate(input: string, now = new Date()): string | null {
  const m = /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/.exec(input.trim());
  if (!m) return null;
  const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const age = ageFromBirthDate(iso, now);
  return age != null && age >= 3 && age <= 110 ? iso : null;
}

/** Alter, das angezeigt und übertragen wird: aus dem Geburtsdatum, sonst der Wert aus der Cloud. */
export const effectiveAge = (p: Pick<Profile, 'birthDate' | 'age'>, now = new Date()): number | null =>
  (p.birthDate ? ageFromBirthDate(p.birthDate, now) : null) ?? p.age ?? null;

/** Wert eines Feldes, so wie er weitergegeben würde. */
function valueOf(p: Profile, k: SharedField): string | number | null {
  switch (k) {
    case 'age': return effectiveAge(p);
    case 'heightCm': return p.heightCm;
    case 'driverDistance': return p.driverDistance;
    default: return p[k as 'name'] as string | number;
  }
}

/**
 * Was für andere sichtbar wird:
 * - `publicData`: öffentliche Felder ausser Name und Handicap (die stehen in eigenen Spalten)
 * - `details`: alles, was Freunde sehen dürfen (öffentliche und Freundes-Felder) plus die Sichtbarkeitstabelle
 * - `privateData`: «Nur für mich»-Felder; kommen in eine Tabelle, die nur der Besitzer lesen kann (Abgleich zwischen eigenen Geräten)
 * Das Geburtsdatum ist nirgends enthalten.
 */
export function sharedView(p: Profile) {
  const vis = fullVisibility(p);
  const publicData: Record<string, unknown> = {};
  const privateData: Record<string, unknown> = {};
  const details: Record<string, unknown> = { username: p.username, visibility: vis, updatedAt: p.updatedAt ?? null };
  for (const { key } of SHARED_FIELDS) {
    const v = vis[key];
    const value = valueOf(p, key);
    if (v === 'private') {
      privateData[key] = value;
      continue;
    }
    details[key] = value;
    if (v === 'public' && key !== 'name' && key !== 'handicapIndex') publicData[key] = value;
  }
  return {
    publicName: vis.name === 'public' ? p.name : '',
    publicHandicap: vis.handicapIndex === 'public' ? p.handicapIndex : null,
    publicData,
    privateData,
    details,
  };
}
