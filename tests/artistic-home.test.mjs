import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import ts from 'typescript'
const output = ts.transpileModule(fs.readFileSync(new URL('../src/lib/home-intro.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const exports = {}; new Function('exports', output)(exports)
test('intro plays once per tab and reduced motion bypasses it', () => {
  assert.equal(exports.shouldPlayIntro(false, false), true)
  assert.equal(exports.shouldPlayIntro(true, false), false)
  assert.equal(exports.shouldPlayIntro(false, true), false)
})
test('botanical first slide remains in campaign rotation', () => {
  const campaign = { id: 'c', title: 'Gerçek kampanya', href: '/urunler?kampanya=c', image: '/image.webp' }
  assert.deepEqual(exports.withBotanicalSlide([campaign]).map(x => x.id), ['botanical', 'c'])
  assert.equal(exports.withBotanicalSlide([]).length, 1)
})
