import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../src/utils/iskonto.ts', import.meta.url), 'utf8').replace(/^import .*$/gm, '')
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const exports = {}
new Function('exports', output)(exports)

test('gram discounts retain five decimal unit prices before line total rounding', () => {
  assert.equal(exports.iskontoUygula(0.12345, 10).yeniFiyat, 0.11111)
  assert.equal(exports.kademeliIskontoUygula(0.12345, 10, 0).yeniFiyat, 0.11111)
  assert.equal(exports.iskontoUygula(0.12345, 0).yeniFiyat, 0.12345)
})
