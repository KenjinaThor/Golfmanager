import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { resolveSupabaseConfig } from './supabaseConfig';

// Die EXPO_PUBLIC_*-Zugriffe müssen so stehen bleiben (Expo ersetzt sie beim Build).
const config = resolveSupabaseConfig(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;
let error: string | null = config && 'error' in config ? config.error : null;

if (config && 'url' in config) {
  try {
    client = createClient(config.url, config.key, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: Platform.OS === 'web' },
    });
  } catch (e) {
    error = `Supabase konnte nicht gestartet werden: ${e instanceof Error ? e.message : String(e)}`;
  }
}

/** null, wenn kein Backend konfiguriert oder die Konfiguration fehlerhaft ist – die App läuft dann rein lokal. */
export const supabase = client;
/** Beschreibung, falls die Konfiguration vorhanden, aber fehlerhaft ist. */
export const supabaseConfigError = error;
/** Servername, den die App anspricht (zur Kontrolle gegen die Supabase-Adresse). */
export const supabaseHost = config && 'url' in config ? new URL(config.url).host : null;
