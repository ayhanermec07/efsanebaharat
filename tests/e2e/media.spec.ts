import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const id='00000000-0000-4000-8000-000000000001'
const image=`https://images.example.com/urun-gorselleri/${'a'.repeat(64)}.png`
const png=readFileSync(new URL('../../public/icon-512.png',import.meta.url))
const product={id,urun_adi:'R2 test baharatı',urun_kodu:'R2',aciklama:'Görsel kabul ürünü',kategori_id:null,marka_id:null,ana_gorsel_url:image,created_at:'2026-10-06',aktif_durum:true,
 urun_gorselleri:[{id,urun_id:id,gorsel_url:image,sira_no:0}],
 urun_stoklari:[{id,urun_id:id,birim_turu:'gr',birim_adedi:100,birim_adedi_turu:'gr',fiyat:1,stok_miktari:1000,min_siparis_miktari:1,stok_grubu:'hepsi',aktif_durum:true}],kategoriler:null,markalar:null}

test.beforeEach(async({page})=>{
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url())
  if(url.origin==='http://127.0.0.1:4176')return route.continue()
  if(url.origin==='https://images.example.com')return route.fulfill({body:png,contentType:'image/png'})
  if(url.origin!=='http://127.0.0.1:54321')return route.abort()
  if(url.pathname.endsWith('/public-catalog'))return route.fulfill({json:{data:{urunler:[product],toplam:1,sonrakiImlec:null,kampanya:null,kampanyaGecersiz:false,fiyatGrubu:'musteri',kategoriler:[],markalar:[]}}})
  if(url.pathname==='/rest/v1/urunler')return route.fulfill({json:product})
  if(url.pathname==='/rest/v1/urun_gorselleri')return route.fulfill({json:product.urun_gorselleri})
  if(url.pathname==='/rest/v1/urun_stoklari')return route.fulfill({json:product.urun_stoklari})
  if(url.pathname==='/rest/v1/site_settings')return route.fulfill({json:[{setting_key:'logo',setting_value:{url:image,width:100}}]})
  if(url.pathname.startsWith('/rest/v1/'))return route.fulfill({json:[]})
  return route.abort()
 })
})

test('katalog ve ana sayfa doğru boyutları seçer ve mobil taşma oluşturmaz',async({page},info)=>{
 for(const path of ['/urunler','/']){
  await page.goto(path,{waitUntil:'domcontentloaded'})
  const img=page.locator('article img').first()
  await expect(img).toBeVisible()
  await expect.poll(()=>img.evaluate(el=>(el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth>0)).toBe(true)
  expect(await img.getAttribute('srcset')).toContain('width=320')
  const current=await img.evaluate(el=>(el as HTMLImageElement).currentSrc)
  expect(current).toMatch(/width=(320|640|960)/)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
  await page.screenshot({path:info.outputPath(path==='/'?'home.png':'catalog.png')})
 }
})

test('detay görseli önceliklidir; dönüşüm hatası orijinale bir kez döner',async({page},info)=>{
 let failed=0
 await page.route('https://images.example.com/cdn-cgi/image/**',route=>{failed++;return route.fulfill({status:503,body:'unavailable'})})
 await page.goto(`/urun/${id}`,{waitUntil:'domcontentloaded'})
 const main=page.getByRole('img',{name:'R2 test baharatı',exact:true})
 await expect(main).toHaveAttribute('loading','eager')
 await expect(main).toHaveAttribute('fetchpriority','high')
 await expect(main).toHaveAttribute('src',image)
 await expect(main).not.toHaveAttribute('srcset',/.+/)
 await expect.poll(()=>main.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
 expect(failed).toBeGreaterThan(0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
 await page.screenshot({path:info.outputPath('detail-fallback.png')})
})

test('orijinal de başarısızsa erişilebilir boş görsel görünür',async({page})=>{
 await page.route('https://images.example.com/**',route=>route.fulfill({status:404,body:'missing'}))
 await page.goto(`/urun/${id}`,{waitUntil:'domcontentloaded'})
 await expect(page.locator('main [role="img"]').filter({hasText:''}).first()).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
})
