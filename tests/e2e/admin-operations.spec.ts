import { createClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'
import { getLocalSupabaseCredentials } from '../../scripts/local-supabase-credentials.mjs'
import { mkdir } from 'node:fs/promises'

const { url, serviceRoleKey } = getLocalSupabaseCredentials()
const service = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
const prefix = `ADM${crypto.randomUUID().replaceAll('-', '').slice(0, 8)}`
const orderIds: string[] = []
const productIds: string[] = []
const listFixtures: Array<{ table: string; ids: string[] }> = []
let userId = '', customerId = '', categoryId = '', brandId = '', stockId = '', fixtureProductId = ''
const email = `${prefix.toLowerCase()}@example.test`
const password = `E2e!${crypto.randomUUID()}`
const remoteRequests = new WeakMap<Page, string[]>()

function ok(result: { error: { message: string } | null }, label: string) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
}
async function overflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 'Body yatay taşmamalı').toBeLessThanOrEqual(0)
}
async function order(suffix: string, receipt = true) {
  const id = crypto.randomUUID(), number = `${prefix}-${suffix}`
  orderIds.push(id)
  ok(await service.from('siparisler').insert({ id, siparis_no: number, musteri_id: customerId,
    toplam_tutar: 20, siparis_durumu: 'beklemede', odeme_durumu: receipt ? 'fis_kontrol_bekliyor' : 'odendi',
    stok_dusuldu: !receipt, siparis_fis_url: receipt ? `${customerId}/local-test.png` : null,
    adres: 'Yerel kabul adresi, İstanbul', telefon: '05550000000',
  }), 'Test siparişi')
  ok(await service.from('siparis_urunleri').insert({ siparis_id: id, urun_id: fixtureProductId,
    stok_varyant_id: stockId, birim_turu: 'adet', birim_adedi: 1, birim_adedi_turu: 'adet',
    miktar: 2, birim_fiyat: 10, toplam_fiyat: 20,
    stok_birimi_snapshot: 'adet', satis_birimi_snapshot: 'adet', stok_grubu_snapshot: 'hepsi',
  }), 'Test sipariş kalemi')
  return { id, number }
}
async function state(id: string) {
  const result = await service.from('siparisler').select('*').eq('id', id).single()
  ok(result, 'Kalıcı sipariş durumu')
  return result.data!
}
async function stock() {
  const result = await service.from('urun_stoklari').select('stok_miktari').eq('id', stockId).single()
  ok(result, 'Kalıcı stok')
  return Number(result.data!.stok_miktari)
}
async function findOrder(page: Page, number: string) {
  await page.goto('/admin/siparisler')
  await page.getByLabel('Sipariş no ara').fill(number)
  await page.getByRole('button', { name: 'Ara', exact: true }).click()
  await expect(page.getByLabel(`Siparis ${number} durumu`)).toBeVisible()
  await overflow(page)
}
async function transition(page: Page, item: { id: string; number: string }, status: string) {
  await findOrder(page, item.number)
  await page.getByLabel(`Siparis ${item.number} durumu`).selectOption(status)
  await expect.poll(async () => (await state(item.id)).siparis_durumu, { timeout: 20_000 }).toBe(status)
}

test.describe.configure({ mode: 'serial' })
test.beforeAll(async () => {
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true,
    user_metadata: { ad: 'Admin', soyad: prefix, basvuru_tipi: 'musteri' } })
  ok(created, 'Geçici Auth')
  userId = created.data.user!.id
  const profile = await service.from('musteriler').select('id').eq('user_id', userId).single()
  ok(profile, 'Profil'); customerId = profile.data!.id
  ok(await service.from('admin_users').insert({ user_id: userId }), 'Geçici admin rolü')
  const categories = await service.from('kategoriler').select('id').limit(1)
  ok(categories, 'Kategori'); categoryId = categories.data![0].id
  const brands = await service.from('markalar').select('id').limit(1)
  ok(brands, 'Marka'); brandId = brands.data![0].id
  fixtureProductId = crypto.randomUUID(); productIds.push(fixtureProductId)
  ok(await service.from('urunler').insert({ id: fixtureProductId, urun_adi: `${prefix} Sipariş ürünü`,
    kategori_id: categoryId, marka_id: brandId, aktif: true, aktif_durum: true }), 'Geçici ürün')
  stockId = crypto.randomUUID()
  ok(await service.from('urun_stoklari').insert({ id: stockId, urun_id: fixtureProductId,
    birim_turu: 'adet', birim_adedi: 1, birim_adedi_turu: 'adet', stok_birimi: 'adet',
    stok_miktari: 100, fiyat: 10, stok_grubu: 'hepsi', aktif: true, aktif_durum: true }), 'Geçici stok')
})
test.beforeEach(async ({ page }) => {
  const remote: string[] = []; remoteRequests.set(page, remote)
  await page.route('**/*', async route => {
    const address = new URL(route.request().url())
    if (['/functions/v1/kargo-bildirim', '/functions/v1/bayi-kullanici-olustur'].some(path => address.pathname.endsWith(path))) return route.abort('blockedbyclient')
    if (['http:', 'https:'].includes(address.protocol) && !['127.0.0.1', 'localhost'].includes(address.hostname)) {
      if (route.request().resourceType() !== 'image') remote.push(address.origin)
      return route.abort('blockedbyclient')
    }
    return route.continue()
  })
  page.on('dialog', dialog => dialog.accept())
  await page.goto('/giris')
  await page.getByLabel('E-posta').fill(email)
  await page.getByLabel('Şifre').fill(password)
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click()
  await expect(page).toHaveURL('http://127.0.0.1:4173/', { timeout: 20_000 })
})
test.afterEach(async ({ page }, testInfo) => {
  expect(remoteRequests.get(page), 'Harici API isteği yok').toEqual([])
  if (testInfo.status === 'passed' && ['360px', '390px', '768px', '1440px'].includes(testInfo.project.name)) {
    const kind = testInfo.title.startsWith('fiş onaylı') ? 'receipt-delivered'
      : testInfo.title.startsWith('ürün ve stok') ? 'product-inactive'
        : testInfo.title.startsWith('azalan stok') ? 'stock-management'
          : testInfo.title.startsWith('kargo kuyruğu') ? 'cargo-queue' : null
    if (kind) {
      await mkdir('../audit/2026-09-30/admin-screenshots', { recursive: true })
      await expect(page.locator('[role="status"]').filter({ visible: true })).toHaveCount(0, { timeout: 10_000 })
      await page.screenshot({ path: `../audit/2026-09-30/admin-screenshots/${testInfo.project.name}-${kind}.png`, fullPage: true })
    }
  }
})
test.afterAll(async () => {
  // Event tables intentionally restrict order deletion; remove owned evidence first.
  for (const table of ['siparis_finalization_stock_movements', 'siparis_finalization_events', 'siparis_shipping_events', 'siparis_status_events']) {
    if (orderIds.length) ok(await service.from(table).delete().in('siparis_id', orderIds), `${table} temizliği`)
  }
  if (orderIds.length) ok(await service.from('siparisler').delete().in('id', orderIds), 'Sipariş temizliği')
  const ownedProducts = await service.from('urunler').select('id').ilike('urun_adi', `${prefix}%`)
  ok(ownedProducts, 'UI ara hatada oluşan ürün kimlikleri')
  const ownedProductIds = [...new Set([...productIds, ...(ownedProducts.data || []).map(product => product.id)])]
  if (ownedProductIds.length) {
    ok(await service.from('urun_stoklari').delete().in('urun_id', ownedProductIds), 'Stok temizliği')
    ok(await service.from('urunler').delete().in('id', ownedProductIds), 'Ürün temizliği')
  }
  for (const fixture of listFixtures) ok(await service.from(fixture.table).delete().in('id', fixture.ids), `${fixture.table} liste temizliği`)
  // UI can persist a record before its following notification fails.
  for (const [table, field] of [['bayiler', 'bayi_adi'], ['kategoriler', 'kategori_adi'], ['markalar', 'marka_adi']]) {
    ok(await service.from(table).delete().ilike(field, `${prefix}%`), `${table} UI ara hata temizliği`)
  }
  if (userId) {
    ok(await service.from('admin_users').delete().eq('user_id', userId), 'Admin rol temizliği')
    ok(await service.from('musteriler').delete().eq('user_id', userId), 'Profil temizliği')
    ok(await service.auth.admin.deleteUser(userId), 'Auth temizliği')
  }
  for (const [table, field, pattern] of [['urunler', 'urun_adi', `${prefix}%`], ['siparisler', 'siparis_no', `${prefix}%`], ['bayiler', 'bayi_adi', `${prefix}%`], ['kategoriler', 'kategori_adi', `${prefix}%`], ['markalar', 'marka_adi', `${prefix}%`]]) {
    const remaining = await service.from(table).select('id').ilike(field, pattern)
    ok(remaining, `${table} temizliği doğrulaması`); expect(remaining.data, `${table} geçici kayıt kalmamalı`).toEqual([])
  }
  const profile = await service.from('musteriler').select('id').eq('user_id', userId)
  ok(profile, 'Profil temizliği doğrulaması'); expect(profile.data).toEqual([])
})

test('fiş onayı stoğu düşürür, iptal iade eder ve ret stoğu korur', async ({ page }) => {
  const before = await stock(), approved = await order('APPROVE')
  await transition(page, approved, 'hazirlaniyor')
  expect((await state(approved.id)).odeme_durumu).toBe('onaylandi')
  expect(await stock()).toBe(before - 2)
  const movement = await service.from('siparis_finalization_stock_movements').select('*').eq('siparis_id', approved.id).single()
  ok(movement, 'Stok hareketi'); expect(Number(movement.data!.miktar)).toBe(2)
  await transition(page, approved, 'iptal_edildi')
  expect(await stock()).toBe(before)
  const restored = await service.from('siparis_finalization_stock_movements').select('restored_at').eq('siparis_id', approved.id).single()
  ok(restored, 'İade hareketi'); expect(restored.data!.restored_at).toBeTruthy()
  const rejected = await order('REJECT')
  await transition(page, rejected, 'iptal_edildi')
  expect((await state(rejected.id)).odeme_durumu).toBe('reddedildi')
  expect(await stock()).toBe(before)
})

for (const receipt of [false, true]) {
  test(`${receipt ? 'fiş onaylı' : 'ödenmiş'} sipariş hazırlanır, kargolanır ve teslim edilir`, async ({ page }) => {
    const item = await order(receipt ? 'SHIP-RECEIPT' : 'SHIP-PAID', receipt)
    await transition(page, item, 'hazirlaniyor')
    await page.goto('/admin/kargo')
    const card = page.locator('div.border.rounded-lg').filter({ has: page.getByText(item.number, { exact: true }) })
    await card.getByRole('button', { name: 'Kargo Bilgisi Gir', exact: true }).click()
    await page.locator('select').last().selectOption('aras')
    await page.getByPlaceholder('Kargo takip numarasını girin').fill(`${prefix}TRACK`)
    await overflow(page)
    const shipmentResponse = page.waitForResponse(response => response.url().endsWith('/functions/v1/admin-order-shipment') && response.request().method() === 'POST')
    await page.getByRole('button', { name: 'Kaydet ve Email Gönder' }).click()
    const response = await shipmentResponse
    expect(response.ok(), await response.text()).toBe(true)
    await expect.poll(async () => (await state(item.id)).siparis_durumu, { timeout: 15_000 }).toBe('kargoda')
    expect((await state(item.id)).kargo_takip_no).toBe(`${prefix}TRACK`)
    await transition(page, item, 'teslim_edildi')
    expect((await state(item.id)).kargo_durumu).toBe('teslim_edildi')
    const shipping = await service.from('siparis_shipping_events').select('id').eq('siparis_id', item.id)
    ok(shipping, 'Kargo olay kaydı'); expect(shipping.data).toHaveLength(1)
    await page.goto('/admin/kargo')
    await expect(card.getByText('Teslim Edildi', { exact: true })).toBeVisible()
    await overflow(page)
  })
}

test('sipariş filtreleri, 25 satır sayfalama ve müşteri iletişim detayı', async ({ page }) => {
  for (let i = 0; i < 26; i++) await order(`PAGE-${String(i).padStart(2, '0')}`)
  await findOrder(page, `${prefix}-PAGE-25`)
  await page.getByRole('button', { name: 'Detay', exact: true }).click()
  await expect(page.getByText(`E-posta: ${email}`, { exact: true })).toBeVisible()
  await expect(page.getByText('Telefon: 05550000000')).toBeVisible()
  await expect(page.getByText('Teslimat adresi: Yerel kabul adresi, İstanbul')).toBeVisible()
  await overflow(page)
  await page.getByRole('button', { name: 'Sipariş detayını kapat' }).click()
  await page.getByLabel('Sipariş no ara').fill(`${prefix}-PAGE`)
  await page.getByRole('button', { name: 'Ara', exact: true }).click()
  await expect(page.getByText('26 sipariş · Sayfa 1 / 2')).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(25)
  await page.getByRole('button', { name: 'Sonraki', exact: true }).click()
  await expect(page.getByText('26 sipariş · Sayfa 2 / 2')).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await page.getByLabel('Durum', { exact: true }).selectOption('teslim_edildi')
  await expect(page.getByText('Bu ölçütlere uygun sipariş bulunmuyor')).toBeVisible()
  await page.getByLabel('Durum', { exact: true }).selectOption('beklemede')
  await page.getByLabel('Başlangıç').fill('2099-01-01')
  await expect(page.getByText('Bu ölçütlere uygun sipariş bulunmuyor')).toBeVisible()
  await overflow(page)
})

test('ürün ve stok eklenir, aynı stok kimliği düzenlenir ve ürün pasifleştirilir', async ({ page }) => {
  const name = `${prefix} Yönetim ürünü`
  await page.goto('/admin/urunler')
  await page.getByRole('button', { name: 'Yeni Ürün Ekle' }).click()
  let modal = page.getByRole('dialog')
  await modal.locator('input[type=text]').first().fill(name)
  await modal.locator('select').nth(0).selectOption(categoryId)
  await modal.locator('select').nth(1).selectOption(brandId)
  await page.getByLabel('1. seçenek birim adedi', { exact: true }).fill('1')
  await page.getByLabel('1. seçenek birim türü', { exact: true }).selectOption('adet')
  await page.getByLabel('1. seçenek fiyatı (TL)', { exact: true }).fill('12')
  await page.getByLabel('1. seçenek stok miktarı', { exact: true }).fill('30')
  await overflow(page)
  await modal.getByRole('button', { name: 'Kaydet', exact: true }).click()
  await expect(modal).not.toBeVisible()
  const result = await service.from('urunler').select('id').eq('urun_adi', name).single()
  ok(result, 'Eklenen ürün'); const id = result.data!.id; productIds.push(id)
  const first = await service.from('urun_stoklari').select('*').eq('urun_id', id).single()
  ok(first, 'Eklenen stok'); expect(Number(first.data!.stok_miktari)).toBe(30)
  await page.getByLabel('Ürün adına göre ara').fill(name)
  await page.getByRole('button', { name: 'Ara', exact: true }).click()
  await page.getByRole('button', { name: 'Düzenle', exact: true }).filter({ visible: true }).click()
  modal = page.getByRole('dialog')
  await page.getByLabel('1. seçenek stok miktarı', { exact: true }).fill('42')
  await page.getByLabel('1. seçenek fiyatı (TL)', { exact: true }).fill('14')
  await modal.getByRole('button', { name: 'Güncelle', exact: true }).click()
  await expect(modal).not.toBeVisible()
  const edited = await service.from('urun_stoklari').select('*').eq('urun_id', id).single()
  ok(edited, 'Düzenlenen stok'); expect(edited.data!.id).toBe(first.data!.id)
  expect(Number(edited.data!.stok_miktari)).toBe(42); expect(Number(edited.data!.fiyat)).toBe(14)
  await page.getByRole('button', { name: 'Pasifleştir', exact: true }).click()
  await expect.poll(async () => (await service.from('urunler').select('aktif_durum').eq('id', id).single()).data!.aktif_durum).toBe(false)
  expect((await service.from('urun_stoklari').select('id').eq('urun_id', id)).data).toHaveLength(1)
  await overflow(page)
})

test('kategori, marka, ürün ve bayi listelerinde arama, sayfalama ve boş sonuç', async ({ page }) => {
  const cases = [
    { table: 'kategoriler', field: 'kategori_adi', route: 'kategoriler', label: 'Kategori adı ara', noun: 'kategori' },
    { table: 'markalar', field: 'marka_adi', route: 'markalar', label: 'Marka adı ara', noun: 'marka' },
    { table: 'urunler', field: 'urun_adi', route: 'urunler', label: 'Ürün adına göre ara', noun: 'ürün' },
    { table: 'bayiler', field: 'bayi_adi', route: 'bayiler', label: 'Bayi adına göre ara', noun: 'bayi' },
  ]
  for (const item of cases) {
    const ids = Array.from({ length: 26 }, () => crypto.randomUUID())
    const term = `${prefix} LIST ${item.route}`
    listFixtures.push({ table: item.table, ids })
    ok(await service.from(item.table).insert(ids.map((id, index) => ({
      id, [item.field]: `${term} ${String(index).padStart(2, '0')}`,
      ...(item.table === 'bayiler' ? { bayii_kodu: `${prefix}L${index}`, yetkili_kisi: 'Yerel Test', email: `${prefix.toLowerCase()}-list-${index}@example.test`, aktif: true } : { aktif_durum: true }),
      ...(item.table === 'urunler' ? { kategori_id: categoryId, marka_id: brandId } : {}),
    }))), `${item.table} liste örnekleri`)
    await page.goto(`/admin/${item.route}`)
    await page.getByLabel(item.label).fill(term)
    await page.getByRole('button', { name: 'Ara', exact: true }).click()
    await expect(page.getByText(`26 ${item.noun} · Sayfa 1 / 2`, { exact: true })).toBeVisible()
    await overflow(page)
    await page.getByRole('button', { name: 'Sonraki', exact: true }).click()
    await expect(page.getByText(`26 ${item.noun} · Sayfa 2 / 2`, { exact: true })).toBeVisible()
    await page.getByLabel(item.label).fill(`${term} absent`)
    await page.getByRole('button', { name: 'Ara', exact: true }).click()
    await expect(page.getByText(/Aramayla eşleşen .* bulun(?:muyor|amadı)/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sonraki', exact: true })).not.toBeVisible()
    await overflow(page)
  }
})

test('azalan stok ekranı ekler, düzenler, kaldırır ve son stok seçeneğini korur', async ({ page }) => {
  const id = crypto.randomUUID(); productIds.push(id)
  ok(await service.from('urunler').insert({ id, urun_adi: `${prefix} Azalan stok`, kategori_id: categoryId, marka_id: brandId, aktif_durum: true }), 'Azalan stok ürünü')
  const originalId = crypto.randomUUID()
  ok(await service.from('urun_stoklari').insert({ id: originalId, urun_id: id,
    birim_turu: 'adet', birim_adedi: 1, stok_birimi: 'adet', stok_miktari: 2, fiyat: 10,
    stok_grubu: 'hepsi', aktif_durum: true }), 'Azalan stok örneği')
  await page.goto('/admin/stok-azalan')
  const row = page.locator('tbody tr').filter({ hasText: `${prefix} Azalan stok` })
  await row.getByRole('button', { name: 'Stok Ekle →' }).click()
  await page.getByRole('button', { name: 'Yeni Stok', exact: true }).click()
  let form = page.locator('form').last()
  await form.locator('select').first().selectOption('adet')
  await form.locator('input[type=number]').nth(0).fill('1')
  await form.locator('input[type=number]').nth(1).fill('33')
  await form.locator('input[type=number]').nth(2).fill('7')
  await overflow(page)
  await form.getByRole('button', { name: 'Kaydet', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Stok formunu kapat' })).not.toBeVisible()
  const added = await service.from('urun_stoklari').select('*').eq('urun_id', id).neq('id', originalId).single()
  ok(added, 'Yeni stok'); expect(Number(added.data!.stok_miktari)).toBe(7)
  const stockRows = page.locator('table').last().locator('tbody > tr')
  await expect(stockRows).toHaveCount(2)
  const addedRow = stockRows.filter({ has: page.getByText('33.00 ₺', { exact: true }) })
  await addedRow.getByRole('button').nth(0).click()
  form = page.locator('form').last()
  await form.locator('input[type=number]').nth(2).fill('9')
  await form.getByRole('button', { name: 'Güncelle', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Stok formunu kapat' })).not.toBeVisible()
  const edited = await service.from('urun_stoklari').select('*').eq('id', added.data!.id).single()
  ok(edited, 'Stok düzenleme'); expect(Number(edited.data!.stok_miktari)).toBe(9)
  await addedRow.getByRole('button').nth(1).click()
  await expect.poll(async () => (await service.from('urun_stoklari').select('id').eq('urun_id', id)).data?.length).toBe(1)
  await expect(stockRows).toHaveCount(1)
  const remainingRow = stockRows.first()
  await remainingRow.getByRole('button').nth(1).click()
  await expect(page.getByRole('status').filter({ hasText: /son stok|en az bir stok/i }).first()).toBeVisible()
  expect((await service.from('urun_stoklari').select('id').eq('urun_id', id)).data).toEqual([{ id: originalId }])
  await overflow(page)
})

test('kategori ve marka oluşturulur düzenlenir silinir; bayi eklenir ve aktifliği düzenlenir', async ({ page }) => {
  test.setTimeout(90_000)
  for (const item of [
    { table: 'kategoriler', field: 'kategori_adi', route: 'kategoriler', label: 'Kategori adı ara', newButton: 'Yeni Kategori Ekle' },
    { table: 'markalar', field: 'marka_adi', route: 'markalar', label: 'Marka adı ara', newButton: 'Yeni Marka Ekle' },
  ]) {
    const name = `${prefix} CRUD ${item.route}`
    await page.goto(`/admin/${item.route}`)
    await page.getByRole('button', { name: item.newButton, exact: true }).click()
    await page.locator('form').last().locator('input[type=text]').first().fill(name)
    await page.locator('form').last().getByRole('button', { name: 'Kaydet', exact: true }).click()
    await expect(item.route === 'kategoriler' ? page.getByRole('dialog') : page.getByRole('button', { name: 'Marka penceresini kapat', exact: true })).not.toBeVisible()
    await expect.poll(async () => (await service.from(item.table).select('id').eq(item.field, name)).data?.length).toBe(1)
    const created = await service.from(item.table).select('id').eq(item.field, name).single()
    ok(created, `${item.table} UI ekleme`)
    const id = created.data!.id; listFixtures.push({ table: item.table, ids: [id] })
    await page.getByLabel(item.label).fill(name)
    await page.getByRole('button', { name: 'Ara', exact: true }).click()
    await page.getByRole('button', { name: 'Düzenle', exact: true }).filter({ visible: true }).click()
    await page.locator('form').last().locator('input[type=text]').first().fill(`${name} Updated`)
    await overflow(page)
    await page.locator('form').last().getByRole('button', { name: 'Güncelle', exact: true }).click()
    await expect(item.route === 'kategoriler' ? page.getByRole('dialog') : page.getByRole('button', { name: 'Marka penceresini kapat', exact: true })).not.toBeVisible()
    await expect.poll(async () => (await service.from(item.table).select(item.field).eq('id', id).single()).data?.[item.field]).toBe(`${name} Updated`)
    const edited = await service.from(item.table).select('*').eq('id', id).single()
    ok(edited, `${item.table} UI düzenleme`); expect(edited.data![item.field]).toBe(`${name} Updated`)
    await page.getByRole('button', { name: 'Sil', exact: true }).filter({ visible: true }).click()
    await expect.poll(async () => (await service.from(item.table).select('id').eq('id', id)).data?.length).toBe(0)
  }
  const name = `${prefix} CRUD Bayi`
  await page.goto('/admin/bayiler')
  await page.getByRole('button', { name: 'Yeni Bayi Ekle', exact: true }).click()
  await page.getByPlaceholder('BAY123456').fill(`${prefix}CRUD`)
  await page.getByPlaceholder('ABC Gıda Ltd. Şti.').fill(name)
  await page.getByPlaceholder('Ahmet Yılmaz').fill('Yerel Yetkili')
  await page.getByPlaceholder('info@abcgida.com').fill(`${prefix.toLowerCase()}-crud@example.test`)
  await overflow(page)
  await page.locator('form').last().getByRole('button', { name: 'Bayi Oluştur', exact: true }).click()
  await expect(page.getByPlaceholder('BAY123456')).not.toBeVisible()
  const created = await service.from('bayiler').select('id').eq('bayi_adi', name).single()
  ok(created, 'Bayi UI ekleme'); const id = created.data!.id; listFixtures.push({ table: 'bayiler', ids: [id] })
  await page.getByLabel('Bayi adına göre ara').fill(name)
  await page.getByRole('button', { name: 'Ara', exact: true }).click()
  await page.getByRole('button', { name: `${name} bayisini düzenle`, exact: true }).click()
  await page.getByPlaceholder('ABC Gıda Ltd. Şti.').fill(`${name} Updated`)
  await page.getByLabel('Bayi aktif').uncheck()
  await page.locator('form').last().getByRole('button', { name: 'Güncelle', exact: true }).click()
  await expect(page.getByPlaceholder('BAY123456')).not.toBeVisible()
  const edited = await service.from('bayiler').select('*').eq('id', id).single()
  ok(edited, 'Bayi UI düzenleme'); expect(edited.data!.bayi_adi).toBe(`${name} Updated`)
  expect(edited.data!.aktif).toBe(false); expect(edited.data!.bayii_kodu).toBe(`${prefix}CRUD`.toUpperCase())
  await page.getByRole('button', { name: `${name} Updated bayisini düzenle`, exact: true }).click()
  await page.getByLabel('Bayi aktif').check()
  await page.locator('form').last().getByRole('button', { name: 'Güncelle', exact: true }).click()
  await expect(page.getByPlaceholder('BAY123456')).not.toBeVisible()
  expect((await service.from('bayiler').select('aktif').eq('id', id).single()).data!.aktif).toBe(true)
  await overflow(page)
})

test('yönetim listeleri gerçek okuma hatasını gösterir ve tekrar denemede yerel veriyi yükler', async ({ page }) => {
  test.setTimeout(90_000)
  await order('RETRY')
  const dealerId = crypto.randomUUID()
  listFixtures.push({ table: 'bayiler', ids: [dealerId] })
  ok(await service.from('bayiler').insert({ id: dealerId, bayii_kodu: `${prefix}RETRY`,
    bayi_adi: `${prefix} Retry Bayi`, yetkili_kisi: 'Yerel Test', email: `${prefix.toLowerCase()}-retry@example.test`, aktif: true }), 'Yeniden deneme bayi örneği')
  for (const [table, message] of [
    ['siparisler', 'Siparişler yüklenemedi.'], ['urunler', 'Ürünler yüklenemedi.'],
    ['bayiler', 'Bayiler yüklenemedi.'], ['kategoriler', 'Kategoriler yüklenemedi.'], ['markalar', 'Markalar yüklenemedi.'],
  ]) {
    const pattern = `**/rest/v1/${table}?*`
    await page.route(pattern, route => route.abort('failed'))
    await page.goto(`/admin/${table}`)
    const error = page.getByText(message, { exact: false })
    await expect(error).toBeVisible({ timeout: 15_000 })
    const heading = page.getByRole('heading', { level: 1 }).filter({ visible: true }).last()
    await expect(heading).toBeVisible()
    if ((page.viewportSize()?.width ?? 1440) < 1024) {
      expect((await heading.boundingBox())!.y, 'Sabit başlık sayfa başlığını ve işlemlerini kapatmamalı').toBeGreaterThanOrEqual(64)
    }
    await overflow(page)
    await page.unroute(pattern)
    const retry = page.waitForResponse(response => response.url().includes(`/rest/v1/${table}?`) && response.request().method() === 'GET' && response.ok())
    await page.getByRole('button', { name: 'Tekrar dene', exact: true }).click()
    const response = await retry
    const records = await response.json()
    expect(Array.isArray(records)).toBe(true); expect(records.length).toBeGreaterThan(0)
    await expect(error).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Tekrar dene', exact: true })).not.toBeVisible()
    await overflow(page)
  }
})

test('kargo kuyruğu bekleyen reddedilen iptal kayıtlarını dışlar ve geçmişte yeni kargo işlemi açmaz', async ({ page }) => {
  test.setTimeout(90_000)
  const pending = await order('QUEUE-PENDING')
  const cancelled = await order('QUEUE-CANCEL')
  await transition(page, cancelled, 'hazirlaniyor')
  await transition(page, cancelled, 'iptal_edildi')
  const rejected = await order('QUEUE-REJECT')
  await transition(page, rejected, 'iptal_edildi')
  const ready = await order('QUEUE-READY')
  await transition(page, ready, 'hazirlaniyor')
  expect((await state(ready.id)).stok_dusuldu).toBe(true)
  const history: string[] = []
  for (const status of ['kargoda', 'teslim_edildi']) {
    const id = crypto.randomUUID(), number = `${prefix}-QUEUE-LEGACY-${status}`
    orderIds.push(id); history.push(number)
    ok(await service.from('siparisler').insert({ id, siparis_no: number, musteri_id: customerId,
      toplam_tutar: 0, odeme_durumu: 'odendi', stok_dusuldu: true, siparis_durumu: status,
      kargo_durumu: status }), 'Takip bilgisi bulunmayan sentetik kargo geçmişi')
  }
  await page.goto('/admin/kargo')
  const readyCard = page.locator('div.border.rounded-lg').filter({ has: page.getByText(ready.number, { exact: true }) })
  await expect(readyCard.getByRole('button', { name: 'Kargo Bilgisi Gir', exact: true })).toBeEnabled()
  for (const item of [pending, cancelled, rejected]) await expect(page.getByText(item.number, { exact: true })).not.toBeVisible()
  for (const number of history) {
    const card = page.locator('div.border.rounded-lg').filter({ has: page.getByText(number, { exact: true }) })
    await expect(card).toBeVisible()
    await expect(card.getByRole('button', { name: /Kargo Bilgisi Gir|Güncelle/ })).toHaveCount(0)
  }
  expect((await state(pending.id)).stok_dusuldu).toBe(false)
  expect((await state(cancelled.id)).siparis_durumu).toBe('iptal_edildi')
  expect((await state(rejected.id)).odeme_durumu).toBe('reddedildi')
  await overflow(page)
})
