import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ts = createRequire(import.meta.url)('typescript')

function loadCsv() {
  const source = readFileSync(path.join(root, 'src/lib/dealer-sales-csv.ts'), 'utf8')
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText
  const module = { exports: {} }
  new Function('exports', 'module', code)(module.exports, module)
  return module.exports.dealerSalesCsv
}

test('bayi satış CSV UTF-8 BOM, Türkçe başlık ve Excel için noktalı virgül taşır', () => {
  const csv = loadCsv()([{
    satis_tarihi: '2026-09-26T12:00:00Z',
    siparis_id: 'order-1', urun_adedi: 2, toplam_tutar: 1234.5,
    bayi: { bayii_kodu: 'B-1', bayi_adi: 'Efsane Bayi' }
  }])
  assert.ok(csv.startsWith('\uFEFF"Tarih";"Bayi Kodu";"Bayi Adı"'))
  assert.match(csv, /"Efsane Bayi";"order-1";"2";"1\.234,50"/)
  assert.ok(csv.endsWith('\r\n'))
})

test('CSV hücreleri formül, tırnak ve satır sonu enjeksiyonunu güvenle taşır', () => {
  const csv = loadCsv()([{
    satis_tarihi: '2026-09-26T12:00:00Z',
    siparis_id: '=HYPERLINK("https://example.test")', urun_adedi: 1, toplam_tutar: 5,
    bayi: { bayii_kodu: '+CMD', bayi_adi: 'Ali "Bayi"\nŞube' }
  }])
  assert.match(csv, /"'\+CMD"/)
  assert.match(csv, /"Ali ""Bayi""\nŞube"/)
  assert.match(csv, /"'=HYPERLINK\(""https:\/\/example\.test""\)"/)
})
