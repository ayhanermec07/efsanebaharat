import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
const ts = createRequire(import.meta.url)('typescript')
const code = ts.transpileModule(readFileSync(new URL('../src/lib/home-campaigns.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const module = { exports: {} }
new Function('exports', 'module', code)(module.exports, module)
const { homeCampaignSlides } = module.exports
const campaign = { id: 'c1', ad: 'Baharat', banner_gorseli: 'parent.png', kapsam: 'kategori', kategori_id: 'spices' }
test('Görselsiz kampanyalar elenir, kampanya kapsamı korunur', () => {
 const result = homeCampaignSlides([campaign, { ...campaign, id: 'empty', banner_gorseli: ' ' }], [])
 assert.equal(result.length, 1)
 assert.equal(result[0].href, '/urunler?kategori=spices&kampanya=c1')
})
test('Yalnız uygun kampanyanın sıralı bannerları gösterilir', () => {
 const result = homeCampaignSlides([campaign], [
  { id: 'one', kampanya_id: 'c1', gorsel_url: ' one.png ', baslik: 'Bir' },
  { id: 'other', kampanya_id: 'expired', gorsel_url: 'other.png' },
  { id: 'two', kampanya_id: 'c1', gorsel_url: 'two.png', baslik: ' ' },
 ])
 assert.deepEqual(result.map(item => item.image), ['one.png', 'two.png'])
 assert.deepEqual(result.map(item => item.title), ['Bir', 'Baharat'])
 assert.equal(homeCampaignSlides([], [{ kampanya_id: 'expired', gorsel_url: 'other.png' }]).length, 0)
})
test('Marka ve genel kampanyalarda doğru filtre bağlantısı oluşur', () => {
 const result = homeCampaignSlides([{ ...campaign, kapsam: 'marka', marka_id: 'brand' }, { ...campaign, id: 'all', kapsam: 'genel' }], [])
 assert.equal(result[0].href, '/urunler?marka=brand&kampanya=c1')
 assert.equal(result[1].href, '/urunler?kampanya=all')
})

test('Yönetici ve ziyaretçi müşteri kampanyalarını, bayi yalnız bayi kampanyalarını sorgular', () => {
 const { homeCampaignAudience } = module.exports
 for (const type of ['admin', 'musteri', null, undefined]) assert.equal(homeCampaignAudience(type), 'musteri')
 assert.equal(homeCampaignAudience('bayi'), 'bayi')
})
