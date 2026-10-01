import test from 'node:test';
import assert from 'node:assert/strict';
import { profileRows, roundRow } from '../src/lib/syncRows';
import { defaultProfile } from '../src/store/defaultProfile';
import { Round } from '../src/types';

test('Profil-Übertragung (Voreinstellung): Name und Handicap öffentlich, Details inkl. Ballvorrat für Freunde', () => {
  const p = { ...defaultProfile, name: 'Anna Muster', username: 'Anna_M', handicapIndex: 18.4, ballCount: 7, clubBrand: 'Ping' };
  const rows = profileRows('uid-1', p);
  assert.deepEqual(rows.profile, { id: 'uid-1', username: 'anna_m', name: 'Anna Muster', handicap_index: 18.4, public_data: {} });
  assert.equal(rows.details.id, 'uid-1');
  assert.equal((rows.details.data as typeof p).ballCount, 7);
  assert.equal((rows.details.data as typeof p).clubBrand, 'Ping');
});

test('Runden-Zeile', () => {
  const r = { id: 'r1', courseId: 'c', courseName: 'C', teeId: 'back', date: '2026-06-01T09:00:00.000Z', handicapIndex: 10, courseHandicap: 10, holes: [], completed: true } as Round;
  assert.deepEqual(roundRow('u', r), { id: 'r1', user_id: 'u', course_id: 'c', played_at: '2026-06-01T09:00:00.000Z', data: r });
});
