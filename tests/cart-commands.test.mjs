import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const typescript = require('typescript')
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadCartCommands() {
  const filename = path.join(appRoot, 'src/lib/cart-commands.ts')
  const source = fs.readFileSync(filename, 'utf8')
  const { outputText } = typescript.transpileModule(source, {
    compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2020 }
  })
  const module = { exports: {} }
  new Function('exports', 'module', outputText)(module.exports, module)
  return module.exports
}

const commands = loadCartCommands()

test('sunucu hataları özel sepet sonuçlarına eşlenir', () => {
  const { classifyCartError } = commands
  assert.equal(classifyCartError({ code: 'P0001', message: 'Insufficient stock' }), 'insufficient_stock')
  assert.equal(classifyCartError({ message: 'Minimum quantity not met' }), 'minimum_not_met')
  assert.equal(classifyCartError({ message: 'Piece quantity must be whole' }), 'invalid_quantity')
  assert.equal(classifyCartError({ message: 'Invalid cart quantity' }), 'invalid_quantity')
  assert.equal(classifyCartError({ message: 'Selected stock variant is unavailable' }), 'variant_unavailable')
  assert.equal(classifyCartError({ message: 'Active customer required' }), 'account_inactive')
  assert.equal(classifyCartError({ code: 'PGRST301', message: 'JWT expired' }), 'session_expired')
  assert.equal(classifyCartError({ message: 'TypeError: Failed to fetch' }), 'network')
  assert.equal(classifyCartError({ message: 'Insufficient stock' }, false), 'network')
  assert.equal(classifyCartError({ message: 'unexpected' }), 'server')
})

test('başarısız sonuç her zaman özel mesaj taşır; "eklendi" üretmez', () => {
  const { cartFailure, CART_FAILURE_MESSAGES } = commands
  for (const reason of Object.keys(CART_FAILURE_MESSAGES)) {
    const result = cartFailure(reason)
    assert.equal(result.ok, false)
    assert.equal(result.reason, reason)
    assert.ok(result.message.length > 0)
    assert.doesNotMatch(result.message, /eklendi/i)
  }
})

test('istemci miktar ön kontrolü adet/kesir/minimum kurallarını uygular', () => {
  const { validateCartQuantity } = commands
  assert.equal(validateCartQuantity(1.5, true), 'invalid_quantity')
  assert.equal(validateCartQuantity(0, false), 'invalid_quantity')
  assert.equal(validateCartQuantity(0.0001, false), 'invalid_quantity')
  assert.equal(validateCartQuantity(2, true, 3), 'minimum_not_met')
  assert.equal(validateCartQuantity(0.25, false, 0.25), null)
})

test('sepet sürümü sıra bağımsızdır, miktar değişince değişir ve SQL/Edge ile aynı biçimdedir', async () => {
  const { cartVersion, cartVersionCanonical } = commands
  const a = { stok_varyant_id: '00000000-0000-0000-0000-000000000202', miktar: 1 }
  const b = { stok_varyant_id: '00000000-0000-0000-0000-000000000201', miktar: 250.5 }
  assert.equal(cartVersionCanonical([a, b]), '00000000-0000-0000-0000-000000000201:250.5|00000000-0000-0000-0000-000000000202:1')
  assert.equal(await cartVersion([a, b]), await cartVersion([b, a]))
  assert.notEqual(await cartVersion([a, b]), await cartVersion([a, { ...b, miktar: 251 }]))
  // checkout-idempotency.test.sql içindeki SQL sabitiyle aynı değer.
  assert.equal(await cartVersion([a, b]), 'ee474b5bb0dac0198a8f575f87a962c4997204752516bbc7160a7f0dfb2f7497')
})

test('checkout anahtarı aynı sepet+kampanya için korunur, değişince yenilenir', () => {
  const { nextCheckoutAttempt } = commands
  let counter = 0
  const newKey = () => `key-${++counter}`
  const first = nextCheckoutAttempt(null, 'v1', 'yaz10', newKey)
  assert.deepEqual(first, { key: 'key-1', cartVersion: 'v1', kampanyaKodu: 'YAZ10' })
  assert.equal(nextCheckoutAttempt(first, 'v1', 'YAZ10 ', newKey), first)
  assert.equal(nextCheckoutAttempt(first, 'v2', 'YAZ10', newKey).key, 'key-2')
  assert.equal(nextCheckoutAttempt(first, 'v1', '', newKey).key, 'key-3')
})

test('SepetContext stok kimliğiyle kilitli, sonuç döndüren ve sunucudan yeniden yükleyen komutlar kullanır', () => {
  const code = fs.readFileSync(path.join(appRoot, 'src/contexts/SepetContext.tsx'), 'utf8')
  assert.match(code, /rpc\('add_cart_item'/)
  assert.match(code, /Promise<CartCommandResult>/)
  assert.match(code, /locks\.current\.has\(lockKey\)/)
  assert.match(code, /await loadCart\(\)\s*\n\s*if \(error\) return cartFailure/)
  for (const caller of ['src/components/UrunKart.tsx', 'src/pages/UrunDetay.tsx']) {
    const source = fs.readFileSync(path.join(appRoot, caller), 'utf8')
    assert.match(source, /const result = await sepeteEkle\(/, caller)
    assert.match(source, /if \(!result\.ok\) return\s*\n\s*setEklendi\(true\)/, caller)
  }
})
