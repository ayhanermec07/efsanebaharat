import assert from 'node:assert/strict'
import test from 'node:test'
import { parseLocalSupabaseStatus } from '../scripts/local-supabase-credentials.mjs'

test('local status parser accepts only loopback API and extracts keys without persistence', () => {
  const result = parseLocalSupabaseStatus('API_URL="http://127.0.0.1:54321"\nANON_KEY="anon-test"\nSERVICE_ROLE_KEY="service-test"\n')
  assert.deepEqual(result, { url: 'http://127.0.0.1:54321', anonKey: 'anon-test', serviceRoleKey: 'service-test' })
  assert.throws(() => parseLocalSupabaseStatus('API_URL="https://example.supabase.co"\nANON_KEY="x"\nSERVICE_ROLE_KEY="y"\n'), /yalnız yerel/)
  assert.throws(() => parseLocalSupabaseStatus('API_URL="http://127.0.0.1:54321"\nANON_KEY="x"\n'), /eksik/)
})
