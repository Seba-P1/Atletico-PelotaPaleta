import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl =
  (import.meta.env?.VITE_SUPABASE_URL as string | undefined) ||
  (typeof __SUPABASE_URL__ !== 'undefined' ? __SUPABASE_URL__ : '');

const rawAnonKey =
  (import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  (typeof __SUPABASE_ANON_KEY__ !== 'undefined' ? __SUPABASE_ANON_KEY__ : '');

export const SUPABASE_CONFIG = {
  url: (rawUrl || '').trim(),
  anonKey: (rawAnonKey || '').trim(),
};

export function isSupabaseConfigured(): boolean {
  return (
    Boolean(SUPABASE_CONFIG.url) &&
    Boolean(SUPABASE_CONFIG.anonKey) &&
    SUPABASE_CONFIG.url.startsWith('http') &&
    !SUPABASE_CONFIG.url.includes('TU-PROYECTO') &&
    !SUPABASE_CONFIG.anonKey.includes('TU_SUPABASE_ANON_KEY')
  );
}

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
