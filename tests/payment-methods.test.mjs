import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
const file=new URL('../src/lib/payment-methods.ts',import.meta.url)
const ts=createRequire(import.meta.url)('typescript')
const module={exports:{}}
if(fs.existsSync(file)) new Function('exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(module.exports)
const payment=module.exports
test('varsayılan ödeme yöntemleri havaleyi yapılandırmaya göre sunar; PayTR kapalıdır',()=>{
 assert.equal(typeof payment.availablePaymentMethods,'function')
 assert.deepEqual(payment.availablePaymentMethods({havale_enabled:false,paytr_enabled:false}),[])
 assert.deepEqual(payment.availablePaymentMethods({havale_enabled:true,paytr_enabled:false,bank_name:'Banka',account_name:'Hesap',iban:'TR330006100519786457841326'}),['havale'])
})
test('IBAN eksik/hatalıysa havale seçilemez; yanlış checksum reddedilir',()=>{
 assert.equal(typeof payment.validTransferDetails,'function')
 assert.equal(payment.validTransferDetails({bank_name:'Banka',account_name:'Hesap',iban:'TR330006100519786457841327'}),false)
 assert.equal(payment.validTransferDetails({}),false)
})
test('ödeme yöntemi değişince deneme anahtarı deposu ayrılır',()=>{
 assert.equal(typeof payment.checkoutStorageKey,'function')
 assert.notEqual(payment.checkoutStorageKey('havale'),payment.checkoutStorageKey('paytr'))
})
test('havale bekleme durumu ödeme başarılı olarak gösterilmez',()=>{
 assert.equal(typeof payment.paymentStatusLabel,'function')
 assert.equal(payment.paymentStatusLabel('paytr','bekliyor'),'Ödeme onayı bekleniyor')
 assert.equal(payment.paymentStatusLabel('havale','bekliyor'),'Havale bekleniyor')
 assert.equal(payment.paymentStatusLabel('havale','odendi'),'Ödendi')
})
