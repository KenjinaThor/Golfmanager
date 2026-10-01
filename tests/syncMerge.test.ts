import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeProfile, mergeRounds } from '../src/lib/syncMerge';
import { defaultProfile } from '../src/store/defaultProfile';
import { Round } from '../src/types';

const round = (id: string, date = '2026-06-01T09:00:00.000Z'): Round => ({
  id, courseId: 'c', courseName: 'C', teeId: 'back', date, handicapIndex: 10, courseHandicap: 10, completed: true, holes: [],
});
const prof = (o: object) => ({ ...defaultProfile, ...o });

test('neues Gerät (leeres Profil) übernimmt das Profil aus der Cloud', () => {
  const cloud = prof({ name: 'Anna', username: 'anna', ballCount: 7, updatedAt: 50 });
  const r = mergeProfile(defaultProfile, cloud);
  assert.deepEqual({ ...r.profile, birthDate: undefined }, { ...cloud, birthDate: undefined });
  assert.equal(r.push, false);
});

test('auch ein älteres Cloud-Profil ohne Zeitstempel wird auf einem leeren Gerät übernommen', () => {
  const cloud = prof({ name: 'Anna', username: 'anna', ballCount: 7 });
  assert.equal(mergeProfile(defaultProfile, cloud).profile.name, 'Anna');
});

test('der neuere Stand gewinnt, der ältere wird überschrieben', () => {
  const local = prof({ name: 'A', username: 'a', updatedAt: 100 });
  const cloudOld = prof({ name: 'B', username: 'a', updatedAt: 50 });
  const cloudNew = prof({ name: 'C', username: 'a', updatedAt: 150 });
  assert.deepEqual(mergeProfile(local, cloudOld), { profile: local, push: true, fromCloud: false });
  assert.deepEqual(mergeProfile(local, cloudNew), { profile: { ...cloudNew, birthDate: null }, push: false, fromCloud: true });
  assert.deepEqual(mergeProfile(local, { ...local }), { profile: local, push: false, fromCloud: false });
});

test('ohne Cloud-Profil wird das lokale hochgeladen, aber nur mit Benutzernamen', () => {
  assert.equal(mergeProfile(prof({ username: 'a', name: 'A' }), null).push, true);
  assert.equal(mergeProfile(defaultProfile, null).push, false);
});

test('Runden: neues Gerät lädt alle Runden aus der Cloud', () => {
  const m = mergeRounds([], [round('a'), round('b')], [], []);
  assert.deepEqual(m.add.map((r) => r.id).sort(), ['a', 'b']);
  assert.deepEqual(m.synced.sort(), ['a', 'b']);
  assert.equal(m.upload.length + m.removeIds.length, 0);
});

test('Runden: lokal neue Runden werden hochgeladen', () => {
  const m = mergeRounds([round('a'), round('n')], [round('a')], ['a'], []);
  assert.deepEqual(m.upload.map((r) => r.id), ['n']);
  assert.deepEqual(m.synced.sort(), ['a', 'n']);
});

test('Runden: anderswo gelöschte Runde verschwindet lokal und wird nicht neu hochgeladen', () => {
  const m = mergeRounds([round('a'), round('b')], [round('a')], ['a', 'b'], []);
  assert.deepEqual(m.removeIds, ['b']);
  assert.equal(m.upload.length, 0);
});

test('Runden: lokal gelöschte Runde wird in der Cloud gelöscht und nicht wieder geladen', () => {
  const m = mergeRounds([round('a')], [round('a'), round('x')], ['a', 'x'], ['x']);
  assert.deepEqual(m.deleteRemote, ['x']);
  assert.equal(m.add.length, 0);
  assert.deepEqual(m.synced, ['a']);
});

test('Runden: nie synchronisierte lokale Runde wird nicht fälschlich als gelöscht entfernt', () => {
  const m = mergeRounds([round('neu')], [], [], []);
  assert.deepEqual(m.removeIds, []);
  assert.deepEqual(m.upload.map((r) => r.id), ['neu']);
});

test('Abgleich: Privates und das Geburtsdatum bleiben lokal, wenn die Cloud neuer ist', () => {
  const local = prof({ name: 'A', username: 'a', updatedAt: 100, birthDate: '1990-05-17', clubBrand: 'GeheimMarke' });
  const cloud = { ...prof({ name: 'B', username: 'a', updatedAt: 200 }) } as Record<string, unknown>;
  delete cloud.clubBrand; // «Nur für mich»: nicht in der Cloud
  const r = mergeProfile(local, cloud as never);
  assert.equal(r.profile.name, 'B');
  assert.equal(r.profile.clubBrand, 'GeheimMarke');
  assert.equal(r.profile.birthDate, '1990-05-17');
});
