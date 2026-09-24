import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workspaceRoot = path.resolve(appRoot, '..')
const read = (relativePath) => fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')
const exists = (relativePath) => fs.existsSync(path.join(workspaceRoot, relativePath))

test('mağaza ve yönetim rotaları tanımlı', () => {
  const app = read('efsanebaharat/src/App.tsx')
  for (const route of ['/', '/urunler', '/urun/:id', '/sepet', '/giris', '/kayit', '/hesabim', '/xml-siparis', '/xml-siparislerim', '/admin']) {
    assert.match(app, new RegExp(`path="${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`))
  }
})

test('kritik Edge Function kaynakları mevcut', () => {
  for (const name of ['paytr-payment', 'paytr-callback', 'xml-musteri-siparis', 'bayi-xml-feed', 'siparis-xml-feed', 'image-storage-upload', 'public-catalog']) {
    assert.ok(exists(`supabase/functions/${name}/index.ts`), `${name} bulunamadı`)
  }
})

test('ödeme tutarı ve stok sunucuda tekrar hesaplanıyor', () => {
  const payment = read('supabase/functions/paytr-payment/index.ts')
  for (const marker of ['urun_stoklari', 'calculateCampaignDiscount', 'finalTotal', 'yeterli stok yok']) {
    assert.match(payment, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('XML siparişi kullanıcı ve XML müşteri yetkisi gerektiriyor', () => {
  const xmlOrder = read('supabase/functions/xml-musteri-siparis/index.ts')
  assert.match(xmlOrder, /requireUser/)
  assert.match(xmlOrder, /musteri_tipi !== 'xml_musteri'/)
  assert.match(xmlOrder, /requireAdmin/)
})

test('görsel ve sipariş fişi yüklemelerinde dosya sınırı/doğrulaması var', () => {
  const imageUpload = read('supabase/functions/image-storage-upload/index.ts')
  const xmlOrder = read('supabase/functions/xml-musteri-siparis/index.ts')
  assert.match(imageUpload, /MAX_IMAGE_BYTES/)
  assert.match(imageUpload, /ALLOWED_BUCKETS/)
  assert.match(imageUpload, /Dosya MIME tipi ile imza uyusmuyor/)
  assert.match(xmlOrder, /Fis dosyasinin turu dogrulanamadi/)
  assert.match(xmlOrder, /8 \* 1024 \* 1024/)
})

test('tarayıcı kaynak kodunda servis rolü anahtarı kullanılmıyor', () => {
  const sourceRoot = path.join(appRoot, 'src')
  const files = []
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name)
      if (entry.isDirectory()) walk(fullPath)
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(fullPath)
    }
  }
  walk(sourceRoot)
  for (const file of files) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /SUPABASE_SERVICE_ROLE|service_role/i, path.relative(appRoot, file))
  }
})
