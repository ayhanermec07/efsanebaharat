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
].map(category => ({ ...category, aktif_durum: true, aciklama: '', gorsel_url: null }))

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

test('menü alt kategorileri açar ve üçüncü seviye bağlantıyı korur', async ({ page }, testInfo) => {
  await page.goto('/urunler')
  const mobile = (page.viewportSize()?.width || 1440) < 1024
  if (mobile) await page.getByRole('button', { name: 'Menüyü aç', exact: true }).click()
  else await page.getByRole('button', { name: 'Kategoriler', exact: true }).click()
  const menu = mobile ? page.getByRole('dialog', { name: 'Mobil menü' }) : page.locator('header')
  await menu.locator('summary').filter({ hasText: /^Baharatlar$/ }).click()
  await menu.locator('summary').filter({ hasText: /^Toz Baharatlar$/ }).click()
  await expect(menu.getByRole('link', { name: 'Kırmızı Biber', exact: true })).toBeVisible()
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('kategori-menusu.png') })
  await menu.getByRole('link', { name: 'Kırmızı Biber', exact: true }).click()
  await expect(page).toHaveURL(`/urunler?kategori=${red}`)
  if (mobile) await expect(page.getByRole('dialog', { name: 'Mobil menü' })).not.toBeVisible()
})

test('alt kategori URLsi ana seçimi belirler; ana değişince alt seçim sıfırlanır', async ({ page }, testInfo) => {
  await page.goto(`/urunler?kategori=${red}&marka=${id(90)}&sirala=ad`)
  if ((page.viewportSize()?.width || 1440) < 1024) await page.getByRole('button', { name: 'Filtreler', exact: true }).click()
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
  if ((page.viewportSize()?.width || 1440) < 1024) await page.getByRole('button', { name: 'Filtreler', exact: true }).click()
  await expect(page.getByLabel('Ana kategori', { exact: true })).toHaveValue(spices)
  await expect(page.getByLabel('Alt kategori', { exact: true })).toHaveValue(red)
  await noOverflow(page)
})
