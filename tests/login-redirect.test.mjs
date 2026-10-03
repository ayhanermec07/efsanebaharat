import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ts = createRequire(import.meta.url)('typescript')
const source = readFileSync(path.join(root, 'src/lib/login-redirect.ts'), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const module = { exports: {} }
new Function('exports', 'module', code)(module.exports, module)
const { loginDestination } = module.exports

test('girişten sonra yalnız beklenen mağaza yollarına döner', () => {
  assert.equal(loginDestination('/sepet', null), '/sepet')
  assert.equal(loginDestination(null, '/bize-ulasin'), '/bize-ulasin')
  assert.equal(loginDestination(null, '/urun/00000000-0000-0000-0000-000000000101'), '/urun/00000000-0000-0000-0000-000000000101')
  assert.equal(loginDestination(null, null), '/')
})

test('harici veya ters eğik çizgili yönlendirmeyi reddeder', () => {
  for (const path of ['https://evil.test', '//evil.test', '/\\evil.test', '/%5cevil.test', '/admin', '/urun/../../admin']) {
    assert.equal(loginDestination(path, null), '/', path)
  }
})
