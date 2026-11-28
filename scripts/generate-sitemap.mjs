// Derleme sonrası dist/sitemap.xml dosyasını ürün sayfalarıyla birlikte üretir.
// Ürünler herkese açık katalog (public-catalog) üzerinden okunur; ağ hatası
// olursa sabit sayfalarla yetinilir ve derleme ASLA bu yüzden başarısız olmaz.
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = 'https://www.efsanebaharat.com'
export const STATIC_PATHS = ['/', '/urunler', '/en-cok-satan', '/kampanyalar', '/bize-ulasin']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PAGE_LIMIT = 48
const MAX_PAGES = 400

export function buildSitemap(productIds, today = new Date().toISOString().slice(0, 10)) {
  const urls = [
    ...STATIC_PATHS.map(p => ({ loc: SITE + p, priority: p === '/' ? '1.0' : '0.8' })),
    ...[...new Set(productIds)].filter(id => UUID.test(id)).map(id => ({ loc: `${SITE}/urun/${id}`, priority: '0.6' }))
  ]
  const body = urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.priority}</priority></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

export async function fetchProductIds({ supabaseUrl, anonKey, fetchImpl = fetch }) {
  const ids = []
  let cursor = null
  for (let page = 0; page < MAX_PAGES; page++) {
    const query = new URLSearchParams({ limit: String(PAGE_LIMIT), sirala: 'ad' })
    if (cursor) query.set('imlec', cursor)
    const response = await fetchImpl(`${supabaseUrl}/functions/v1/public-catalog?${query}`, {
      headers: { apikey: anonKey },
      signal: AbortSignal.timeout(20000)
    })
    if (!response.ok) throw new Error(`public-catalog ${response.status}`)
    const json = await response.json()
    const body = json?.data ?? json
    for (const urun of body.urunler || []) if (urun?.id) ids.push(String(urun.id))
    cursor = body.sonrakiImlec
    if (!cursor) return ids
  }
  return ids
}

async function main() {
  const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'sitemap.xml')
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  let ids = []
  if (supabaseUrl && anonKey) {
    try {
      ids = await fetchProductIds({ supabaseUrl, anonKey })
    } catch (error) {
      console.warn(`[sitemap] Ürünler alınamadı, yalnız sabit sayfalar yazılıyor: ${error.message}`)
    }
  } else {
    console.warn('[sitemap] Supabase ayarı yok, yalnız sabit sayfalar yazılıyor.')
  }
  writeFileSync(out, buildSitemap(ids))
  console.log(`[sitemap] ${STATIC_PATHS.length} sabit sayfa + ${new Set(ids).size} ürün yazıldı.`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
