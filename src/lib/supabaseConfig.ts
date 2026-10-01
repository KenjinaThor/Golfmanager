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
