import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const typescript = require('typescript')
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadCustomerManagement() {
  const filename = path.join(appRoot, 'src/lib/customer-management.ts')
  const source = fs.readFileSync(filename, 'utf8')
  const { outputText } = typescript.transpileModule(source, {
    compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2020 }
  })
  const module = { exports: {} }
  new Function('exports', 'module', outputText)(module.exports, module)
  return module.exports
}

test('müşteri güncellemesi boş fiyat grubunu null olarak hazırlar', () => {
  const { validateCustomerUpdate } = loadCustomerManagement()

  assert.deepEqual(validateCustomerUpdate({
    fiyat_grubu_id: '',
    musteri_tipi: 'musteri',
    ozel_iskonto_orani: '12.5',
    aktif_durum: true
  }), {
    data: {
      fiyat_grubu_id: null,
      musteri_tipi: 'musteri',
      ozel_iskonto_orani: 12.5,
      aktif_durum: true
    },
    errors: {}
  })
})

test('müşteri güncellemesi geçersiz UUID ve iskonto değerlerini reddeder', () => {
  const { validateCustomerUpdate } = loadCustomerManagement()

  const result = validateCustomerUpdate({
    fiyat_grubu_id: 'not-a-uuid',
    musteri_tipi: 'musteri',
    ozel_iskonto_orani: 100.01,
    aktif_durum: false
  })

  assert.equal(result.data, undefined)
  assert.equal(result.errors.fiyat_grubu_id, 'Geçerli bir iskonto grubu seçin.')
  assert.equal(result.errors.ozel_iskonto_orani, 'Ek iskonto 0 ile 100 arasında olmalıdır.')
})
