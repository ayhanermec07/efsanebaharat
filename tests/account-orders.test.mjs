import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ts = createRequire(import.meta.url)('typescript')
const source = readFileSync(path.join(root, 'src/lib/account-orders.ts'), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const module = { exports: {} }
new Function('exports', 'module', code)(module.exports, module)
const { loadCustomerOrders } = module.exports

test('iki siparişin kalem ve ürün adları üç toplu sorguyla yüklenir', async () => {
  const tables = []
  const client = { from(table) {
    tables.push(table)
    if (table === 'siparisler') return { select() { return { eq() { return { order: async () => ({ data: [{ id: 'o1' }, { id: 'o2' }], error: null }) } } } } }
    if (table === 'siparis_urunleri') return { select() { return { in: async () => ({ data: [{ id: 'l1', siparis_id: 'o1', urun_id: 'p1' }, { id: 'l2', siparis_id: 'o2', urun_id: 'p2' }], error: null }) } } }
    if (table === 'urunler') return { select() { return { in: async () => ({ data: [{ id: 'p1', urun_adi: 'A' }, { id: 'p2', urun_adi: 'B' }], error: null }) } } }
    assert.fail(`Beklenmeyen tablo ${table}`)
  } }
  const orders = await loadCustomerOrders(client, 'customer-1')
  assert.deepEqual(tables, ['siparisler', 'siparis_urunleri', 'urunler'])
  assert.equal(orders[0].siparis_urunleri[0].urun_adi, 'A')
  assert.equal(orders[1].siparis_urunleri[0].urun_adi, 'B')
})
