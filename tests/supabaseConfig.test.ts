import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSupabaseConfig } from '../src/lib/supabaseConfig';

test('nicht konfiguriert → null (App läuft lokal)', () => {
  assert.equal(resolveSupabaseConfig('', ''), null);
  assert.equal(resolveSupabaseConfig(undefined, undefined), null);
});

test('gültige Werte; Leerzeichen, Anführungszeichen, /rest/v1 und Schrägstrich werden bereinigt', () => {
  assert.deepEqual(resolveSupabaseConfig(' "https://abc.supabase.co/rest/v1/" ', ' sb_publishable_x\n'), { url: 'https://abc.supabase.co', key: 'sb_publishable_x' });
});

test('ungültige Adresse oder fehlender Wert → Fehlertext statt Absturz', () => {
  assert.ok('error' in (resolveSupabaseConfig('abcdefghij', 'k') as object));
  assert.ok('error' in (resolveSupabaseConfig('https://abc.supabase.co', '') as object));
  assert.ok('error' in (resolveSupabaseConfig('', 'k') as object));
});

test('geheime Schlüssel werden abgelehnt', () => {
  assert.ok('error' in (resolveSupabaseConfig('https://abc.supabase.co', 'sb_secret_abc') as object));
  const jwt = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.sig`;
  assert.ok('error' in (resolveSupabaseConfig('https://abc.supabase.co', jwt('service_role')) as object));
  assert.deepEqual(resolveSupabaseConfig('https://abc.supabase.co', jwt('anon')), { url: 'https://abc.supabase.co', key: jwt('anon') });
});
