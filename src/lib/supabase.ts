import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanimli olmali')
}

// Bazı tarayıcılarda önceki sekmeden kalan Web Lock, getSession çağrılarını
// süresiz bekletebiliyor. Bu durumda Supabase sorguları hiç başlamadan yönetim
// ekranları yüklenme göstergesinde kalıyordu. Oturum bilgisi yine Supabase Auth
// tarafından doğrulanır; burada yalnızca tarayıcı kilidi beklemesini kaldırıyoruz.
const withoutBrowserAuthLock = async <T>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<T>
): Promise<T> => fn()

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    lock: withoutBrowserAuthLock
  }
})

// Herkese açık katalog sorguları, açık bir kullanıcı oturumundan bağımsız çalışır.
export const publicSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'efsanebaharat-public-catalog',
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
})

export async function loadPublicCatalog(limit: number, searchTerm = '') {
  const query = new URLSearchParams({ limit: String(limit) })
  if (searchTerm.trim()) query.set('q', searchTerm.trim())
  const response = await fetch(`${supabaseUrl}/functions/v1/public-catalog?${query.toString()}`, {
    headers: { apikey: supabaseAnonKey }
  })
  const body = await response.json()
  if (!response.ok || body?.error) throw new Error(body?.error || 'Katalog verisi alınamadı')
  return body.data
}

export async function loadCurrentCustomerProfile(accessToken: string) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 7_000)

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/xml-musteri-siparis`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'profile' }),
      signal: controller.signal
    })
    const body = await response.json()
    if (!response.ok || body?.error) throw new Error(body?.error?.message || 'Müşteri profili alınamadı')
    return body.data
  } finally {
    window.clearTimeout(timeout)
  }
}
