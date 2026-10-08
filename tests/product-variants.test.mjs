import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/lib/product-variants.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } })
const module = { exports: {} }
new Function('exports', 'module', outputText)(module.exports, module)
const { selectCurrentVariant, variantPopupPosition } = module.exports

test('a refresh keeps the chosen variant but uses its fresh price', () => {
  const fresh = [{ id: 'small', fiyat: 20 }, { id: 'large', fiyat: 45 }]
  assert.equal(selectCurrentVariant(fresh, 'large').fiyat, 45)
})

test('removed or invalid variants cannot remain selected after role/data changes', () => {
  const fresh = [{ id: 'removed', fiyat: 0 }, { id: 'valid', fiyat: 30 }]
  assert.equal(selectCurrentVariant(fresh, 'removed').id, 'valid')
  assert.equal(selectCurrentVariant([], 'removed'), null)
})

test('a dropdown at the bottom opens upwards within a narrow viewport', () => {
  const result = variantPopupPosition({ left: 190, top: 550, bottom: 594, width: 150 }, 360, 640, 20)
  assert.ok(result.top + result.maxHeight <= 546)
  assert.ok(result.left >= 8)
  assert.ok(result.left + result.width <= 352)
})

test('a top dropdown opens below and bounds long lists with internal scrolling', () => {
  const result = variantPopupPosition({ left: 16, top: 30, bottom: 74, width: 160 }, 390, 640, 30)
  assert.equal(result.top, 78)
  assert.ok(result.top + result.maxHeight <= 632)
})
