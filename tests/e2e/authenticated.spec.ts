import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'

type Role = 'customer' | 'dealer' | 'admin'
type Account = { email: string; password: string; userId: string }

const localUrl = 'http://127.0.0.1:54321'
const runtimeEnvPath = path.resolve(import.meta.dirname, '../../../supabase/.temp/start-secrets/supabase_edge_runtime_Efsane_Baharat/env/docker.env')
const runtimeValues = Object.fromEntries(
  readFileSync(runtimeEnvPath, 'utf8').split(/\r?\n/).filter((line) => line.includes('='))
    .map((line) => {
      const index = line.indexOf('=')
      return [line.slice(0, index), line.slice(index + 1)]
    }),
)
if (!runtimeValues.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Yerel service-role anahtarı bulunamadı')

const service = createClient(localUrl, runtimeValues.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const accounts = {} as Record<Role, Account>
const remoteRequests = new WeakMap<Page, string[]>()
let dealerCode = ''

async function createAccount(role: Role) {
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 16)
  const email = `e2e-${role}-${suffix}@example.test`
  const password = `E2e!${crypto.randomUUID()}`
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { ad: 'E2E', soyad: role, basvuru_tipi: role === 'dealer' ? 'bayi' : 'musteri' },
  })
  if (error || !data.user) throw new Error(`${role} yerel Auth kullanıcısı oluşturulamadı: ${error?.message}`)
  accounts[role] = { email, password, userId: data.user.id }
  return accounts[role]
}

async function assertSuccess(result: { error: { message: string } | null }, label: string) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
}

async function cleanup(serviceClient: SupabaseClient) {
  for (const account of Object.values(accounts)) {
    await serviceClient.from('bayiler').delete().eq('kullanici_id', account.userId)
    await serviceClient.from('admin_users').delete().eq('user_id', account.userId)
    await serviceClient.from('musteriler').delete().eq('user_id', account.userId)
    await serviceClient.auth.admin.deleteUser(account.userId)
  }
}

async function login(page: Page, role: Role) {
  const account = accounts[role]
  await page.goto('/giris', { waitUntil: 'domcontentloaded' })
  if (role === 'dealer') {
    await page.getByRole('button', { name: 'Bayi', exact: true }).click()
    await page.getByLabel('Bayii kodu *').fill(dealerCode)
  }
  await page.getByLabel('E-posta').fill(account.email)
  await page.getByLabel('Şifre').fill(account.password)
  await page.getByRole('button', { name: role === 'dealer' ? 'Bayi olarak giriş yap' : 'Giriş yap', exact: true }).click()
  await expect(page).toHaveURL(role === 'dealer' ? /\/bayi-dashboard$/ : /^http:\/\/127\.0\.0\.1:4173\/$/, { timeout: 20_000 })
}

async function assertNoBodyOverflow(page: Page) {
  const { width, scrollWidth } = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(scrollWidth, `Yatay taşma: ${scrollWidth}px > ${width}px`).toBeLessThanOrEqual(width)
}

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  await createAccount('customer')
  await createAccount('dealer')
  await createAccount('admin')

  await assertSuccess(await service.from('admin_users').insert({ user_id: accounts.admin.userId }), 'Admin rolü')
  dealerCode = `E2E${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`
  await assertSuccess(await service.from('bayiler').insert({
    bayii_kodu: dealerCode,
    bayi_adi: 'E2E Bayi',
    yetkili_kisi: 'E2E Yetkili',
    email: accounts.dealer.email,
    aktif: true,
  }), 'Bayi kaydı')
  await assertSuccess(await service.rpc('link_invited_dealer', {
    p_bayii_kodu: dealerCode,
    p_user_id: accounts.dealer.userId,
  }), 'Bayi bağlantısı')
})

test.afterAll(async () => {
  await cleanup(service)
})

test.beforeEach(async ({ page }) => {
  const remoteApiRequests: string[] = []
  remoteRequests.set(page, remoteApiRequests)
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (/^\/(rest|auth|functions|storage)\/v1\//.test(url.pathname) && (url.hostname !== '127.0.0.1' || url.port !== '54321')) {
      remoteApiRequests.push(url.origin)
    }
  })
})

test.afterEach(async ({ page }) => {
  expect(remoteRequests.get(page), 'Canlı Supabase isteği olmamalı').toEqual([])
})

test('müşteri hesabını açar ve yönetim ekranına erişemez', async ({ page }) => {
  await login(page, 'customer')
  await page.goto('/hesabim', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Hesabım', exact: true })).toBeVisible({ timeout: 20_000 })
  await assertNoBodyOverflow(page)
  await page.goto('/admin', { waitUntil: 'domcontentloaded' })
  await expect(page).not.toHaveURL(/\/admin(?:\/|$)/, { timeout: 20_000 })
})

test('bağlı bayi panelini açar ve yönetime erişemez', async ({ page }) => {
  await login(page, 'dealer')
  await expect(page.getByRole('heading', { name: 'E2E Bayi' })).toBeVisible({ timeout: 20_000 })
  await assertNoBodyOverflow(page)
  await page.goto('/bayi-panel', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'E2E Bayi' })).toBeVisible({ timeout: 20_000 })
  await assertNoBodyOverflow(page)
  await page.goto('/admin', { waitUntil: 'domcontentloaded' })
  await expect(page).not.toHaveURL(/\/admin(?:\/|$)/, { timeout: 20_000 })
})

test('yönetici panelini ve mobil menü klavyesini açar', async ({ page }) => {
  await login(page, 'admin')
  await page.goto('/admin', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Kontrol Paneli' })).toBeVisible({ timeout: 20_000 })
  await assertNoBodyOverflow(page)
  if ((page.viewportSize()?.width ?? 1440) < 1024) {
    const opener = page.getByRole('button', { name: 'Yönetim menüsünü aç' })
    await expect(opener).toHaveAttribute('aria-expanded', 'false')
    const productLink = page.locator('#admin-sidebar a[href="/admin/urunler"]')
    await expect(productLink).not.toBeVisible()
    await opener.click()
    await expect(opener).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('button', { name: 'Yönetim menüsünü kapat' })).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(page.getByRole('button', { name: 'Çıkış Yap' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(opener).toBeFocused()
    await expect(productLink).not.toBeVisible()
  }
  for (const [route, heading] of [
    ['/admin/siparisler', 'Sipariş Yönetimi'],
    ['/admin/urunler', 'Ürün Yönetimi'],
    ['/admin/bayiler', 'Bayi Yönetimi'],
  ]) {
    await page.goto(route, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible({ timeout: 20_000 })
    await assertNoBodyOverflow(page)
  }
  await expect(page.getByRole('region', { name: 'Bayi listesi, yatay kaydırılabilir' })).toHaveAttribute('tabindex', '0')
})
