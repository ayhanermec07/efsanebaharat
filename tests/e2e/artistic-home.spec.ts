import { expect, test, type Page } from '@playwright/test'
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const root = id(1), child = id(2), productId = id(3)
const categories = [
  { id: root, kategori_adi: 'Baharatlar', ust_kategori_id: null, sira_no: 0, aktif_durum: true, urun_detay_temasi: 'spice', banner_temasi: 'spice' },
  { id: child, kategori_adi: 'Toz Baharatlar', ust_kategori_id: root, sira_no: 1, aktif_durum: true, urun_detay_temasi: null, banner_temasi: null },
]
const stocks = Array.from({ length: 30 }, (_, i) => ({ id: id(100 + i), urun_id: productId, birim_turu: 'adet', birim_adedi: i + 1,
  birim_adedi_turu: 'adet', fiyat: 20 + i, min_siparis_miktari: 1, stok_grubu: 'hepsi', aktif_durum: true }))
const product = { id: productId, urun_adi: 'Fixture Baharat Ürünü', kategori_id: child, marka_id: null, aktif_durum: true,
  aciklama: 'Satın alma kontrollerinin yanında taşmayan ürün açıklaması.', ana_gorsel_url: 'http://127.0.0.1:4193/qa-product.svg',
  kategoriler: categories[1], markalar: null, urun_stoklari: stocks, urun_gorselleri: [{ id: id(4), urun_id: productId, gorsel_url: 'http://127.0.0.1:4193/qa-product.svg', sira_no: 0 }] }
const campaigns = [{ id: id(5), kod: 'DENEME10', ad: 'Fixture indirimi', aktif: true, kapsam: 'kategori', indirim_tipi: 'yuzde', indirim_degeri: 10,
  baslangic_tarihi: '2026-01-01T00:00:00Z', bitis_tarihi: '2099-01-01T00:00:00Z', aciklama: 'Deneme kampanyası', banner_gorseli: '/qa-product.svg', anasayfada_goster: true, hedef_grup: 'hepsi', sira_no: 0 }]

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
}
test.beforeEach(async ({ page }) => {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/qa-product.svg') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#b87950"/><circle cx="200" cy="200" r="100" fill="#efe3ca"/></svg>' })
    if (url.origin === 'http://127.0.0.1:4193') return route.continue()
    if (url.origin !== 'http://127.0.0.1:54321') return route.abort()
    if (url.pathname.endsWith('/public-catalog')) return route.fulfill({ json: { data: { urunler: [product], toplam: 1, sonrakiImlec: null,
      kampanya: null, kampanyaGecersiz: false, fiyatGrubu: 'musteri', kategoriler: categories, markalar: [] } } })
    if (url.pathname.endsWith('/xml-musteri-siparis')) return route.fulfill({ json: { data: { id: id(98), isAdmin: false, musteri_tipi: 'musteri', aktif_durum: true } } })
    if (url.pathname === '/rest/v1/urunler') return route.fulfill({ json: url.searchParams.has('id') ? product : [product] })
    if (url.pathname === '/rest/v1/urun_stoklari') return route.fulfill({ json: stocks })
    if (url.pathname === '/rest/v1/urun_gorselleri') return route.fulfill({ json: product.urun_gorselleri })
    if (url.pathname === '/rest/v1/kategoriler') return route.fulfill({ json: url.searchParams.has('id') ? categories.find(c => `eq.${c.id}` === url.searchParams.get('id')) : categories })
    if (url.pathname === '/rest/v1/kampanyalar') return route.fulfill({ json: campaigns })
    if (url.pathname.startsWith('/rest/v1/')) return route.fulfill({ json: [] })
    return route.abort()
  })
})


test('real intro video advances and fades to a botanical banner after five seconds', async ({ page }, testInfo) => {
  await page.goto('/')
  const video = page.locator('.home-intro video')
  await expect(video).toBeVisible()
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.videoWidth)).toBeGreaterThan(0)
  const size = await video.evaluate((element: HTMLVideoElement) => ({ width: element.videoWidth, height: element.videoHeight, src: element.currentSrc, duration: element.duration }))
  expect(size.duration).toBeCloseTo(5, 1)
  expect(size.src).toContain(page.viewportSize()!.width < 768 ? 'mobile.webm' : 'desktop.webm')
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(.3)
  const start = (await page.locator('.home-intro').boundingBox())!
  const startHero = (await page.locator('.home-hero').boundingBox())!
  await expect(video).toHaveCSS('transition-duration', '0.35s')
  await page.locator('.home-intro').evaluate(element => {
    const observer = new MutationObserver(() => {
      if (element.classList.contains('home-intro-exiting')) {
        (window as unknown as { introFadeObserved: boolean }).introFadeObserved = true
        observer.disconnect()
      }
    })
    observer.observe(element, { attributes: true, attributeFilter: ['class'] })
  })
  await expect(page.getByRole('heading', { name: 'Efsane lezzetler her zaman yanınızda' })).toBeVisible()
  if (page.viewportSize()!.width === 768) {
    const caption = (await page.locator('.home-intro-copy p').boundingBox())!
    const skip = (await page.getByRole('button', {name:'Atla'}).boundingBox())!
    expect(caption.y).toBeGreaterThanOrEqual(skip.y + skip.height)
  }
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('home-intro.png') })
  await expect(page.locator('.home-intro')).not.toBeVisible({ timeout: 9000 })
  expect(await page.evaluate(() => (window as unknown as { introFadeObserved: boolean }).introFadeObserved)).toBe(true)
  const banner = page.locator('.campaign-slide .botanical-banner')
  await expect(banner).toBeVisible()
  await expect(page.locator('.campaign-slide')).toHaveCSS('opacity','1')
  expect(Math.abs((await banner.boundingBox())!.height - start.height)).toBeLessThanOrEqual(2)
  expect(Math.abs((await page.locator('.home-hero').boundingBox())!.height - startHero.height)).toBeLessThanOrEqual(2)
  await page.screenshot({ path: testInfo.outputPath('home-botanical.png') })
  await page.mouse.move(0, 0)
  await expect(page.getByRole('group', { name: /2 \/ 2: Fixture indirimi/ })).toBeVisible({ timeout: 9000 })
  await expect(page.getByRole('group', { name: /1 \/ 2: Sofranıza her zaman lezzet/ })).toBeVisible({ timeout: 9000 })
  await noOverflow(page)
})

test('skip and session reload bypass video and reduced motion keeps the first banner static', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Atla' }).click()
  await expect(page.locator('.campaign-slide .botanical-banner')).toBeVisible()
  await page.reload()
  await expect(page.locator('.campaign-slide .botanical-banner')).toBeVisible()
  await expect(page.locator('.home-intro video')).toHaveCount(0)
  await page.evaluate(() => sessionStorage.clear())
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await expect(page.locator('.home-intro video')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Otomatik geçişi başlat' })).toBeVisible()
  await page.waitForTimeout(6500)
  await expect(page.locator('.campaign-slide .botanical-banner')).toBeVisible()
  await noOverflow(page)
})

test('video failure falls back to botanical without breaking the product catalog', async ({ page }) => {
  await page.route('**/artwork/*.webm', route => route.abort())
  await page.goto('/')
  await expect(page.locator('.campaign-slide .botanical-banner')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('.home-intro')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Öne çıkan ürünler' })).toBeVisible()
  await noOverflow(page)
})

test('no campaigns leaves the botanical first slide static', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('efsane-spice-intro-seen', '1'))
  await page.route('**/rest/v1/kampanyalar*', route => route.fulfill({ json: [] }))
  await page.goto('/')
  await expect(page.locator('.campaign-slide .botanical-banner')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sonraki banner' })).toHaveCount(0)
  await noOverflow(page)
})

test('intro reveals its slogan after one second and dissolves into the botanical scene from three seconds', async ({ page }) => {
  await page.goto('/')
  const video = page.locator('.home-intro video')
  await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.readyState)).toBeGreaterThanOrEqual(2)
  await video.evaluate((el: HTMLVideoElement) => { el.pause(); el.currentTime = 0 })
  await expect(page.locator('.home-intro-copy')).toHaveCSS('opacity', '0')
  await video.evaluate((el: HTMLVideoElement) => { el.currentTime = 2 })
  await expect(page.locator('.home-intro-copy')).toHaveCSS('opacity', '1')
  await video.evaluate((el: HTMLVideoElement) => { el.currentTime = 4 })
  await expect.poll(() => video.evaluate(el => Number(getComputedStyle(el).opacity))).toBeCloseTo(.5, 1)
})

test('home bestseller title retains both approved motifs', async ({ page }) => {
  await page.goto('/')
  const title = page.getByRole('heading', { name: 'En çok satanlar', exact: true })
  await expect(title.locator('[data-approved-artwork="bestseller"]')).toHaveCount(2)
  await noOverflow(page)
})
