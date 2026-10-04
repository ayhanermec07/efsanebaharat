import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../src/components/admin/StokYonetimi.tsx', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText

test('yavaş stok kaydında ikinci tıklama eski varyant listesini göndermez; kontroller yeniden okumaya kadar kilitlidir', async () => {
  const slots = []; let cursor = 0; let calls = 0; let release
  const gate = new Promise(resolve => { release = resolve })
  const stocks = [{ id: 'first', birim_turu: 'adet', fiyat: 10 }, { id: 'second', birim_turu: 'adet', fiyat: 33 }]
  const hooks = {
    useState(initial) {
      const index = cursor++
      if (!(index in slots)) slots[index] = index === 0 ? stocks : index === 1 ? false : initial
      return [slots[index], value => { slots[index] = value }]
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial } },
    useCallback(fn) { return fn }, useEffect() {},
  }
  const supabase = {
    from(table) {
      const query = { select() { return query }, eq() { return query }, order() { return query }, maybeSingle() { return query },
        then(resolve) { return Promise.resolve({ data: table === 'urunler' ? { urun_adi: 'Test' } : table === 'urun_gorselleri' ? [] : stocks.slice(1), error: null }).then(resolve) },
      }
      return query
    },
    functions: { async invoke() { calls++; await gate; return { data: {}, error: null } } },
  }
  const module = { exports: {} }
  new Function('require', 'exports', 'module', code)(name => {
    if (name === 'react') return hooks
    if (name === '../../lib/supabase') return { supabase }
    if (name === '../../utils/birimDonusturucu') return { BIRIM_TURLERI: [], akilliBirimGoster: () => '', ondalikStokGoster: () => '' }
    if (name === 'react-hot-toast') return { default: { success() {}, error() {} }, __esModule: true }
    return require(name)
  }, module.exports, module)
  const buttons = element => {
    if (!element || typeof element !== 'object') return []
    if (Array.isArray(element)) return element.flatMap(buttons)
    return [...(element.type === 'button' ? [element] : []), ...buttons(element.props?.children)]
  }
  const render = () => { cursor = 0; return buttons(module.exports.default({ urunId: 'product', urunAdi: 'Test' })) }
  const initial = render(); const deletes = initial.filter(button => button.props.className.includes('text-red-600'))
  const previousConfirm = globalThis.confirm; globalThis.confirm = () => true
  const requests = []
  try {
    requests.push(deletes[0].props.onClick())
    await new Promise(resolve => setImmediate(resolve))
    requests.push(deletes[1].props.onClick())
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(calls, 1, 'İkinci tıklama bekleyen ilk mutasyonun eski stok listesini tekrar göndermemeli')
    assert.ok(render().every(button => button.props.disabled), 'Kayıt ve yeniden okuma bitmeden stok kontrolleri açılmamalı')
  } finally {
    release(); await Promise.all(requests); globalThis.confirm = previousConfirm
  }
  assert.ok(render().every(button => !button.props.disabled), 'Yeni stok listesi okununca kontroller açılmalı')
})
