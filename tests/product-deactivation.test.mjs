import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require('typescript')

function loadCommand() {
  const source = readFileSync(path.join(root, 'src/lib/admin-product-deactivation.ts'), 'utf8')
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText
  const module = { exports: {} }
  new Function('exports', 'module', code)(module.exports, module)
  return module.exports.deactivateProduct
}

function clientFixture({ functionError } = {}) {
  const invocations = []
  const client = {
    from(table) {
      assert.fail(`Doğrudan tablo yazımı/okuması beklenmiyor: ${table}`)
    },
    functions: {
      async invoke(name, options) {
        invocations.push({ name, body: options.body })
        return { data: functionError ? null : { success: true }, error: functionError || null }
      }
    }
  }
  return { client, invocations }
}

test('pasifleştirme ürün kimliğiyle yalnız admin komutunu çağırır', async () => {
  const { client, invocations } = clientFixture()
  await loadCommand()(client, 'product-1')

  assert.equal(invocations.length, 1)
  assert.equal(invocations[0].name, 'admin-product-save')
  assert.deepEqual(invocations[0].body, { action: 'deactivate', urunId: 'product-1' })
})

test('sunucu hatası başarı sayılmaz', async () => {
  const { client, invocations } = clientFixture({ functionError: new Error('pasifleştirme başarısız') })
  await assert.rejects(loadCommand()(client, 'product-1'), /pasifleştirme başarısız/)
  assert.equal(invocations.length, 1)
})
