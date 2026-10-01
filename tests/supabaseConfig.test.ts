import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCredentials, friendlyAuthError, oauthErrorFromUrl, resolveSupabaseConfig } from '../src/lib/supabaseConfig';

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

test('Netzwerkfehler werden verständlich erklärt, andere Fehler übersetzt', () => {
  const msg = friendlyAuthError('Failed to fetch', 'abc.supabase.co');
  assert.ok(msg.includes('abc.supabase.co') && msg.includes('nicht erreichbar'));
  assert.equal(friendlyAuthError('User already registered'), 'Diese E-Mail ist schon registriert. Bitte anmelden.');
  assert.equal(friendlyAuthError('Invalid login credentials'), 'E-Mail oder Passwort stimmt nicht.');
  assert.equal(friendlyAuthError('Etwas Unbekanntes'), 'Etwas Unbekanntes');
});

test('Eingaben werden vor dem Senden geprüft', () => {
  assert.equal(checkCredentials('a@b.ch', 'geheim1', false), null);
  assert.equal(checkCredentials('a@b.ch', '123', true), null); // Anmelden: Länge egal
  assert.ok(checkCredentials('a@b.ch', '123', false)?.includes('6 Zeichen'));
  assert.ok(checkCredentials('', '', true)?.includes('E-Mail und Passwort'));
  assert.ok(checkCredentials('keine-mail', 'geheim1', false)?.includes('nicht gültig'));
  assert.ok(friendlyAuthError('Anonymous sign-ins are disabled').includes('nicht angekommen'));
});

test('Google-Fehler: Provider nicht aktiviert und Rückkehr-Fehler werden erklärt', () => {
  assert.ok(friendlyAuthError('Unsupported provider: provider is not enabled').includes('Google'));
  assert.equal(oauthErrorFromUrl('', ''), null);
  assert.ok(oauthErrorFromUrl('#error=access_denied&error_description=Access+denied', '')?.includes('abgebrochen'));
  assert.ok(oauthErrorFromUrl('', '?error=server_error&error_description=redirect_uri_mismatch')?.includes('Weiterleitung'));
});
