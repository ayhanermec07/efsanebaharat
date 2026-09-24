import fs from 'node:fs'
import path from 'node:path'

const appRoot = path.resolve(import.meta.dirname, '..')
const runtimeEnvPath = path.join(appRoot, '..', 'supabase', '.temp', 'start-secrets', 'supabase_edge_runtime_Efsane_Baharat', 'env', 'docker.env')

if (!fs.existsSync(runtimeEnvPath)) {
  console.error('TEST ORTAMI HAZIR DEĞİL: Yerel Supabase çalışma bilgisi bulunamadı.')
  process.exit(1)
}

const values = Object.fromEntries(
  fs.readFileSync(runtimeEnvPath, 'utf8').split(/\r?\n/)
    .filter((line) => line.includes('='))
    .map((line) => {
      const index = line.indexOf('=')
      return [line.slice(0, index), line.slice(index + 1)]
    }),
)
const url = 'http://127.0.0.1:54321'
const anonKey = values.SUPABASE_ANON_KEY

if (!anonKey) {
  console.error('TEST ORTAMI HAZIR DEĞİL: Yerel anonim anahtarı bulunamadı.')
  process.exit(1)
}

const response = await fetch(`${url}/functions/v1/public-catalog`, {
  headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
})
if (!response.ok) {
  console.error(`TEST ORTAMI HAZIR DEĞİL: Supabase erişimi başarısız (${response.status}).`)
  process.exit(1)
}

console.log('TEST ORTAMI HAZIR: Yerel katalog erişilebilir; canlı proje adresi kullanılmıyor.')
