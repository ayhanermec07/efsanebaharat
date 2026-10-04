import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'

const ts = createRequire(import.meta.url)('typescript')
const source = readFileSync(new URL('../src/lib/business-info.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const module = { exports: {} }
new Function('exports', 'module', code)(module.exports, module)
const { businessInfo, missingBusinessInformation, usesConsumerCheckout } = module.exports

test('doğrulanmış şahıs işletmesi kimliği ve iade adresi kayıpsız korunur', () => {
  assert.equal(businessInfo.sellerName, 'Efsane Baharat — Ayhan Ermeç')
  assert.equal(businessInfo.taxNumber, '10045929730')
  assert.equal(businessInfo.taxOffice, 'Düden Vergi Dairesi')
  assert.equal(businessInfo.tradesmanRegistryNumber, '287725')
  assert.equal(businessInfo.returnAddress, businessInfo.address)
  assert.equal(businessInfo.kep, 'ayhan.ermec@hs01.kep.tr')
  assert.equal(businessInfo.customerEmail, null)
})

test('eksik kayıt/iletişim bilgileri uydurulmaz; oda yazımı da bekleyen bilgidir', () => {
  for (const key of ['customerEmail', 'returnEmail', 'mersisNumber', 'tradeRegistryNumber', 'foodRegistrationNumber', 'etbisStatus', 'chamberName']) {
    assert.equal(businessInfo[key], null, key)
    assert.ok(missingBusinessInformation.some(field => field.key === key && field.status === 'NEEDS INFORMATION'), key)
  }
})

test('tüketici checkout hükümleri bayi/XML/admin ve bilinmeyen profile eklenmez', () => {
  assert.equal(usesConsumerCheckout('musteri'), true)
  for (const role of ['bayi', 'xml_musteri', 'admin', undefined, null]) assert.equal(usesConsumerCheckout(role), false)
})

const React = createRequire(import.meta.url)('react')
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server')
const sellerCode = ts.transpileModule(readFileSync(new URL('../src/components/SellerInformation.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
const sellerModule = { exports: {} }
new Function('require', 'exports', 'module', sellerCode)(name => name === '../lib/business-info' ? { businessInfo } : name === '../lib/supabase' ? {supabase:{}} : createRequire(import.meta.url)(name), sellerModule.exports, sellerModule)
test('yasal metinlerde KEP ve iletişimde doğrulanmış birlik görünür; eksik oda/e-posta uydurulmaz', () => {
  const render = variant => renderToStaticMarkup(React.createElement(sellerModule.exports.default, { variant }))
  assert.ok(render('legal').includes('mailto:' + businessInfo.kep))
  assert.ok(render('contact').includes(businessInfo.union))
  assert.ok(!render('contact').includes('Meslek odası:'))
  assert.ok(!render('contact').includes('E-posta:'))
  assert.ok(!render('footer').includes(businessInfo.kep))
})
