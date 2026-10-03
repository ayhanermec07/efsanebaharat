import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'

const ts = createRequire(import.meta.url)('typescript')
const file = new URL('../src/lib/category-hierarchy.ts', import.meta.url)
const source = existsSync(file) ? readFileSync(file, 'utf8') : ''
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const module = { exports: {} }
new Function('exports', 'module', code)(module.exports, module)
const { buildCategoryTree, getCategoryPath, getCategoryBranchIds } = module.exports

const categories = [
  { id: 'powder', kategori_adi: 'Toz Baharatlar', ust_kategori_id: 'spices', sira_no: 2 },
  { id: 'coffee', kategori_adi: 'Kahveler', ust_kategori_id: null, sira_no: 1 },
  { id: 'red', kategori_adi: 'Kırmızı Biber', ust_kategori_id: 'powder', sira_no: 0 },
  { id: 'spices', kategori_adi: 'Baharatlar', ust_kategori_id: null, sira_no: 0 },
  { id: 'whole', kategori_adi: 'Tane Baharatlar', ust_kategori_id: 'spices', sira_no: 1 },
]

test('XML kategori zinciri menüde ana kategori altında doğru sırayla görünür', () => {
  assert.equal(typeof buildCategoryTree, 'function', 'Kategori ağacı henüz uygulanmadı')
  const tree = buildCategoryTree(categories)
  assert.deepEqual(tree.map(node => node.category.id), ['spices', 'coffee'])
  assert.deepEqual(tree[0].children.map(node => node.category.id), ['whole', 'powder'])
  assert.equal(tree[0].children[1].children[0].category.id, 'red')
  assert.equal(categories[0].id, 'powder', 'Kaynak sırası değişmemeli')
})

test('alt kategori bağlantısı ana kategoriyi ve tam yolu belirler', () => {
  assert.equal(typeof getCategoryPath, 'function', 'Kategori yolu henüz uygulanmadı')
  assert.deepEqual(getCategoryPath(categories, 'red').map(category => category.id), ['spices', 'powder', 'red'])
  assert.deepEqual(getCategoryPath(categories, 'missing'), [])
})

test('üst kategori seçeneklerinden kategori kendisi ve bütün alt kategorileri çıkarılabilir', () => {
  assert.equal(typeof getCategoryBranchIds, 'function', 'Kategori dalı henüz uygulanmadı')
  assert.deepEqual([...getCategoryBranchIds(categories, 'spices')].sort(), ['powder', 'red', 'spices', 'whole'])
  assert.deepEqual(categories.filter(category => !getCategoryBranchIds(categories, 'spices').has(category.id)).map(category => category.id), ['coffee'])
})

test('eksik üst kategori ve eski döngülü veri menüyü kilitlemez veya kayıtları kaybettirmez', () => {
  assert.equal(typeof buildCategoryTree, 'function', 'Kategori ağacı henüz uygulanmadı')
  const broken = [
    { id: 'orphan', kategori_adi: 'Yetim', ust_kategori_id: 'missing' },
    { id: 'a', kategori_adi: 'A', ust_kategori_id: 'b' },
    { id: 'b', kategori_adi: 'B', ust_kategori_id: 'a' },
    { id: 'self', kategori_adi: 'Kendi', ust_kategori_id: 'self' },
  ]
  const ids = []
  function visit(nodes) { for (const node of nodes) { ids.push(node.category.id); visit(node.children) } }
  visit(buildCategoryTree(broken))
  assert.deepEqual(ids.sort(), ['a', 'b', 'orphan', 'self'])
  assert.deepEqual([...getCategoryBranchIds(broken, 'a')].sort(), ['a', 'b'])
  assert.equal(new Set(getCategoryPath(broken, 'a').map(category => category.id)).size, 1)
})

test('eski kategori döngüsünde menü kökü ve ürün filtresi aynı ana kategoriyi seçer', () => {
  const categories = [
    { id: 'a', kategori_adi: 'A', ust_kategori_id: 'b', sira_no: 0 },
    { id: 'b', kategori_adi: 'B', ust_kategori_id: 'a', sira_no: 1 },
    { id: 'child', kategori_adi: 'Alt', ust_kategori_id: 'b', sira_no: -1 },
  ]
  assert.equal(buildCategoryTree(categories)[0].category.id, 'a')
  assert.deepEqual(getCategoryPath(categories, 'a').map(category => category.id), ['a'])
  assert.deepEqual(getCategoryPath(categories, 'b').map(category => category.id), ['a', 'b'])
  assert.deepEqual(getCategoryPath(categories, 'child').map(category => category.id), ['a', 'b', 'child'])
})
