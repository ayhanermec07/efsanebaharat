import { expect, test, type Page } from '@playwright/test'

const remoteRequests = new WeakMap<Page, string[]>()

async function expectNoHorizontalOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(sizes.content, `Yatay taşma: ${sizes.content}px > ${sizes.viewport}px`).toBeLessThanOrEqual(sizes.viewport)
}

test.beforeEach(async ({ page }) => {
  const remoteSupabaseRequests: string[] = []
  remoteRequests.set(page, remoteSupabaseRequests)
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (/^\/(rest|auth|functions|storage)\/v1\//.test(url.pathname) && (url.hostname !== '127.0.0.1' || url.port !== '54321')) {
      remoteSupabaseRequests.push(url.origin)
    }
  })
})

test.afterEach(async ({ page }) => {
  expect(remoteRequests.get(page), 'Canlı Supabase isteği olmamalı').toEqual([])
})

test('ziyaretçi katalogdan ürün detayına geçer', async ({ page }) => {
  await page.goto('/urunler', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Ürünler', exact: true })).toBeVisible()
  const product = page.locator('article a[href^="/urun/"]').first()
  await expect(product).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await product.click()
  await expect(page).toHaveURL(/\/urun\/[0-9a-f-]+$/i)
  await expect(page.locator('h1')).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('ziyaretçi boş sepeti ve alışveriş bağlantısını görür', async ({ page }) => {
  await page.goto('/sepet', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Sepetiniz boş' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Alışverişe başla' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('ziyaretçi giriş ve iletişim sayfalarına ulaşır', async ({ page }) => {
  await page.goto('/giris', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /giriş/i }).first()).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await page.goto('/bize-ulasin', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /bize ulaşın/i }).first()).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('Anadolu Aktarı teması, görünür arama ve mobil menü klavyesi birlikte çalışır', async ({ page }) => {
  test.setTimeout(90_000)
  await page.route('**/rest/v1/kampanyalar*', (route) => route.fulfill({ json: [] }))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Sofranın sırrı, bir tutam baharat.' })).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('header input[aria-label="Ürün ara"]')).toBeVisible()
  await expect.poll(() => page.locator('header .font-display').evaluate(element => getComputedStyle(element).fontFamily)).toContain('Source Serif 4')
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--site-primary-color').trim())).toBe('#34513c')
  await expectNoHorizontalOverflow(page)

  if ((page.viewportSize()?.width ?? 1440) < 1024) {
    const opener = page.getByRole('button', { name: 'Menüyü aç', exact: true })
    await opener.click()
    const menu = page.getByRole('dialog', { name: 'Mobil menü', exact: true })
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('button', { name: 'Menüyü kapat', exact: true })).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(menu.getByRole('link', { name: 'Giriş Yap', exact: true })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(menu).not.toBeVisible()
    await expect(opener).toBeFocused()
  }

  await page.locator('header input[aria-label="Ürün ara"]').fill('Baharat')
  await page.locator('header input[aria-label="Ürün ara"]').press('Enter')
  await expect(page).toHaveURL(/\/urunler\?q=Baharat$/)
  await expectNoHorizontalOverflow(page)
})

test('logo ayarı yüklenirken yapay zeka simgesi görünmez', async ({ page }) => {
  let releaseSettings!: () => void
  const settingsGate = new Promise<void>((resolve) => { releaseSettings = resolve })
  await page.route('**/rest/v1/site_settings*', async (route) => {
    await settingsGate
    await route.fulfill({
      json: [{ setting_key: 'logo', setting_value: { url: '/icon.svg', width: 120 } }],
    })
  })

  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('header')).toBeVisible()
    await expect(page.locator('header svg.lucide-sparkles')).toHaveCount(0)
    await expectNoHorizontalOverflow(page)
  } finally {
    releaseSettings()
  }
  await expect(page.locator('header img[src="/icon.svg"]')).toBeVisible()
})


test('bütün açık sayfalar dar ekranlarda taşmadan açılır', async ({ page }) => {
  test.setTimeout(90_000)
  for (const route of ['/kayit', '/sifre-sifirla', '/sifre-yenile', '/kampanyalar', '/en-cok-satan', '/odeme-basarili', '/odeme-basarisiz', '/bulunamayan-sayfa']) {
    await page.goto(route, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main h1, main h2').first()).toBeVisible()
    await expectNoHorizontalOverflow(page)
  }
})
