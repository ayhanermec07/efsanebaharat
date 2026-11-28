import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ts = createRequire(import.meta.url)('typescript')
const source = readFileSync(path.join(root, 'src/lib/seo.ts'), 'utf8')
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText
const module = { exports: {} }
new Function('exports', 'module', code)(module.exports, module)
const { seoForPath } = module.exports

test('açık mağaza rotaları ayrı başlık, açıklama ve temiz canonical üretir', () => {
  assert.deepEqual(seoForPath('/urunler', 'https://efsanebaharat.appsgo.cloud'), {
    title: 'Ürünler | Efsane Baharat',
    description: 'Efsane Baharat ürünlerini inceleyin.',
    canonical: 'https://efsanebaharat.appsgo.cloud/urunler',
    robots: 'index,follow'
  })
  assert.equal(seoForPath('/kampanyalar', 'https://efsanebaharat.appsgo.cloud').canonical, 'https://efsanebaharat.appsgo.cloud/kampanyalar')
})

test('ürün detayları Google\'a açıktır ve kendi canonical adresini taşır', () => {
  const seo = seoForPath('/urun/abc-123', 'https://www.efsanebaharat.com')
  assert.equal(seo.robots, 'index,follow')
  assert.equal(seo.canonical, 'https://www.efsanebaharat.com/urun/abc-123')
  const robotsTxt = readFileSync(path.join(root, 'public/robots.txt'), 'utf8')
  assert.ok(!/Disallow:\s*\/urun\//.test(robotsTxt), 'robots.txt ürün sayfalarını engellememeli')
})

test('hesap, ödeme, yönetim ve bilinmeyen yollar indekslenmez', () => {
  for (const route of ['/admin', '/admin/siparisler', '/hesabim', '/sepet', '/odeme-basarili', '/urun/123/ek', '/bilinmeyen']) {
    const seo = seoForPath(route, 'https://efsanebaharat.appsgo.cloud')
    assert.equal(seo.robots, 'noindex,nofollow', route)
    assert.equal(seo.canonical, null, route)
  }
})

test('sitemap yalnız izinli sabit mağaza yollarını duyurur', () => {
  const sitemap = readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8')
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1])
  assert.deepEqual(urls, [
    'https://www.efsanebaharat.com/',
    'https://www.efsanebaharat.com/urunler',
    'https://www.efsanebaharat.com/en-cok-satan',
    'https://www.efsanebaharat.com/kampanyalar',
    'https://www.efsanebaharat.com/bize-ulasin'
  ])
})
