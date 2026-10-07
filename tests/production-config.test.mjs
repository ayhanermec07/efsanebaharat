import assert from 'node:assert/strict'
import test from 'node:test'
import { validateProductionConfig } from '../scripts/production-config.mjs'
const anonKey = `header.${Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url')}.signature`
test('üretim yalnız doğrulanmış self-hosted URL ve public anahtar kabul eder', () => {
  const valid = { VITE_SUPABASE_URL: 'https://api.efsanebaharat.appsgo.cloud', VITE_SUPABASE_ANON_KEY: anonKey }
  assert.doesNotThrow(() => validateProductionConfig(valid))
  for (const url of ['https://old.supabase.co', 'http://api.efsanebaharat.appsgo.cloud', 'http://127.0.0.1:54321', 'https://api.efsanebaharat.appsgo.cloud/another', 'https://user:pass@api.efsanebaharat.appsgo.cloud']) {
    assert.throws(() => validateProductionConfig({ ...valid, VITE_SUPABASE_URL: url }), /üretim/i)
  }
  for (const key of ['', 'wrong', `header.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.signature`]) {
    assert.throws(() => validateProductionConfig({ ...valid, VITE_SUPABASE_ANON_KEY: key }), /public/i)
  }
})

test('görsel dönüşümü üretimde yalnız güvenli özel alan adıyla açılır', () => {
  const valid = { VITE_SUPABASE_URL: 'https://api.efsanebaharat.appsgo.cloud', VITE_SUPABASE_ANON_KEY: anonKey, VITE_MEDIA_TRANSFORMS: 'true' }
  for (const url of ['', 'http://images.example.com', 'https://x.r2.dev', 'https://u:p@images.example.com', 'https://images.example.com/path']) {
    assert.throws(() => validateProductionConfig({ ...valid, VITE_MEDIA_BASE_URL: url }), /görsel/i)
  }
  assert.doesNotThrow(() => validateProductionConfig({ ...valid, VITE_MEDIA_BASE_URL: 'https://images.efsanebaharat.com' }))
})
