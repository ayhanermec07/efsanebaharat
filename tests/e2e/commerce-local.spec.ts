import {test,expect} from '@playwright/test'
import {createClient} from '@supabase/supabase-js'
import {getLocalSupabaseCredentials} from '../../scripts/local-supabase-credentials.mjs'
const {url,anonKey,serviceRoleKey}=getLocalSupabaseCredentials()
const service=createClient(url,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}})
function ok(r:{error:{message:string}|null}){if(r.error)throw new Error(r.error.message)}
test('gerçek havale: ön inceleme, kargo, kalıcı belge, müşteri talebi, tek banka iadesi ve stok geri girişi',async({page})=>{
 const previous=await service.from('commerce_configuration').select('*').single();ok(previous)
 const previousPayment=await service.from('checkout_payment_settings').select('*').single();ok(previousPayment)
 let customerId='',adminId='',profileId='',orderId='',stockId=''
 const password=`Local!${crypto.randomUUID()}`,email=`commerce-${crypto.randomUUID()}@example.test`
 try{
  const u=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{ad:'Yerel',soyad:'Kabul',basvuru_tipi:'musteri'}});ok(u);customerId=u.data.user!.id
  const a=await service.auth.admin.createUser({email:`admin-${crypto.randomUUID()}@example.test`,password,email_confirm:true,user_metadata:{ad:'Yerel',soyad:'Admin'}});ok(a);adminId=a.data.user!.id
  ok(await service.from('admin_users').insert({user_id:adminId}))
  const profile=await service.from('musteriler').select('id').eq('user_id',customerId).single();ok(profile);profileId=profile.data!.id
  ok(await service.from('musteriler').update({adres:'Yalnız izole test teslimat adresi',telefon:'05550000001'}).eq('id',profileId))
  const docs=Object.fromEntries(['on-bilgilendirme','mesafeli-satis-sozlesmesi','teslimat-kargo','iade-iptal-cayma','kvkk','gizlilik','islem-rehberi','b2b-satis-kosullari'].map(x=>[x,('Yalnız izole kabul testi koşulları. '+x+' ').repeat(8)]))
  ok(await service.from('commerce_configuration').update({seller:{seller_name:'Yalnız İzole Satıcı',address:'Yalnız izole adres',phone:'05550000001',kep:'kep@example.test',tax_number:'TEST-VKN',email:'seller@example.test',chamber:'İzole Oda'},documents:docs,shipping_mode:'flat',shipping_fee:12.5,consumer_ready:true,business_ready:true}).eq('id',true))
  ok(await service.from('checkout_payment_settings').update({havale_enabled:true,bank_name:'İzole Banka',account_name:'İzole Hesap',iban:'TR330006100519786457841326'}).eq('id',true))
  stockId=crypto.randomUUID();ok(await service.from('urun_stoklari').insert({id:stockId,urun_id:'20000000-0000-4000-8000-000000000001',birim_turu:'adet',birim_adedi:1,birim_adedi_turu:'adet',stok_birimi:'adet',stok_grubu:'hepsi',fiyat:29.5,stok_miktari:10,min_siparis_miktari:1,aktif:true,aktif_durum:true}))
  const customer=createClient(url,anonKey,{auth:{persistSession:false}});ok(await customer.auth.signInWithPassword({email,password}));ok(await customer.rpc('add_cart_item',{p_stok_varyant_id:stockId,p_miktar:1}))
  await page.goto('/giris');await page.getByLabel('E-posta').fill(email);await page.getByLabel('Şifre').fill(password);await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await expect(page).toHaveURL('http://127.0.0.1:4173/',{timeout:20000})
  await page.goto('/sepet');await page.getByRole('button',{name:'Sipariş bilgilerini incele',exact:true}).click();await expect(page.getByRole('heading',{name:'Siparişinizi inceleyin'})).toBeVisible()
  const panel=page.getByRole('region',{name:'Sipariş ön bilgilendirmesi'});await expect(panel.getByText('₺42,00',{exact:true})).toBeVisible()
  expect((await service.from('siparisler').select('id').eq('musteri_id',profileId)).data).toEqual([])
  await panel.getByRole('checkbox').check();await page.getByRole('button',{name:'Havale ile sipariş oluştur',exact:true}).click();await expect(page).toHaveURL(/odeme-basarili\?order_id=/)
  orderId=new URL(page.url()).searchParams.get('order_id')!
  const evidence=await customer.from('order_agreements').select('snapshot').eq('order_id',orderId).single();ok(evidence);expect(evidence.data!.snapshot.totals.total).toBe(42)
  expect((await service.from('order_document_deliveries').select('status').eq('order_id',orderId).single()).data?.status).toBe('pending')
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Sipariş belgelerini indir'}).click();expect((await download).suggestedFilename()).toMatch(/\.txt$/)
  await page.goto('/hesabim');await page.getByText('İade / iptal başvurusu',{exact:true}).click();await page.getByLabel('Siparişinizle ilgili talebiniz').fill('Yalnız izole test iade başvurusu');await page.getByRole('button',{name:'Başvuruyu gönder'}).click();await expect(page.getByText('Başvurunuz alındı',{exact:true})).toBeVisible()
  ok(await service.rpc('apply_order_event',{p_siparis_id:orderId,p_event:'manual_paid',p_event_key:`local-paid-${orderId}`}))
  const admin=createClient(url,anonKey,{auth:{persistSession:false}});ok(await admin.auth.signInWithPassword({email:a.data.user!.email!,password}))
  ok(await admin.rpc('decide_order_return',{p_order_id:orderId,p_action:'approve',p_note:'Yalnız izole kabul testi kararı'}))
  for(let i=0;i<2;i++)ok(await admin.rpc('decide_order_return',{p_order_id:orderId,p_action:'refund',p_note:'Yalnız izole banka kayıt kabul testi',p_bank_reference:'LOCAL-TEST-BANK-REFERENCE',p_restock:true}))
  expect((await service.from('urun_stoklari').select('stok_miktari').eq('id',stockId).single()).data?.stok_miktari).toBe(10)
  await page.reload();await expect(page.getByText('Banka iadesi kaydedildi',{exact:true})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }finally{
  if(orderId){await service.from('checkout_attempts').delete().eq('siparis_id',orderId);await service.from('siparisler').delete().eq('id',orderId)}
  if(profileId){await service.from('sepet_items').delete().eq('musteri_id',profileId);await service.from('stok_rezervasyonlari').delete().eq('musteri_id',profileId);await service.from('checkout_reviews').delete().eq('customer_id',profileId)}
  if(stockId)await service.from('urun_stoklari').delete().eq('id',stockId)
  for(const uid of [customerId,adminId].filter(Boolean)){await service.from('admin_users').delete().eq('user_id',uid);await service.from('musteriler').delete().eq('user_id',uid);await service.auth.admin.deleteUser(uid)}
  if(previous.data){const {version,published_at,...value}=previous.data;void version;void published_at;ok(await service.from('commerce_configuration').update(value).eq('id',true))}
  if(previousPayment.data)ok(await service.from('checkout_payment_settings').update(previousPayment.data).eq('id',true))
 }
})
