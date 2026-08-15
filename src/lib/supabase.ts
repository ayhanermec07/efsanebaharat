import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanimli olmali')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Herkese açık katalog sorguları, açık bir kullanıcı oturumundan bağımsız çalışır.
export const publicSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'efsanebaharat-public-catalog',
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
})

export async function loadPublicCatalog(limit: number) {
  const response = await fetch(`${supabaseUrl}/functions/v1/public-catalog?limit=${limit}`, {
    headers: { apikey: supabaseAnonKey }
  })
  const body = await response.json()
  if (!response.ok || body?.error) throw new Error(body?.error || 'Katalog verisi alınamadı')
  return body.data
}
