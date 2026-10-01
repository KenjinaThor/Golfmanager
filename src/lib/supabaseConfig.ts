export type SupabaseConfig = { url: string; key: string } | { error: string } | null;

const clean = (v?: string) => (v ?? '').trim().replace(/^["']+|["']+$/g, '').trim();

/** Prüft die Supabase-Werte und räumt Tippfehler auf (Leerzeichen, Anführungszeichen, /rest/v1, Schrägstrich am Ende). */
export function resolveSupabaseConfig(rawUrl?: string, rawKey?: string): SupabaseConfig {
  const key = clean(rawKey);
  const url = clean(rawUrl).replace(/\/(rest|auth|storage)\/v1.*$/i, '').replace(/\/+$/, '');
  if (!url && !key) return null; // nicht konfiguriert: App läuft rein lokal

  if (!url) return { error: 'EXPO_PUBLIC_SUPABASE_URL fehlt.' };
  if (!key) return { error: 'EXPO_PUBLIC_SUPABASE_ANON_KEY fehlt.' };
  if (!/^https?:\/\/[^\s/]+\.[^\s/]+$/i.test(url))
    return { error: `Die Supabase-Adresse ist ungültig («${url.slice(0, 40)}»). Erwartet: https://<projekt>.supabase.co` };

  // Geheime Schlüssel dürfen nie in eine App: ablehnen statt verwenden.
  if (/^sb_secret_/i.test(key)) return { error: 'Das ist der geheime Schlüssel. Bitte den Publishable key verwenden.' };
  const payload = key.split('.')[1];
  if (key.startsWith('eyJ') && payload) {
    try {
      const role = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).role;
      if (role === 'service_role') return { error: 'Das ist der service_role-Schlüssel (geheim). Bitte den Publishable/anon key verwenden.' };
    } catch {
      /* kein lesbares JWT: Schlüssel unverändert verwenden */
    }
  }
  return { url, key };
}

/** Verständliche Meldung für typische Anmelde-/Netzwerkfehler. */
export function friendlyAuthError(message: string, host?: string | null): string {
  const m = message.toLowerCase();
  if (/failed to fetch|networkerror|load failed|network request failed/.test(m))
    return `Der Server${host ? ` «${host}»` : ''} ist nicht erreichbar.\n\nPrüfe:\n• Stimmt die Adresse im GitHub-Secret (Supabase → Connect)?\n• Blockiert Firmennetz, VPN oder Werbeblocker supabase.co? Teste mit mobilen Daten.\n• Ist das Supabase-Projekt aktiv (nicht pausiert)?`;
  if (/anonymous sign-ins are disabled/.test(m)) return 'E-Mail und Passwort sind nicht angekommen. Bitte beide Felder ausfüllen (Passwort mindestens 6 Zeichen).';
  if (/user already registered/.test(m)) return 'Diese E-Mail ist schon registriert. Bitte anmelden.';
  if (/email not confirmed/.test(m)) return 'Die E-Mail ist noch nicht bestätigt. Bitte den Link in der Bestätigungs-Mail öffnen.';
  if (/invalid login credentials/.test(m)) return 'E-Mail oder Passwort stimmt nicht.';
  if (/rate limit/.test(m)) return 'Zu viele E-Mails in kurzer Zeit. Bitte etwas warten und erneut versuchen.';
  if (/password should be at least/.test(m)) return 'Das Passwort braucht mindestens 6 Zeichen.';
  return message;
}

/** Eingaben vor dem Senden prüfen; liefert einen Hinweistext oder null, wenn alles passt. */
export function checkCredentials(email: string, password: string, login: boolean): string | null {
  if (!email && !password) return 'Bitte E-Mail und Passwort eingeben.';
  if (!email) return 'Bitte E-Mail eingeben.';
  if (!/^\S+@\S+\.\S+$/.test(email)) return 'Die E-Mail-Adresse ist nicht gültig.';
  if (!password) return 'Bitte Passwort eingeben.';
  if (!login && password.length < 6) return 'Das Passwort braucht mindestens 6 Zeichen.';
  return null;
}

/** Verständliche Meldung für Fehler beim Übertragen (z. B. wenn die Datenbank noch nicht aktualisiert wurde). */
export function friendlySyncError(message: string): string {
  if (/public_data/.test(message))
    return 'Die Datenbank ist noch nicht aktualisiert. Bitte das aktuelle SQL aus backend/schema.sql im Supabase SQL Editor ausführen.';
  return message;
}
