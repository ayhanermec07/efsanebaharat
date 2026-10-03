import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ts = createRequire(import.meta.url)('typescript')
const source = readFileSync(path.join(root, 'src/lib/admin-taxonomy-query.ts'), 'utf8')
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText
const module = { exports: {} }
new Function('exports', 'module', code)(module.exports, module)
const { taxonomySearchPattern, taxonomyPageRange } = module.exports

test('kategori ve marka araması joker karakterlerini gerçek metin sayar', () => {
  assert.equal(taxonomySearchPattern('  Acı_%\\  '), '%Acı\\_\\%\\\\%')
  assert.equal(taxonomySearchPattern('   '), null)
})

test('sayfa aralığı en fazla 25 kayıt ister ve geçersiz sayfayı başa alır', () => {
  assert.deepEqual(taxonomyPageRange(2), { from: 25, to: 49 })
  assert.deepEqual(taxonomyPageRange(-1), { from: 0, to: 24 })
})
