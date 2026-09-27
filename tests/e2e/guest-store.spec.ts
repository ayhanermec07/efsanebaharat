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

test('logo ayarı yüklenirken yapay zeka simgesi görünmez', async ({ page }) => {
  let releaseSettings!: () => void
  const settingsGate = new Promise<void>((resolve) => { releaseSettings = resolve })
  await page.route('**/rest/v1/site_settings*', async (route) => {
    await settingsGate
    const response = await route.fetch()
    const rows = await response.json() as Array<{ setting_key: string; setting_value: unknown }>
    await route.fulfill({
      response,
      json: rows.map((row) => row.setting_key === 'logo'
        ? { ...row, setting_value: { url: '/icon.svg', width: 120 } }
        : row),
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
