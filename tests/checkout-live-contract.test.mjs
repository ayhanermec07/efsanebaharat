import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const checkout = fs.readFileSync(new URL('../src/pages/Sepet.tsx', import.meta.url), 'utf8')

test('canlı ödeme isteği backend tarafından zorunlu tutulan deneme anahtarı ve sepet sürümünü gönderir', () => {
  assert.match(checkout, /body:\s*\{[^}]*idempotencyKey:\s*attempt\.key[^}]*cartVersion:\s*attempt\.cartVersion/s)
})

test('ödeme cevap kaybı ve devam eden denemede aynı anahtarla yeniden denenir', () => {
  assert.match(checkout, /nextCheckoutAttempt\(/)
  assert.match(checkout, /checkoutAttempt\.current\s*\|\|\s*readStoredAttempt\(paymentMethod\)/)
  assert.match(checkout, /CHECKOUT_IN_PROGRESS/)
  assert.match(checkout, /response = await invokePayment\(attempt, paymentMethod\)/)
})
