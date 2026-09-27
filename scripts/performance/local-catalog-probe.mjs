import fs from 'node:fs'
import path from 'node:path'
import { performance } from 'node:perf_hooks'

// Intentionally fixed to the local Supabase API. No URL or credential override.
const url = 'http://127.0.0.1:54321/functions/v1/public-catalog'
const runtimeEnvPath = path.resolve(import.meta.dirname, '../../../supabase/.temp/start-secrets/supabase_edge_runtime_Efsane_Baharat/env/docker.env')
const samplesPerCase = 12
const concurrency = 3
const timeoutMs = 5000
const cases = [
  ['default', ''],
  ['page48', '?limit=48'],
  ['meta', '?meta=1'],
  ['search', '?q=baharat'],
  ['price-sort', '?sirala=fiyat_artan'],
]

if (!fs.existsSync(runtimeEnvPath)) {
  throw new Error('Local Supabase runtime unavailable; start the local test stack first.')
}
const localHost = new URL(url).hostname
if (localHost !== '127.0.0.1' && localHost !== 'localhost') {
  throw new Error('Probe refuses non-local hosts.')
}
const anonKey = fs.readFileSync(runtimeEnvPath, 'utf8')
  .split(/\r?\n/)
  .find((line) => line.startsWith('SUPABASE_ANON_KEY='))?.slice('SUPABASE_ANON_KEY='.length)
if (!anonKey) throw new Error('Local anonymous key unavailable.')

async function request(suffix) {
  const start = performance.now()
  const response = await fetch(url + suffix, {
    method: 'GET',
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    signal: AbortSignal.timeout(timeoutMs),
  })
  const body = await response.text()
  const elapsedMs = performance.now() - start
  let parsed
  try { parsed = JSON.parse(body) } catch { throw new Error(`Non-JSON response (${response.status})`) }
  if (!response.ok || !parsed?.data || !Array.isArray(parsed.data.urunler)) {
    throw new Error(`Catalog response invalid (${response.status})`)
  }
  return {
    elapsedMs,
    bytes: Buffer.byteLength(body),
    products: parsed.data.urunler.length,
    total: parsed.data.toplam,
    nextPage: Boolean(parsed.data.sonrakiImlec),
  }
}

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b)
  return Math.round(sorted[Math.ceil(sorted.length * fraction) - 1] * 10) / 10
}

console.log(`Local catalog probe: ${cases.length} cases, ${samplesPerCase} samples/case, ${concurrency} concurrent, ${timeoutMs} ms timeout`)
for (const [name, suffix] of cases) {
  await request(suffix) // warm-up excluded from measurements
  const results = []
  for (let offset = 0; offset < samplesPerCase; offset += concurrency) {
    results.push(...await Promise.all(Array.from({ length: Math.min(concurrency, samplesPerCase - offset) }, () => request(suffix))))
  }
  const latencies = results.map((item) => item.elapsedMs)
  const first = results[0]
  console.log(JSON.stringify({
    case: name,
    samples: results.length,
    p50Ms: percentile(latencies, 0.5),
    p95Ms: percentile(latencies, 0.95),
    maxMs: percentile(latencies, 1),
    responseBytes: first.bytes,
    products: first.products,
    total: first.total,
    nextPage: first.nextPage,
  }))
}
