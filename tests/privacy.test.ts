import test from 'node:test';
import assert from 'node:assert/strict';
import { ageFromBirthDate, effectiveAge, fullVisibility, parseBirthDate, sharedView, visibilityOf } from '../src/lib/privacy';
import { profileRows } from '../src/lib/syncRows';
import { defaultProfile } from '../src/store/defaultProfile';

const prof = (o: object) => ({ ...defaultProfile, ...o });
const base = prof({
  name: 'Anna Muster', username: 'Anna_M', handicapIndex: 18.4, ballCount: 7, clubBrand: 'Ping', homeClub: 'GC Test',
  heightCm: 170, driverDistance: 200, bio: 'Hallo', birthDate: '1990-05-17', updatedAt: 5,
});

test('Alter: Geburtstag heute, einen Tag davor und Schaltjahr', () => {
  assert.equal(ageFromBirthDate('1990-05-17', new Date(2026, 4, 17)), 36);
  assert.equal(ageFromBirthDate('1990-05-17', new Date(2026, 4, 16)), 35);
  assert.equal(ageFromBirthDate('2000-02-29', new Date(2026, 1, 28)), 25);
  assert.equal(ageFromBirthDate('2000-02-29', new Date(2026, 2, 1)), 26);
  assert.equal(ageFromBirthDate('2999-01-01', new Date(2026, 0, 1)), null);
  assert.equal(ageFromBirthDate('1990-02-31'), null);
});

test('Geburtsdatum eingeben: TT.MM.JJJJ, plausibel und gültig', () => {
  const now = new Date(2026, 9, 1);
  assert.equal(parseBirthDate('17.5.1990', now), '1990-05-17');
  assert.equal(parseBirthDate('17-05-1990', now), '1990-05-17');
  assert.equal(parseBirthDate('31.02.1990', now), null);
  assert.equal(parseBirthDate('01.01.2026', now), null); // zu jung
  assert.equal(parseBirthDate('01.01.1900', now), null); // zu alt
  assert.equal(parseBirthDate('abc', now), null);
});

test('Alter: aus dem Geburtsdatum, sonst der Wert aus der Cloud', () => {
  assert.equal(effectiveAge({ birthDate: '1990-05-17', age: 99 }, new Date(2026, 9, 1)), 36);
  assert.equal(effectiveAge({ birthDate: null, age: 41 }), 41);
  assert.equal(effectiveAge({}), null);
});

test('Voreinstellung: Name/Handicap öffentlich, alles andere nur für Freunde', () => {
  assert.equal(visibilityOf({}, 'name'), 'public');
  assert.equal(visibilityOf({}, 'handicapIndex'), 'public');
  assert.equal(visibilityOf({}, 'age'), 'friends');
  assert.equal(visibilityOf({ visibility: { age: 'private' } }, 'age'), 'private');
  assert.equal(Object.keys(fullVisibility({})).length, 12);
});

test('Das Geburtsdatum wird in keinem Fall übertragen', () => {
  for (const vis of ['private', 'friends', 'public'] as const) {
    const p = prof({ ...base, visibility: Object.fromEntries(Object.keys(fullVisibility({})).map((k) => [k, vis])) });
    const json = JSON.stringify([profileRows('u', p), sharedView(p)]);
    assert.ok(!json.includes('1990-05-17'), `Geburtsdatum in Übertragung (${vis})`);
    assert.ok(!/birthDate/i.test(json), `Feld birthDate in Übertragung (${vis})`);
  }
});

test('Alter wird übertragen, aber nur als Zahl und nur laut Sichtbarkeit', () => {
  const now = new Date();
  const age = effectiveAge(base, now)!;
  const friends = profileRows('u', base);
  assert.equal((friends.details.data as { age: number }).age, age);
  assert.deepEqual(friends.profile.public_data, {}); // Standard: Alter nur für Freunde
  const pub = profileRows('u', prof({ ...base, visibility: { age: 'public' } }));
  assert.deepEqual(pub.profile.public_data, { age });
  const priv = profileRows('u', prof({ ...base, visibility: { age: 'private' } }));
  assert.ok(!('age' in (priv.details.data as object)));
  assert.deepEqual(priv.profile.public_data, {});
});

test('«Nur für mich»: Feld taucht nirgends auf; Name/Handicap werden dann auch in der öffentlichen Zeile geleert', () => {
  const p = prof({ ...base, visibility: { clubBrand: 'private', ballCount: 'private', name: 'private', handicapIndex: 'friends' } });
  const rows = profileRows('u', p);
  const { privateRow, ...shared } = rows;
  const json = JSON.stringify(shared);
  assert.ok(!json.includes('Ping') && !json.includes('"ballCount":7'), 'Wert eines privaten Feldes übertragen');
  assert.equal((rows.details.data as { visibility: Record<string, string> }).visibility.ballCount, 'private'); // Einstellung geht mit, damit ein zweites Gerät nichts versehentlich freigibt
  // stattdessen im privaten Speicher (nur für den Besitzer lesbar)
  const pd = privateRow.data as Record<string, unknown>;
  assert.equal(pd.ballCount, 7);
  assert.equal(pd.name, base.name);
  assert.ok(!('handicapIndex' in pd) && !('birthDate' in pd));
  assert.equal(rows.profile.name, '');
  assert.equal(rows.profile.handicap_index, null); // nur für Freunde → nicht in der öffentlichen Zeile
  assert.ok(!('name' in (rows.details.data as object)));
  assert.equal((rows.details.data as { handicapIndex: number }).handicapIndex, 18.4); // Freunde sehen es in den Details
});

test('Öffentliche Felder stehen in public_data, Freundes-Felder nicht', () => {
  const rows = profileRows('u', prof({ ...base, visibility: { homeClub: 'public', clubBrand: 'friends' } }));
  assert.deepEqual(rows.profile.public_data, { homeClub: 'GC Test' });
  assert.equal((rows.details.data as { clubBrand: string }).clubBrand, 'Ping');
  assert.equal((rows.details.data as { homeClub: string }).homeClub, 'GC Test'); // Freunde sehen auch Öffentliches
});
