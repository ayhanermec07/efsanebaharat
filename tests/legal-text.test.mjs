import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'

const ts = createRequire(import.meta.url)('typescript')
const code = ts.transpileModule(readFileSync(new URL('../src/lib/legal-documents.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText
const module = { exports: {} }
new Function('exports', 'module', code)(module.exports, module)
const { publishedLegalText, legalDocuments } = module.exports

const body = 'Son güncelleme: 28 Kasım 2026\n\n' + 'Bu metin yeterince uzun bir nihai yasal metindir. '.repeat(4)

test('nihai metin büyük harfli başlık satırı atılarak yayımlanır', () => {
  assert.equal(publishedLegalText('ÖN BİLGİLENDİRME FORMU\n' + body), body.trim())
  assert.equal(publishedLegalText(body), body.trim())
})

test('taslak, boş veya çok kısa metin yayımlanmaz', () => {
  assert.equal(publishedLegalText(''), null)
  assert.equal(publishedLegalText(null), null)
  assert.equal(publishedLegalText('kısa'), null)
  assert.equal(publishedLegalText('Çalışma taslağı ' + body), null)
})

test('bayi koşulları için yasal sayfa tanımlı', () => {
  assert.ok(legalDocuments.some(d => d.path === '/b2b-satis-kosullari' && d.audience === 'b2b'))
})
