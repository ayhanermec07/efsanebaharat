import { getLocalSupabaseCredentials } from './local-supabase-credentials.mjs'

const { url, anonKey } = getLocalSupabaseCredentials()

const response = await fetch(`${url}/functions/v1/public-catalog`, {
  headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
})
if (!response.ok) {
  console.error(`TEST ORTAMI HAZIR DEĞİL: Supabase erişimi başarısız (${response.status}).`)
  process.exit(1)
}

console.log('TEST ORTAMI HAZIR: Yerel katalog erişilebilir; canlı proje adresi kullanılmıyor.')
