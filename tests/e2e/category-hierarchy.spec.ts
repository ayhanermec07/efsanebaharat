import { expect, test, type Page } from '@playwright/test'

// Network fixtures isolate UI acceptance from live data and unavailable local Docker.
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const spices = id(1), powder = id(2), red = id(3), whole = id(4), tea = id(50)
const fixtureCategories = [
  { id: spices, kategori_adi: 'Baharatlar', ust_kategori_id: null, sira_no: 0 },
  { id: powder, kategori_adi: 'Toz Baharatlar', ust_kategori_id: spices, sira_no: 1 },
  { id: red, kategori_adi: 'Kırmızı Biber', ust_kategori_id: powder, sira_no: 2 },
  { id: whole, kategori_adi: 'Tane Baharatlar', ust_kategori_id: spices, sira_no: 3 },
  ...Array.from({ length: 28 }, (_, i) => ({ id: id(10 + i), kategori_adi: `Diğer Kategori ${i}`, ust_kategori_id: null, sira_no: 20 + i })),
  { id: tea, kategori_adi: 'Çaylar', ust_kategori_id: null, sira_no: 100 },
].map(category => ({ ...category, aktif_durum: true, aciklama: '', gorsel_url: null,
  banner_desktop_url: category.id === spices ? 'https://banner.example.test/desktop.png' : null,
  banner_mobile_url: category.id === spices ? 'https://banner.example.test/mobile.png' : null,
}))

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
}

async function adminSession(page: Page) {
  const user = { id: id(99), aud: 'authenticated', role: 'authenticated', email: 'admin@example.test', user_metadata: {}, app_metadata: {}, created_at: '2026-10-03T00:00:00Z' }
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: 4102444800 })).toString('base64url')}.fixture`
  await page.addInitScript(session => localStorage.setItem('sb-127-auth-token', JSON.stringify(session)), {
    access_token: token, refresh_token: 'fixture', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user,
  })
}

test.beforeEach(async ({ page }) => {
  const categories = fixtureCategories.map(category => ({ ...category }))
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.hostname === 'banner.example.test') return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9l0AAAAASUVORK5CYII=', 'base64') })
    if (url.origin === 'http://127.0.0.1:4175') return route.continue()
    if (url.origin !== 'http://127.0.0.1:54321') return route.abort()
    const pathname = url.pathname
    if (pathname === '/rest/v1/kategoriler') {
      if (route.request().method() === 'PATCH') {
        const category = categories.find(category => `eq.${category.id}` === url.searchParams.get('id'))!
        Object.assign(category, route.request().postDataJSON())
        return route.fulfill({ status: 204 })
      }
      let rows = categories
      const search = url.searchParams.get('kategori_adi')
      if (search) rows = rows.filter(category => category.kategori_adi.includes(search.replace(/^ilike\.%|%$/g, '')))
      // The old header query excludes children, just as the real API would.
      if (url.searchParams.get('ust_kategori_id') === 'is.null') rows = rows.filter(category => !category.ust_kategori_id)
      const offset = Number(url.searchParams.get('offset') || 0)
      const limit = Number(url.searchParams.get('limit') || 1000)
      const result = rows.slice(offset, offset + limit)
      return route.fulfill({ json: result, headers: { 'content-range': `${offset}-${offset + result.length - 1}/${rows.length}` } })
    }
    if (pathname.endsWith('/public-catalog')) {
      return route.fulfill({ json: { data: { urunler: [], toplam: 0, sonrakiImlec: null, kampanya: null, kampanyaGecersiz: false, fiyatGrubu: 'musteri', ...(url.searchParams.has('meta') ? { kategoriler: categories, markalar: [] } : {}) } } })
    }
    if (pathname.endsWith('/xml-musteri-siparis')) return route.fulfill({ json: { data: { id: id(98), isAdmin: true, musteri_tipi: 'musteri', aktif_durum: true } } })
    if (pathname.startsWith('/rest/v1/')) return route.fulfill({ json: [] })
    return route.abort()
  })
})

test('kategori banner kökü kullanır; yalnız ekrana uygun görseli indirir ve genel başlığa döner', async ({ page }, testInfo) => {
  const images: string[] = []
  page.on('request', request => { if (request.url().includes('banner.example.test')) images.push(request.url()) })
  await page.goto(`/urunler?kategori=${red}`)
  const banner = page.locator('[data-category-banner]')
  await expect(banner.getByRole('heading', { level: 1 })).toHaveText('Baharatlar')
  await expect(banner.locator('p')).toHaveCount(0)
  const expected = page.viewportSize()!.width < 768 ? 'mobile' : 'desktop'
  await expect(banner.locator('img')).toHaveJSProperty('naturalWidth', 1)
  expect(images).toEqual([`https://banner.example.test/${expected}.png`])
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('kategori-banner.png') })
  await page.getByRole('button', { name: 'Filtreler', exact: true }).click()
  await page.getByLabel('Ana kategori', { exact: true }).selectOption('')
  await expect(page.getByRole('heading', { name: 'Ürünler', exact: true })).toBeVisible()
  await expect(banner).toHaveCount(0)
  await page.goBack()
  await expect(banner.getByRole('heading', { level: 1 })).toHaveText('Baharatlar')
})

test('eksik ve hatalı banner sade zemine döner', async ({ page }) => {
  await page.goto(`/urunler?kategori=${tea}`)
  const banner = page.locator('[data-category-banner]')
  await expect(banner.getByRole('heading', { level: 1 })).toHaveText('Çaylar')
  await expect(banner.locator('img')).toHaveCount(0)
  await page.route('https://banner.example.test/**', route => route.abort())
  await page.goto(`/urunler?kategori=${spices}`)
  await expect(banner.locator('img')).toHaveCount(0)
  await expect(banner.getByRole('heading', { level: 1 })).toHaveText('Baharatlar')
  await noOverflow(page)
})

test('uzun kategori adı ve yalnız yönetimde yazılmış açıklama taşmadan gösterilir', async ({ page }, testInfo) => {
  const categories = fixtureCategories.map(category => category.id === spices ? { ...category, kategori_adi: 'Doğal Baharatlar ve Geleneksel Lezzetler', aciklama: 'Özenle seçilmiş baharatlar. '.repeat(19).trim() } : category)
  await page.route('**/rest/v1/kategoriler*', route => route.fulfill({ json: categories }))
  await page.goto(`/urunler?kategori=${red}`)
  const banner = page.locator('[data-category-banner]')
  await expect(banner.locator('p')).toHaveText(categories[0].aciklama)
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('kategori-banner-uzun-metin.png') })
})

test('yönetim banner alanlarını bağımsız kaldırır ve yeniden yükler; kart görselini korur', async ({ page }) => {
  await adminSession(page)
  await page.goto('/admin/kategoriler')
  const row = page.viewportSize()!.width < 640
    ? page.locator('.sm\\:hidden > div').filter({ has: page.getByText('Baharatlar', { exact: true }) })
    : page.getByRole('row').filter({ has: page.getByText('Baharatlar', { exact: true }) })
  await row.getByRole('button', { name: 'Düzenle', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Kategori Düzenle' })
  await dialog.getByRole('region', { name: 'Mobil banner', exact: true }).getByRole('button', { name: 'Görsel 1 sil' }).click()
  const desktop = dialog.getByRole('region', { name: 'Masaüstü banner', exact: true })
  await desktop.getByRole('button', { name: 'Görsel 1 sil' }).click()
  const mobile = dialog.getByRole('region', { name: 'Mobil banner', exact: true })
  await mobile.locator('input[type="file"]').setInputFiles({ name: 'mobile.png', mimeType: 'image/png', buffer: Buffer.from('fixture') })
  await dialog.locator('textarea').fill('Yönetici açıklaması')
  await expect(mobile.getByText('Yükleme bekliyor', { exact: true })).toBeVisible()
  await page.route('**/functions/v1/image-storage-upload', route => route.fulfill({ json: { success: true, data: { publicUrl: 'https://banner.example.test/replacement.png' } } }))
  await desktop.getByRole('tab', { name: 'Link ile Ekle' }).click()
  await desktop.locator('input[type="url"]').fill('https://banner.example.test/source.png')
  await desktop.getByRole('button', { name: 'Ekle', exact: true }).click()
  await expect(desktop.getByText('Yüklendi', { exact: true })).toBeVisible()
  await expect(mobile.getByText('Yükleme bekliyor', { exact: true })).toBeVisible()
  await mobile.getByRole('button', { name: 'Görsel 1 sil' }).click()
  const save = page.waitForRequest(request => request.method() === 'PATCH' && request.url().includes('/rest/v1/kategoriler'))
  await dialog.getByRole('button', { name: 'Güncelle', exact: true }).click()
  const payload = (await save).postDataJSON()
  expect(payload.banner_mobile_url).toBe('')
  expect(payload.banner_desktop_url).toBe('https://banner.example.test/replacement.png')
  expect(payload.gorsel_url).toBe('')
  await noOverflow(page)
})

test('menü alt kategorileri açar ve üçüncü seviye bağlantıyı korur', async ({ page }, testInfo) => {
  await page.goto('/urunler')
  const mobile = (page.viewportSize()?.width || 1440) < 1024
  if (mobile) await page.getByRole('button', { name: 'Menüyü aç', exact: true }).click()
  else await page.getByRole('button', { name: 'Kategoriler', exact: true }).click()
  const menu = mobile ? page.getByRole('dialog', { name: 'Mobil menü' }) : page.locator('header')
  if (mobile) {
    await menu.locator('summary').filter({ hasText: /^Baharatlar$/ }).click()
    await menu.locator('summary').filter({ hasText: /^Toz Baharatlar$/ }).click()
  }
  await expect(menu.getByRole('link', { name: 'Kırmızı Biber', exact: true })).toBeVisible()
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('kategori-menusu.png') })
  await menu.getByRole('link', { name: 'Kırmızı Biber', exact: true }).click()
  await expect(page).toHaveURL(`/urunler?kategori=${red}`)
  if (mobile) await expect(page.getByRole('dialog', { name: 'Mobil menü' })).not.toBeVisible()
})

test('alt kategori URLsi ana seçimi belirler; ana değişince alt seçim sıfırlanır', async ({ page }, testInfo) => {
  await page.goto(`/urunler?kategori=${red}&marka=${id(90)}&sirala=ad`)
  await page.getByRole('button', { name: 'Filtreler', exact: true }).click()
  await expect(page.getByLabel('Ana kategori', { exact: true })).toHaveValue(spices)
  await expect(page.getByLabel('Alt kategori', { exact: true })).toHaveValue(red)
  await page.screenshot({ path: testInfo.outputPath('kategori-filtreleri.png') })
  const request = page.waitForRequest(request => request.url().includes('/public-catalog?') && new URL(request.url()).searchParams.get('kategori') === spices)
  await page.getByLabel('Alt kategori', { exact: true }).selectOption('')
  await request
  await expect(page).toHaveURL(`/urunler?kategori=${spices}&marka=${id(90)}&sirala=ad`)
  await page.getByLabel('Ana kategori', { exact: true }).selectOption(tea)
  await expect(page.getByLabel('Alt kategori', { exact: true })).not.toBeVisible()
  await expect(page).toHaveURL(`/urunler?kategori=${tea}&marka=${id(90)}&sirala=ad`)
  await page.goBack()
  await expect(page.getByLabel('Ana kategori', { exact: true })).toHaveValue(spices)
  await noOverflow(page)
})

test('onaylı banner ve detay temaları ayrı kaydedilir ve doğru çiftlerle önizlenir', async ({ page }, testInfo) => {
  await adminSession(page)
  await page.goto('/admin/kategoriler')
  const row = page.viewportSize()!.width < 640
    ? page.locator('.sm\\:hidden > div').filter({ has: page.getByText('Baharatlar', { exact:true }) })
    : page.getByRole('row').filter({ has: page.getByText('Baharatlar', { exact:true }) })
  await row.getByRole('button',{name:'Düzenle',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Kategori Düzenle'})
  await dialog.getByLabel('Ürün detay teması',{exact:true}).selectOption('oil')
  await dialog.getByLabel('Kategori banner teması',{exact:true}).selectOption('spice')
  await expect(dialog.locator('[data-approved-artwork="oil"]')).toHaveCount(2)
  await expect(dialog.locator('[data-approved-artwork="category"]')).toHaveCount(2)
  const save=page.waitForRequest(r=>r.method()==='PATCH' && r.url().includes('/rest/v1/kategoriler'))
  await dialog.getByRole('button',{name:'Güncelle',exact:true}).click()
  expect((await save).postDataJSON()).toMatchObject({urun_detay_temasi:'oil',banner_temasi:'spice'})
  await expect(dialog).not.toBeVisible()
  await row.getByRole('button',{name:'Düzenle',exact:true}).click()
  await expect(dialog.getByLabel('Ürün detay teması',{exact:true})).toHaveValue('oil')
  await expect(dialog.getByLabel('Kategori banner teması',{exact:true})).toHaveValue('spice')
  await dialog.getByLabel('Kategori banner teması',{exact:true}).selectOption('plain')
  await expect(dialog.locator('[data-approved-artwork="category"]')).toHaveCount(0)
  await expect(dialog.locator('[data-approved-artwork="oil"]')).toHaveCount(2)
  await dialog.getByText('Sade görünüm',{exact:true}).scrollIntoViewIfNeeded()
  await page.screenshot({path:testInfo.outputPath('approved-admin-independent-themes.png')})
  await noOverflow(page)
})

test('yönetim üst kategoriyi sayfa dışından seçer; döngü oluşturan seçenekleri çıkarır', async ({ page }, testInfo) => {
  await adminSession(page)
  await page.goto('/admin/kategoriler')
  await expect(page.getByRole('heading', { name: 'Kategori Yönetimi' })).toBeVisible()
  const row = page.viewportSize()!.width < 640
    ? page.locator('.sm\\:hidden > div').filter({ has: page.getByText('Baharatlar', { exact: true }) })
    : page.getByRole('row').filter({ has: page.getByText('Baharatlar', { exact: true }) })
  await row.getByRole('button', { name: 'Düzenle', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Kategori Düzenle' })
  const select = dialog.getByLabel('Üst kategori', { exact: true })
  await expect(select.locator(`option[value="${tea}"]`)).toHaveCount(1)
  for (const excluded of [spices, powder, red, whole]) await expect(select.locator(`option[value="${excluded}"]`)).toHaveCount(0)
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('ust-kategori-formu.png') })
  await select.selectOption(tea)
  const save = page.waitForRequest(request => request.method() === 'PATCH' && request.url().includes('/rest/v1/kategoriler'))
  await dialog.getByRole('button', { name: 'Güncelle', exact: true }).click()
  expect((await save).postDataJSON().ust_kategori_id).toBe(tea)
  await expect(dialog).not.toBeVisible()
  await expect(row).toContainText('Çaylar → Baharatlar')
  await noOverflow(page)
})

test('bin kategori metadata sınırı aşılınca seçili alt kategorinin ana kategorisi kaybolmaz', async ({ page }) => {
  const large = [
    ...Array.from({ length: 1001 }, (_, index) => ({ id: id(1000 + index), kategori_adi: `A Kategori ${index}`, ust_kategori_id: null, sira_no: 0, aktif_durum: true })),
    ...fixtureCategories,
  ].sort((a, b) => a.id.localeCompare(b.id))
  await page.route('**/rest/v1/kategoriler*', route => {
    const url = new URL(route.request().url())
    const offset = Number(url.searchParams.get('offset') || 0), limit = Number(url.searchParams.get('limit') || 1000)
    return route.fulfill({ json: large.slice(offset, offset + limit) })
  })
  await page.route('**/functions/v1/public-catalog*', route => route.fulfill({ json: { data: {
    urunler: [], toplam: 0, sonrakiImlec: null, kampanya: null, kampanyaGecersiz: false, fiyatGrubu: 'musteri', markalar: [],
    kategoriler: [...large].sort((a, b) => a.kategori_adi.localeCompare(b.kategori_adi, 'tr')).slice(0, 1000),
  } } }))
  await page.goto(`/urunler?kategori=${red}`)
  await page.getByRole('button', { name: 'Filtreler', exact: true }).click()
  await expect(page.getByLabel('Ana kategori', { exact: true })).toHaveValue(spices)
  await expect(page.getByLabel('Alt kategori', { exact: true })).toHaveValue(red)
  await noOverflow(page)
})

test('ince header marka ile arama arasında yalnız üç gezinme eylemi sunar', async ({ page }) => {
  test.skip((page.viewportSize()?.width || 1440) < 1024, 'Tek sıra masaüstü yerleşimi')
  await page.goto('/urunler')
  const header = page.locator('header')
  const nav = header.getByRole('navigation', { name: 'Ana gezinme' })
  await expect(nav.getByRole('link')).toHaveCount(2)
  await expect(nav.getByRole('button', { name: 'Kategoriler', exact: true })).toBeVisible()
  const brand = await header.getByRole('link', { name: /Efsane Baharat/ }).first().boundingBox()
  const menu = await nav.boundingBox()
  const search = await header.getByRole('textbox', { name: 'Ürün ara', exact: true }).boundingBox()
  expect(brand!.x + brand!.width).toBeLessThanOrEqual(menu!.x)
  expect(menu!.x + menu!.width).toBeLessThanOrEqual(search!.x)
  expect((await header.boundingBox())!.height).toBeLessThanOrEqual(105)
  await nav.getByRole('button', { name: 'Kategoriler', exact: true }).click()
  const tree = header.getByRole('region', { name: 'Kategori ağacı' })
  await expect(tree.getByRole('link', { name: 'Kırmızı Biber', exact: true })).toBeVisible()
  await expect(tree.getByRole('link', { name: 'Tüm ürünler', exact: true })).toBeVisible()
  await tree.getByRole('link', { name: 'Kırmızı Biber', exact: true }).focus()
  await page.keyboard.press('Escape')
  await expect(tree).not.toBeVisible()
  await expect(nav.getByRole('button', { name: 'Kategoriler', exact: true })).toBeFocused()
})

test('filtreler kapalı başlar, yaprakla açılır ve Escape odağı geri döndürür', async ({ page }, testInfo) => {
  await page.goto('/urunler?q=kimyon', { waitUntil: 'domcontentloaded' })
  const filters = page.getByRole('region', { name: 'Ürün filtreleri' })
  const button = filters.getByRole('button', { name: 'Filtreler', exact: true })
  await expect(button).toBeVisible()
  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await expect(filters.getByLabel('Ana kategori', { exact: true })).toHaveCount(0)
  await expect(filters.getByRole('searchbox')).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('yaprak-filtre-kapali.png') })
  await button.click()
  await expect(filters.getByLabel('Ana kategori', { exact: true })).toBeVisible()
  await expect(button).toHaveAttribute('aria-expanded', 'true')
  const drawer = await page.locator('#catalog-filters').boundingBox()
  const leaf = await button.boundingBox()
  if ((page.viewportSize()?.width || 1440) < 1024) {
    expect(drawer!.y).toBeGreaterThanOrEqual(leaf!.y + leaf!.height)
    expect(drawer!.width).toBeGreaterThan(page.viewportSize()!.width - 32)
  } else expect(drawer!.x).toBeGreaterThanOrEqual(leaf!.x + leaf!.width)
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('yaprak-filtre-acik.png') })
  await page.keyboard.press('Escape')
  await expect(button).toBeFocused()
  await expect(filters.getByLabel('Ana kategori', { exact: true })).toHaveCount(0)
  await expect(page).toHaveURL('/urunler?q=kimyon')
  await noOverflow(page)
})

test('filtreler kaydırıldığında header altında sabit ve taşmadan kullanılabilir', async ({ page }) => {
  await page.goto('/urunler')
  const filters = page.getByRole('region', { name: 'Ürün filtreleri' })
  await expect(filters).toBeVisible()
  await page.locator('main > div').evaluate(el => { el.style.minHeight = '2000px' })
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }))
  const header = await page.locator('header').boundingBox()
  const bar = await filters.boundingBox()
  expect(Math.abs(bar!.y - (header!.y + header!.height))).toBeLessThanOrEqual(1)
  await filters.getByRole('button', { name: 'Filtreler', exact: true }).click()
  await expect(filters.getByLabel('Ana kategori', { exact: true })).toBeVisible()
  await filters.getByLabel('Ana kategori', { exact: true }).selectOption(spices)
  await expect(page).toHaveURL(`/urunler?kategori=${spices}`)
  await noOverflow(page)
})

test('mobil arama açılıp kapanır ve Escape odağı açma düğmesine döndürür', async ({ page }) => {
  test.skip((page.viewportSize()?.width || 1440) >= 1024, 'Mobil arama')
  await page.goto('/')
  const button = page.getByRole('button', { name: 'Aramayı aç', exact: true })
  const input = page.locator('header').getByRole('textbox', { name: 'Ürün ara', exact: true })
  await expect(input).not.toBeVisible()
  await button.click()
  await expect(input).toBeFocused()
  await button.click()
  await expect(input).not.toBeVisible()
  await button.click()
  await page.keyboard.press('Escape')
  await expect(button).toBeFocused()
  await expect(input).not.toBeVisible()
  await noOverflow(page)
})
