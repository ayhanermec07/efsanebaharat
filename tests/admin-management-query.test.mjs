import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ts = createRequire(import.meta.url)('typescript')
const source = readFileSync(path.join(root, 'src/lib/admin-management-query.ts'), 'utf8')
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText
const module = { exports: {} }
new Function('exports', 'module', code)(module.exports, module)
const { managementSearchPattern, managementPageRange } = module.exports

test('ürün ve bayi adı araması özel ILIKE karakterlerini metin olarak arar', () => {
  assert.equal(managementSearchPattern('  A_%\\  '), '%A\\_\\%\\\\%')
  assert.equal(managementSearchPattern('   '), null)
})

test('yönetim listeleri en çok 25 kayıt ister', () => {
  assert.deepEqual(managementPageRange(3), { from: 50, to: 74 })
  assert.deepEqual(managementPageRange(0), { from: 0, to: 24 })
})
