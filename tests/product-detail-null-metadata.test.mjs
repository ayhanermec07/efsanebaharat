import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'

const ts = createRequire(import.meta.url)('typescript')
async function loadProduct(product) {
  const source = fs.readFileSync(new URL('../src/pages/UrunDetay.tsx', import.meta.url), 'utf8')
  const ast = ts.createSourceFile('UrunDetay.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let loader
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'loadUrun') loader = node.initializer.arguments[0].getText(ast)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  const code = ts.transpileModule(`const run = ${loader}`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText
  const calls = []
  const state = { product: null, loadState: null, loading: null }
  const client = { from(table) {
    let nullId = false
    calls.push(table)
    const query = {
      select() { return query },
      eq(column, value) { if (column === 'id' && value == null) nullId = true; return query },
      order() { return query },
      maybeSingle: async () => result(),
      then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject) },
    }
    const result = () => nullId ? { data: null, error: { message: 'invalid UUID null' } } : {
      data: table === 'urunler' ? product : table === 'urun_stoklari' ? [{ id: 'stock', stok_grubu: 'hepsi', min_siparis_miktari: 1 }] : table === 'urun_gorselleri' ? [] : { id: 'metadata' }, error: null,
    }
    return query
  } }
  const run = new Function('id','musteriData','supabase','requestSequence','setLoading','setLoadState','setUrun','setSecilenStok','setSecilenGorsel','setMiktar',code+'; return run')(
    'product', null, client, { current: 0 }, value => { state.loading = value }, value => { state.loadState = value }, value => { state.product = value }, () => {}, () => {}, () => {},
  )
  await run()
  return { state, calls }
}

test('kategori veya marka olmadan ürün detayı ve stok seçenekleri yüklenir', async () => {
  const { state, calls } = await loadProduct({ id: 'product', urun_adi: 'Ürün', kategori_id: null, marka_id: null })
  assert.equal(state.loadState, 'ready')
  assert.equal(state.loading, false)
  assert.equal(state.product.urun_stoklari.length, 1)
  assert.equal(state.product.kategoriler, null)
  assert.equal(state.product.markalar, null)
  assert.ok(!calls.includes('kategoriler') && !calls.includes('markalar'))
})

test('atanmış kategori ve marka normal olarak yüklenir', async () => {
  const { state, calls } = await loadProduct({ id: 'product', kategori_id: 'category', marka_id: 'brand' })
  assert.equal(state.loadState, 'ready')
  assert.ok(calls.includes('kategoriler') && calls.includes('markalar'))
})
