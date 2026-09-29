import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'
import { getLocalSupabaseCredentials } from '../../scripts/local-supabase-credentials.mjs'

const { url, anonKey, serviceRoleKey } = getLocalSupabaseCredentials()
const service = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
const productId = '20000000-0000-4000-8000-000000000001'
const dealerStockId = crypto.randomUUID()
const accounts: Array<{ userId: string; email: string; password: string; customerId: string }> = []
const remoteRequests = new WeakMap<Page, string[]>()
let dealerCode = ''
let publicStockId = ''

function assertNoError(result: { error: { message: string } | null }, label: string) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
}

async function createAccount(kind: 'customer' | 'dealer') {
  const email = `transaction-${kind}-${crypto.randomUUID().slice(0, 8)}@example.test`
  const password = `E2e!${crypto.randomUUID()}`
  const { data, error } = await service.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { ad: 'İşlem', soyad: 'Testi', basvuru_tipi: kind === 'dealer' ? 'bayi' : 'musteri' },
  })
  if (error || !data.user) throw new Error(`Yerel ${kind} hesabı oluşturulamadı: ${error?.message}`)
  const { data: profile, error: profileError } = await service.from('musteriler').select('id').eq('user_id', data.user.id).single()
  if (profileError || !profile) throw new Error(`Yerel müşteri profili yok: ${profileError?.message}`)
  const account = { userId: data.user.id, email, password, customerId: profile.id as string }
  accounts.push(account)
  return account
}

async function signedInClient(account: (typeof accounts)[number]): Promise<SupabaseClient> {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await client.auth.signInWithPassword({ email: account.email, password: account.password })
  assertNoError({ error }, 'Yerel giriş')
  return client
}

async function loginInBrowser(page: Page, account: (typeof accounts)[number]) {
  await page.goto('/giris', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('E-posta').fill(account.email)
  await page.getByLabel('Şifre').fill(account.password)
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click()
  await expect(page).toHaveURL('http://127.0.0.1:4173/', { timeout: 20_000 })
}

test.describe.configure({ mode: 'serial' })

test.beforeEach(async ({ page }) => {
  const remote: string[] = []
  remoteRequests.set(page, remote)
  page.on('request', (request) => {
    const address = new URL(request.url())
    if (/^\/(rest|auth|functions|storage)\/v1\//.test(address.pathname)
      && (address.hostname !== '127.0.0.1' || address.port !== '54321')) remote.push(address.origin)
  })
})

test.afterEach(async ({ page }) => {
  expect(remoteRequests.get(page), 'Canlı Supabase isteği olmamalı').toEqual([])
})

test.beforeAll(async () => {
  const { data: stocks, error } = await service.from('urun_stoklari')
    .select('id').eq('urun_id', productId).eq('stok_grubu', 'hepsi').limit(1)
  assertNoError({ error }, 'Yerel ürün stoğu')
  if (!stocks?.length) throw new Error('Yerel seed ürünü yok; test:db:reset ile hazırlayın')
  publicStockId = stocks[0].id
  await createAccount('customer')
  const dealer = await createAccount('dealer')
  dealerCode = `TX${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`
  assertNoError(await service.from('bayiler').insert({
    bayii_kodu: dealerCode, bayi_adi: 'Yerel İşlem Bayisi', yetkili_kisi: 'Yerel Test',
    email: dealer.email, aktif: true,
  }), 'Yerel bayi')
  assertNoError(await service.rpc('link_invited_dealer', {
    p_bayii_kodu: dealerCode, p_user_id: dealer.userId,
  }), 'Bayi hesabı bağlantısı')
  assertNoError(await service.from('urun_stoklari').insert({
    id: dealerStockId, urun_id: productId, birim_turu: 'paket', birim_adedi: 100,
    birim_adedi_turu: 'gr', fiyat: 80, stok_miktari: 8, stok_birimi: 'adet',
    stok_grubu: 'bayi', aktif: true, aktif_durum: true,
  }), 'Yalnız yerel bayi stoğu')
})

test.afterAll(async () => {
  for (const account of accounts) {
    await service.from('sepet_items').delete().eq('musteri_id', account.customerId)
    await service.from('stok_rezervasyonlari').delete().eq('musteri_id', account.customerId)
  }
  await service.from('urun_stoklari').delete().eq('id', dealerStockId)
  for (const account of accounts) {
    await service.from('bayiler').delete().eq('kullanici_id', account.userId)
    await service.from('musteriler').delete().eq('user_id', account.userId)
    await service.auth.admin.deleteUser(account.userId)
  }
})

test('perakende müşteri ürün detayından sepete ekler, rezervasyon oluşturur ve siler', async ({ page }) => {
  const account = accounts[0]
  const { data: initialStock, error: stockError } = await service.from('urun_stoklari')
    .select('stok_miktari').eq('id', publicStockId).single()
  assertNoError({ error: stockError }, 'Başlangıç stoğu')
  await loginInBrowser(page, account)
  await page.goto(`/urun/${productId}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /TEST Karabiber Tane/ })).toBeVisible()
  await page.getByRole('button', { name: 'Sepete ekle', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sepete eklendi' })).toBeVisible({ timeout: 20_000 })
  const { data: cart, error: cartError } = await service.from('sepet_items')
    .select('stok_varyant_id,miktar').eq('musteri_id', account.customerId).eq('stok_varyant_id', publicStockId).single()
  assertNoError({ error: cartError }, 'Sepet satırı')
  expect(Number(cart?.miktar)).toBe(1)
  const { data: hold, error: holdError } = await service.from('stok_rezervasyonlari')
    .select('fiziksel_stok_id,fiziksel_miktar').eq('musteri_id', account.customerId).eq('stok_varyant_id', publicStockId).single()
  assertNoError({ error: holdError }, 'Fiziksel rezervasyon')
  expect(hold?.fiziksel_stok_id).toBe(publicStockId)
  expect(Number(hold?.fiziksel_miktar)).toBe(1)
  await page.goto('/sepet', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('TEST Karabiber Tane 100 GR').first()).toBeVisible()
  await page.getByRole('button', { name: 'Sepetten çıkar' }).click()
  await expect(page.getByRole('heading', { name: 'Sepetiniz boş' })).toBeVisible()
  const { data: remainingCart } = await service.from('sepet_items').select('id').eq('musteri_id', account.customerId)
  const { data: remainingHold } = await service.from('stok_rezervasyonlari').select('id').eq('musteri_id', account.customerId)
  const { data: finalStock } = await service.from('urun_stoklari').select('stok_miktari').eq('id', publicStockId).single()
  expect(remainingCart).toEqual([])
  expect(remainingHold).toEqual([])
  expect(finalStock?.stok_miktari).toBe(initialStock?.stok_miktari)
})

test('bayi stoğu perakendeye kapalıdır ve bayi pasifleştirilince yeni rezervasyon reddedilir', async () => {
  const customer = await signedInClient(accounts[0])
  const dealer = await signedInClient(accounts[1])
  const denied = await customer.rpc('add_cart_item', { p_stok_varyant_id: dealerStockId, p_miktar: 1 })
  expect(denied.error?.message).toMatch(/Selected stock variant is unavailable/)
  const allowed = await dealer.rpc('add_cart_item', { p_stok_varyant_id: dealerStockId, p_miktar: 1 })
  assertNoError(allowed, 'Aktif bayi rezervasyonu')
  expect(Number(allowed.data)).toBe(1)
  assertNoError(await service.from('bayiler').update({ aktif: false }).eq('kullanici_id', accounts[1].userId), 'Bayi pasifleştirme')
  const afterDeactivation = await dealer.rpc('add_cart_item', { p_stok_varyant_id: dealerStockId, p_miktar: 1 })
  expect(afterDeactivation.error?.message).toMatch(/Selected stock variant is unavailable/)
  const { data: cart } = await service.from('sepet_items').select('miktar').eq('musteri_id', accounts[1].customerId).eq('stok_varyant_id', dealerStockId).single()
  const { data: stock } = await service.from('urun_stoklari').select('stok_miktari').eq('id', dealerStockId).single()
  expect(Number(cart?.miktar)).toBe(1)
  expect(Number(stock?.stok_miktari)).toBe(8)
})
