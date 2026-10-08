import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
const ts = createRequire(import.meta.url)('typescript')
const file = new URL('../src/lib/category-artwork.ts', import.meta.url)
const source = existsSync(file) ? readFileSync(file, 'utf8') : ''
const module = { exports: {} }
new Function('exports', 'module', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(module.exports, module)
const resolve = (...args) => { assert.equal(typeof module.exports.resolveCategoryTheme, 'function'); return module.exports.resolveCategoryTheme(...args) }
const categories = [
  { id: 'root', ust_kategori_id: null, urun_detay_temasi: 'spice', banner_temasi: 'oil' },
  { id: 'middle', ust_kategori_id: 'root', urun_detay_temasi: null },
  { id: 'child', ust_kategori_id: 'middle', urun_detay_temasi: null },
]
test('null inherits nearest parent independently for detail and banner', () => {
  assert.equal(resolve(categories, 'child', 'urun_detay_temasi'), 'spice')
  assert.equal(resolve(categories, 'child', 'banner_temasi'), 'oil')
  assert.equal(resolve([...categories, { id: 'leaf', ust_kategori_id: 'child', urun_detay_temasi: 'soap' }], 'leaf', 'urun_detay_temasi'), 'soap')
})
test('explicit plain and unknown values stop inheritance', () => {
  for (const value of ['plain', 'unknown']) assert.equal(resolve([...categories, { id: 'leaf', ust_kategori_id: 'child', urun_detay_temasi: value }], 'leaf', 'urun_detay_temasi'), 'plain')
})
test('missing categories and cycles safely resolve to plain', () => {
  assert.equal(resolve(categories, 'missing', 'banner_temasi'), 'plain')
  assert.equal(resolve([{ id: 'a', ust_kategori_id: 'b' }, { id: 'b', ust_kategori_id: 'a' }], 'a', 'banner_temasi'), 'plain')
})
test('banner fallback distinguishes unassigned from explicit plain even through ancestors', () => {
  const hasTheme = module.exports.hasCategoryTheme
  assert.equal(hasTheme(categories, 'child', 'banner_temasi'), true)
  assert.equal(hasTheme([{ id: 'a', ust_kategori_id: null }], 'a', 'banner_temasi'), false)
  assert.equal(hasTheme([{ id: 'a', ust_kategori_id: null, banner_temasi: 'plain' }, { id: 'b', ust_kategori_id: 'a' }], 'b', 'banner_temasi'), true)
  assert.equal(hasTheme([{ id: 'a', ust_kategori_id: 'a' }], 'a', 'banner_temasi'), false)
})
test('all thirteen artwork themes have distinct sprite slots and Turkish labels', () => {
  assert.equal(module.exports.CATEGORY_THEMES.length, 13)
  assert.equal(new Set(module.exports.CATEGORY_THEMES.map(([key]) => key)).size, 13)
  assert.ok(module.exports.CATEGORY_THEMES.every(([, label]) => label.length > 0))
})
