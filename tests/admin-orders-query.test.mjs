import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ts = createRequire(import.meta.url)('typescript')
const source = readFileSync(path.join(root, 'src/lib/admin-orders-query.ts'), 'utf8')
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText
const module = { exports: {} }
new Function('exports', 'module', code)(module.exports, module)
const { orderQueryFilters, orderPageRange } = module.exports

test('sipariş numarası araması ilike jokerlerini metin olarak işler', () => {
  assert.deepEqual(orderQueryFilters({ search: ' #AB_%\\ ', status: '', from: '', to: '' }), {
    searchPattern: '%AB\\_\\%\\\\%', status: null, from: null, until: null
  })
})

test('tarih aralığı İstanbul günlerini kapsar ve bitişi sonraki gün hariç tutar', () => {
  assert.deepEqual(orderQueryFilters({ search: '', status: 'hazirlaniyor', from: '2026-09-25', to: '2026-09-26' }), {
    searchPattern: null, status: 'hazirlaniyor', from: '2026-09-24T21:00:00.000Z', until: '2026-09-26T21:00:00.000Z'
  })
})

test('geçersiz durum ve tarihler sorguya aktarılmaz', () => {
  assert.deepEqual(orderQueryFilters({ search: '', status: 'hazirlaniyor,odendi', from: '2026-02-30', to: 'bad' }), {
    searchPattern: null, status: null, from: null, until: null
  })
})

test('sayfa aralığı 25 satırla sınırlıdır', () => {
  assert.deepEqual(orderPageRange(3), { from: 50, to: 74 })
  assert.deepEqual(orderPageRange(0), { from: 0, to: 24 })
})
