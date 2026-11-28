import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ts = createRequire(import.meta.url)('typescript')
const load = (file) => {
  const code = ts.transpileModule(readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText
  const module = { exports: {} }
  new Function('exports', 'module', code)(module.exports, module)
  return module.exports
}
const { canSeePrices, PUBLIC_PRICES_ENABLED } = load('src/lib/price-visibility.ts')
const { productJsonLd } = load('src/lib/productSeo.ts')

test('fiyatlar şu an herkese kapalıdır', () => {
  assert.equal(PUBLIC_PRICES_ENABLED, false)
})

test('yalnız bayi, XML müşterisi ve yönetici fiyat görür', () => {
  assert.equal(canSeePrices({}), false)
  assert.equal(canSeePrices({ musteriTipi: 'musteri' }), false)
  assert.equal(canSeePrices({ musteriTipi: 'bayi' }), true)
  assert.equal(canSeePrices({ musteriTipi: 'xml_musteri' }), true)
  assert.equal(canSeePrices({ isAdmin: true }), true)
  assert.equal(canSeePrices({ musteriTipi: 'musteri', publicPrices: true }), true)
})

test('fiyat verilmezse Google ürün bilgisinde teklif/fiyat bulunmaz', () => {
  const ld = productJsonLd({ name: 'Pul Biber', price: null, inStock: true, url: 'https://www.efsanebaharat.com/urun/x' })
  assert.equal(ld.offers, undefined)
  assert.ok(!JSON.stringify(ld).includes('price'))
})
