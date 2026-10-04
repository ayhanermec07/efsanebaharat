import { expect, test, type Page } from '@playwright/test'
import { legalDocuments } from '../../src/lib/legal-documents'
import { businessInfo } from '../../src/lib/business-info'

const userId = '00000000-0000-4000-8000-000000000099'
async function customerSession(page: Page, type: string) {
  const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'customer@example.test', user_metadata: {}, app_metadata: {}, created_at: '2026-10-04T00:00:00Z' }
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: 4102444800 })).toString('base64url')}.fixture`
  await page.addInitScript(session => localStorage.setItem('sb-127-auth-token', JSON.stringify(session)), {
    access_token: token, refresh_token: 'fixture', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user,
  })
  await page.route('**/functions/v1/xml-musteri-siparis', route => route.fulfill({ json: { data: { id: userId, musteri_tipi: type, aktif_durum: true, isAdmin: false } } }))
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
}
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.origin === 'http://127.0.0.1:4176') return route.continue()
    if (url.origin !== 'http://127.0.0.1:54321') return route.abort()
    if (url.pathname === '/rest/v1/checkout_payment_settings') return route.fulfill({ json: { havale_enabled: true, paytr_enabled: false, bank_name: 'Test Bankası', account_name: 'Test Hesabı', iban: 'TR330006100519786457841326' } })
    if (url.pathname === '/rest/v1/sepet_items') return route.fulfill({ json: [{ stok_varyant_id: userId, urun_id: userId, birim_fiyat: 100, miktar: 1, birim_turu: 'adet', urunler: { urun_adi: 'Test Baharatı', ana_gorsel_url: null } }] })
    if (url.pathname.startsWith('/rest/v1/')) return route.fulfill({ json: [] })
    return route.abort()
  })
})

for (const document of legalDocuments) test(`${document.title}: satıcı, taslak, kapsam ve mobil görünüm`, async ({ page }, testInfo) => {
  await page.goto(document.path)
  const article = page.locator('article')
  await expect(article.getByRole('heading', { name: document.title, exact: true })).toBeVisible()
  await expect(article.getByTestId('seller-information')).toContainText(businessInfo.taxNumber)
  await expect(article.getByTestId('seller-information')).toContainText(businessInfo.sellerName)
  await expect(article.getByTestId('seller-information')).toContainText(businessInfo.returnAddress)
  await expect(article.getByTestId('seller-information').getByRole('link', { name: businessInfo.kep })).toHaveAttribute('href', `mailto:${businessInfo.kep}`)
  await expect(article.getByRole('note')).toContainText('taslağı')
  await expect(page.getByText('NEEDS INFORMATION', { exact: false })).toHaveCount(0)
  await expect(article.getByTestId('seller-information')).not.toContainText('Esnaf Sicil No')
  await expect(page.locator('footer').getByTestId('seller-information')).not.toContainText(businessInfo.taxNumber)
  await expect(article.getByTestId('consumer-scope')).toHaveCount(document.audience === 'b2c' ? 1 : 0)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow')
  await expect(page.locator('footer').getByTestId('seller-information')).toContainText(businessInfo.sellerName)
  await expect(page.locator('footer').getByRole('navigation', { name: 'Yasal ve ticari bilgiler' }).getByRole('link')).toHaveCount(7)
  await noOverflow(page)
  if (document.path === '/mesafeli-satis-sozlesmesi') await page.screenshot({ path: testInfo.outputPath('sozlesme.png'), fullPage: true })
})

test('iletişim KEP ve normal e-postayı ayırır; adres bağlantıları doğrudur', async ({ page }, testInfo) => {
  await page.goto('/bize-ulasin')
  const contact = page.getByRole('region', { name: 'İşletme ve iletişim bilgileri' })
  await expect(contact.getByRole('link', { name: businessInfo.phone })).toHaveAttribute('href', businessInfo.phoneHref)
  await expect(contact.getByRole('link', { name: businessInfo.kep })).toHaveAttribute('href', `mailto:${businessInfo.kep}`)
  await expect(contact).toContainText(businessInfo.taxNumber)
  await expect(contact).toContainText(businessInfo.address)
  await expect(contact).toContainText(businessInfo.union)
  for (const label of ['Vergi Dairesi', 'Esnaf Sicil No', 'Meslek kodu', 'Meslek başlangıcı', 'Esnaf sicil durumu', 'Meslek odası:', 'E-posta:', 'NEEDS INFORMATION', 'MERSİS', 'Ticaret sicil']) await expect(contact).not.toContainText(label)
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('iletisim.png'), fullPage: true })
})

for (const type of ['musteri', 'bayi', 'xml_musteri']) test(`${type}: tüketici bilgileri yalnız perakende checkout'ta`, async ({ page }) => {
  await customerSession(page, type)
  await page.goto('/sepet')
  await expect(page.getByRole('heading', { name: 'Sipariş özeti' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Havale / EFT', exact: true })).toBeChecked()
  await expect(page.getByRole('radio', { name: /PayTR/ })).toHaveCount(0)
  const info = page.getByTestId('consumer-checkout-information')
  await expect(info).toHaveCount(type === 'musteri' ? 1 : 0)
  if (type === 'musteri') {
    await expect(info).toContainText(businessInfo.sellerName)
    await expect(info).toContainText(businessInfo.taxNumber)
    await expect(info).not.toContainText('NEEDS INFORMATION')
    await expect(info.getByRole('link', { name: 'Ön Bilgilendirme Formu', exact: true })).toHaveAttribute('href', '/on-bilgilendirme')
    await expect(info.getByRole('checkbox')).toHaveCount(0)
  }
  await noOverflow(page)
})
