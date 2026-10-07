import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'

const ts = createRequire(import.meta.url)('typescript')
const source = readFileSync(new URL('../src/lib/password-policy.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const module = { exports: {} }
new Function('exports', 'module', code)(module.exports, module)
const { isValidCustomerPassword } = module.exports

test('müşteri şifresi en az sekiz karakter, bir harf ve bir rakam gerektirir', () => {
  for (const value of ['Abcdef12', 'abcdefg1', 'ABCDEFG1', 'abc def1!', 'abcdef12uzun']) {
    assert.equal(isValidCustomerPassword(value), true, value)
  }
  for (const value of ['', 'Abcde12', 'abcdefgh', '12345678', '!!!!!!!1', 'abcdefg!']) {
    assert.equal(isValidCustomerPassword(value), false, value)
  }
})
