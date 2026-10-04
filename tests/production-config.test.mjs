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
