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
  aciklama: 'Satın alma kontrollerinin yanında taşmayan ürün açıklaması.', ana_gorsel_url: 'http://127.0.0.1:4192/qa-product.svg',
  kategoriler: categories[1], markalar: null, urun_stoklari: stocks, urun_gorselleri: [{ id: id(4), urun_id: productId, gorsel_url: 'http://127.0.0.1:4192/qa-product.svg', sira_no: 0 }] }
const campaigns = [{ id: id(5), kod: 'DENEME10', ad: 'Fixture indirimi', aktif: true, kapsam: 'kategori', indirim_tipi: 'yuzde', indirim_degeri: 10,
  baslangic_tarihi: '2026-01-01T00:00:00Z', bitis_tarihi: '2099-01-01T00:00:00Z', aciklama: 'Deneme kampanyası' }]

async function session(page: Page) {
  const user = { id: id(99), aud: 'authenticated', role: 'authenticated', email: 'customer@example.test', user_metadata: {}, app_metadata: {}, created_at: '2026-10-03T00:00:00Z' }
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: 4102444800 })).toString('base64url')}.fixture`
  await page.addInitScript(value => localStorage.setItem('sb-127-auth-token', JSON.stringify(value)), {
    access_token: token, refresh_token: 'fixture', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user,
  })
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
}
test.beforeEach(async ({ page }) => {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/qa-product.svg') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#b87950"/><circle cx="200" cy="200" r="100" fill="#efe3ca"/></svg>' })
    if (url.origin === 'http://127.0.0.1:4192') return route.continue()
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

test('thirty package variants remain bounded and keyboard-selectable at every width', async ({ page }, testInfo) => {
  await page.goto('/urunler')
  const card = page.locator('.product-card').first()
  const trigger = card.getByRole('button', { name: /^Paket seçimi:/ })
  await trigger.focus()
  await trigger.press('ArrowDown')
  const popup = page.getByRole('listbox', { name: 'Paket seçimi' })
  await expect(popup).toBeVisible()
  await expect(popup.getByRole('option')).toHaveCount(30)
  await page.keyboard.press('End')
  await expect(popup.getByRole('option').last()).toBeFocused()
  const bounds = (await popup.boundingBox())!
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  expect(bounds.y).toBeGreaterThanOrEqual(0)
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(page.viewportSize()!.height)
  await page.screenshot({ path: testInfo.outputPath('variant-popup.png') })
  await page.keyboard.press('Enter')
  await expect(popup).not.toBeVisible()
  await expect(trigger).toContainText('30 ADET')
  await expect(card.locator('.product-card-price')).toContainText('49,00')
  await expect(trigger).toBeFocused()
  await trigger.click()
  await page.keyboard.press('Escape')
  await expect(popup).not.toBeVisible()
  await noOverflow(page)
})

test('approved leaf stays attached to header while the compact filters open beside it', async ({ page }, testInfo) => {
  await page.goto(`/urunler?kategori=${child}`)
  const trigger = page.locator('.leaf-catalog-trigger')
  const before = (await trigger.boundingBox())!
  await expect(page.locator('#catalog-filters')).toHaveCount(0)
  await trigger.click()
  const drawer = page.locator('#catalog-filters')
  await expect(drawer).toBeVisible()
  await expect(page.locator('.leaf-catalog-art')).toHaveCSS('animation-name', 'catalog-leaf-swing')
  await expect(drawer.locator('input[type="search"], input[type="text"]')).toHaveCount(0)
  await expect(drawer.locator('select')).toHaveCount(4)
  const after = (await trigger.boundingBox())!, panel = (await drawer.boundingBox())!
  expect(after).toEqual(before)
  if (page.viewportSize()!.width >= 1024) {
    expect(panel.x).toBeGreaterThan(before.x + before.width)
    expect(panel.height).toBeLessThanOrEqual(before.height + 4)
  } else expect(panel.y).toBeGreaterThanOrEqual(before.y + before.height)
  await page.screenshot({ path: testInfo.outputPath('approved-leaf-filters.png') })
  await page.getByRole('button', { name:'Filtreleri kapat', exact:true }).click()
  await expect(trigger).toBeFocused()
  await expect(drawer).toHaveCount(0)
  await noOverflow(page)
})

test('all thirteen approved detail families retain original top and complementary bottom artwork', async ({ page }, testInfo) => {
  test.setTimeout(90_000) // Thirteen complete page loads and screenshots per viewport.
  await page.route('**/rest/v1/urun_stoklari*', route => route.fulfill({ json:stocks.slice(0,3) }))
  await page.route('**/rest/v1/urunler*', route => route.fulfill({ json:{...product,urun_stoklari:stocks.slice(0,3)} }))
  for (const theme of ['spice','oil','soap','delight','water','paste','essence','color','cream','molasses','vinegar','shampoo','salt']) {
    const themed = categories.map(c => ({ ...c, urun_detay_temasi:theme }))
    await page.route('**/rest/v1/kategoriler*', route => {
      const query = new URL(route.request().url()).searchParams
      return route.fulfill({ json:query.has('id') ? themed.find(c=>`eq.${c.id}`===query.get('id')) : themed })
    })
    await page.goto(`/urun/${productId}`)
    const purchase = page.locator('.product-purchase-art')
    await expect(purchase.locator(`[data-approved-artwork="${theme}"]`)).toHaveCount(2)
    const windows = await purchase.locator('.category-artwork').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('viewBox')))
    expect(windows[0]).not.toBe(windows[1])
    await purchase.scrollIntoViewIfNeeded()
    await purchase.screenshot({ path:testInfo.outputPath(`approved-detail-${theme}.png`) })
    await noOverflow(page)
  }
})

test('detail inherits artwork and opens a focus-trapped large image without zoom', async ({ page }, testInfo) => {
  await page.goto(`/urun/${productId}`)
  const purchase = page.locator('.product-purchase-art')
  await expect(purchase.locator('.category-artwork')).toHaveCount(2)
  const upper = purchase.locator('.product-upper-art'), lower = purchase.locator('.product-lower-art')
  await expect(upper).toHaveAttribute('data-approved-artwork', 'spice')
  await expect(upper.locator('image')).toHaveAttribute('href', '/artwork/approved/spice.webp')
  expect((await lower.boundingBox())!.y).toBeGreaterThan((await purchase.getByRole('button', { name: 'Sepete ekle', exact: true }).boundingBox())!.y)
  const opener = page.getByRole('button', { name: `${product.urun_adi} görselini büyük aç` })
  await opener.click()
  const dialog = page.getByRole('dialog', { name: product.urun_adi })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('img')).toHaveJSProperty('naturalWidth', 400)
  await expect(dialog.locator('img')).toHaveCSS('transform', 'none')
  await expect(dialog.getByRole('button')).toHaveCount(1)
  await dialog.locator('img').click()
  await expect(dialog.locator('img')).toHaveCSS('transform', 'none')
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Büyük görseli kapat' })).toBeFocused()
  await page.screenshot({ path: testInfo.outputPath('detail-large-image.png') })
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(opener).toBeFocused()
  await noOverflow(page)
})

test('category retains root title with two decorative drawings', async ({ page }, testInfo) => {
  await page.goto(`/urunler?kategori=${child}`)
  const banner = page.locator('[data-category-banner]')
  await expect(banner.getByRole('heading', { level: 1 })).toHaveText('Baharatlar')
  await expect(banner.locator('.category-artwork')).toHaveCount(2)
  await expect(banner.locator('img')).toHaveCount(0)
  await expect(banner.locator('.category-artwork').first()).toHaveAttribute('aria-hidden', 'true')
  const sheets = await page.evaluate(async () => Promise.all(['category', 'spice'].map(part => new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => reject(new Error(`Artwork sheet ${part} unavailable`))
    image.src = `/artwork/approved/${part}.webp`
  }))))
  expect(sheets).toEqual([{ width: 1536, height: 1024 }, { width: 1448, height: 1086 }])
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('theme-banner.png') })
})

test('coupon confirms only successful clipboard writes', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('denied') } } }))
  await page.goto('/kampanyalar')
  const copy = page.getByRole('button', { name: 'DENEME10 kampanya kodunu kopyala' })
  await copy.click()
  await expect(page.getByText('Kod kopyalanamadı. Kodu seçerek kopyalayabilirsiniz.')).toBeVisible()
  await expect(copy).toContainText('Kodu kopyala')
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value: string) => { (window as unknown as { copied: string }).copied = value } } }))
  await copy.click()
  await expect(copy).toContainText('Kopyalandı')
  expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toBe('DENEME10')
  await noOverflow(page)
})

test('selected child overrides its inherited banner theme while keeping the root title', async ({ page }) => {
  for (const theme of ['soap', 'plain']) {
    const overridden = categories.map(category => category.id === child ? { ...category, banner_temasi: theme } : {
      ...category, banner_desktop_url: product.ana_gorsel_url, banner_mobile_url: product.ana_gorsel_url,
    })
    await page.route('**/rest/v1/kategoriler*', route => route.fulfill({ json: overridden }))
    await page.goto(`/urunler?kategori=${child}`)
    const banner = page.locator('[data-category-banner]')
    await expect(banner.getByRole('heading', { level: 1 })).toHaveText('Baharatlar')
    await expect(banner.locator('.category-artwork')).toHaveCount(theme === 'plain' ? 0 : 2)
    if (theme === 'soap') {
      await expect(banner.locator('.category-artwork').first()).toHaveAttribute('data-approved-artwork', 'soap')
    }
    await expect(banner.locator('img')).toHaveCount(0)
    await noOverflow(page)
  }
})

test('contact keeps failed messages and shows the sent envelope only after success', async ({ page }, testInfo) => {
  await session(page)
  let succeed = false
  await page.route('**/rest/v1/sorular*', route => route.request().method() === 'POST'
    ? route.fulfill({ status: succeed ? 201 : 403, json: succeed ? null : { message: 'fixture denied' } }) : route.fulfill({ json: [] }))
  await page.goto('/bize-ulasin')
  const message = page.getByLabel('Sorunuz veya Mesajınız')
  await message.fill('Siparişime ilişkin deneme sorusu.')
  await page.getByRole('button', { name: 'Gönder', exact: true }).click()
  await expect(page.getByText('Mesajınız gönderilemedi. Lütfen tekrar deneyin.')).toBeVisible()
  await expect(message).toHaveValue('Siparişime ilişkin deneme sorusu.')
  await expect(page.locator('.support-contact-art')).not.toHaveClass(/is-sent/)
  succeed = true
  await page.getByRole('button', { name: 'Gönder', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Mesajınız bize ulaştı' })).toBeVisible()
  await expect(page.locator('.support-contact-art')).toHaveClass(/is-sent/)
  await expect(message).not.toBeVisible()
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('contact-sent.png') })
})

test('account retains approved parcel and readable order records at every width', async ({ page }, testInfo) => {
  await session(page)
  await page.route('**/rest/v1/siparisler*', route=>route.fulfill({json:[{id:id(555),siparis_no:'EB-2026-000123',olusturma_tarihi:'2026-10-08T10:00:00Z',siparis_durumu:'hazirlaniyor',payment_method:'havale',odeme_durumu:'odendi',toplam_tutar:125,kargo_durumu:'hazirlaniyor'}]}))
  await page.goto('/hesabim')
  await expect(page.getByRole('heading',{name:'Hesabım',exact:true})).toBeVisible()
  await expect(page.locator('[data-approved-artwork="parcel"]')).toHaveCount(1)
  await expect(page.locator('.support-order')).toContainText('EB-2026-000123')
  await page.locator('.support-order').scrollIntoViewIfNeeded()
  await page.screenshot({path:testInfo.outputPath('approved-account.png')})
  await noOverflow(page)
})

test('empty cart has a usable discovery link at every width', async ({ page }, testInfo) => {
  await session(page)
  await page.goto('/sepet')
  await expect(page.getByRole('heading', { name: 'Sepetin henüz boş' })).toBeVisible()
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('empty-cart.png') })
  await page.getByRole('link', { name: 'Ürünleri keşfet', exact: true }).click()
  await expect(page).toHaveURL('/urunler')
})

test('bestseller heading reveals its drawing once and stays compact', async ({ page }, testInfo) => {
  await page.goto('/en-cok-satan')
  const heading = page.locator('.bestseller-art-heading')
  await expect(heading.getByRole('heading', { level: 1 })).toHaveText('En çok satanlar')
  const drawing = heading.locator('[data-approved-artwork="bestseller"]')
  await expect(drawing).toHaveCount(2)
  await expect(drawing.first()).toHaveCSS('animation-iteration-count', '1')
  expect((await heading.boundingBox())!.height).toBeLessThanOrEqual(160)
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('bestseller-heading.png') })
})

test('bestseller cards enter in sequence once when visible and respect reduced motion', async ({ page }) => {
  await page.addInitScript(() => {
    const entered: string[] = []
    Object.assign(window, { productEntrances: entered })
    document.addEventListener('animationstart', event => {
      if (event.animationName === 'product-enter') entered.push(getComputedStyle(event.target as Element).animationDelay)
    })
  })
  await page.route('**/rest/v1/urunler?*', route => route.fulfill({ json: [product, { ...product, id: id(7) }] }))
  await page.goto('/en-cok-satan')
  const cards = page.locator('.staggered-products > div')
  await expect(cards).toHaveCount(2)
  await cards.first().scrollIntoViewIfNeeded()
  await expect.poll(() => page.evaluate(() => (window as unknown as { productEntrances: string[] }).productEntrances)).toEqual(['0s', '0.06s'])
  await expect(cards.first()).toHaveCSS('animation-name', 'none')
  await page.getByRole('button', { name: 'Önerilen', exact: true }).click()
  await page.getByRole('button', { name: 'Otomatik', exact: true }).click()
  await expect(cards).toHaveCount(2)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(cards.first()).toHaveCSS('animation-name', 'none')
  await noOverflow(page)
})
