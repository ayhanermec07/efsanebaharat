import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSitemap, fetchProductIds, STATIC_PATHS } from '../scripts/generate-sitemap.mjs'

const A = '0028ce01-2789-42a2-8413-1bf87b837133'
const B = '007438c8-80ff-4f60-8988-c31faffbe093'

test('sitemap sabit sayfaları ve geçerli ürün adreslerini tekrarsız yazar', () => {
  const xml = buildSitemap([A, B, A, 'geçersiz<id>'], '2026-11-28')
  const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1])
  assert.equal(locs.length, STATIC_PATHS.length + 2)
  assert.ok(locs.includes(`https://www.efsanebaharat.com/urun/${A}`))
  assert.ok(!xml.includes('geçersiz'))
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'))
})

test('katalog sayfaları imleçle sonuna kadar okunur', async () => {
  const pages = [{ data: { urunler: [{ id: A }], sonrakiImlec: 'abc' } }, { data: { urunler: [{ id: B }], sonrakiImlec: null } }]
  const seen = []
  const fetchImpl = async (url) => { seen.push(url); return { ok: true, json: async () => pages.shift() } }
  const ids = await fetchProductIds({ supabaseUrl: 'https://api.test', anonKey: 'k', fetchImpl })
  assert.deepEqual(ids, [A, B])
  assert.match(seen[1], /imlec=abc/)
})
