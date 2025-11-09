# E-Ticaret Genişletme Sistemi - Kullanım Kılavuzu

## Genel Bakış
EfsaneBaharat.com için kapsamlı kampanya yönetimi ve satış artırma özellikleri başarıyla geliştirildi ve deploy edildi.

## Yeni Özellikler

### 1. Header Navigasyon Güncellemesi
**Konum**: Ana sayfa header (tüm sayfalarda görünür)

**Yeni Linkler**:
- "En Çok Satan Ürünler" - En popüler ürünleri gösterir
- "Kampanyalar" - Aktif kampanyaları listeler

**Responsive**: Mobil menüde de görünür

---

### 2. En Çok Satan Ürünler Sayfası
**URL**: `/en-cok-satan`

**Özellikler**:
- **Otomatik Sıralama**: Satış verilerine göre en çok satan 12 ürünü otomatik sıralar
- **Manuel Seçim (Önerilen)**: Admin panelinden seçilen ürünler öncelikli gösterilir
- **Toggle Buton**: Kullanıcı otomatik ve manuel görünüm arasında geçiş yapabilir
- **Ürün Kartları**: Görsel, fiyat, kategori ve marka bilgileriyle zengin kartlar
- **Responsive Grid**: 1-4 sütun arası otomatik ayarlama

**Algoritma**:
- Otomatik mod: `siparis_urunleri` tablosundan toplam satış miktarını hesaplar
- Manuel mod: `onerilen_urunler` tablosundan admin tarafından seçilen ürünleri gösterir

---

### 3. Kampanyalar Sayfası
**URL**: `/kampanyalar`

**Bileşenler**:

#### a) Banner Carousel
- Otomatik geçiş (5 saniye)
- Navigasyon noktaları (dots)
- Başlık, açıklama ve CTA butonu
- Tam genişlik responsive tasarım

#### b) Kampanya Listesi
- Grid layout (1-3 sütun)
- Kampanya kartları:
  - Görsel
  - Başlık ve açıklama
  - Tarih aralığı
  - Kampanya tipi badge (İndirim, Paket, Özel)
  - Durum göstergesi (Aktif/Yakında)

#### c) Bilgilendirme Bölümü
- Kampanyalardan nasıl yararlanılacağı hakkında açıklama

---

### 4. Admin Kampanya Yönetimi
**URL**: `/admin/kampanyalar`

**3 Sekme Yapısı**:

#### Tab 1: Kampanyalar
**CRUD İşlemleri**:
- ✅ Yeni kampanya oluştur
- ✅ Kampanya düzenle
- ✅ Kampanya sil

**Kampanya Formu Alanları**:
- Kampanya Başlığı (zorunlu)
- Açıklama
- Başlangıç Tarihi (zorunlu)
- Bitiş Tarihi (zorunlu)
- Kampanya Tipi (İndirim/Paket/Özel)
- Banner Görseli URL
- Aktif/Pasif durumu

**Görünüm**:
- Grid kartlar halinde liste
- Her kartta: Başlık, açıklama, tarih, durum, tip
- Hızlı düzenle/sil butonları

#### Tab 2: Bannerlar
**CRUD İşlemleri**:
- ✅ Yeni banner oluştur
- ✅ Banner düzenle
- ✅ Banner sil

**Banner Formu Alanları**:
- Kampanya seçimi (dropdown)
- Görsel URL (zorunlu)
- Başlık
- Açıklama
- Link URL (opsiyonel, ör: /kampanyalar veya /urun/...)
- Görüntüleme Sırası
- Aktif/Pasif durumu

**Görünüm**:
- Liste formatında
- Görsel önizleme
- Kampanya bağlantısı
- Sıra numarası

#### Tab 3: Önerilen Ürünler
**İşlemler**:
- ✅ Ürün ekle (manuel seçim)
- ✅ Ürün kaldır

**Önerilen Ürün Formu**:
- Ürün seçimi (dropdown - sadece aktif ürünler)
- Görüntüleme sırası

**Görünüm**:
- Tablo formatı
- Sıra | Ürün Adı | İşlemler
- Hızlı silme butonu

---

## Veritabanı Yapısı

### Yeni Tablolar

#### 1. `kampanyalar`
```sql
- id (UUID, PK)
- baslik (TEXT, NOT NULL)
- aciklama (TEXT)
- baslangic_tarihi (TIMESTAMP, NOT NULL)
- bitis_tarihi (TIMESTAMP, NOT NULL)
- aktif (BOOLEAN, DEFAULT true)
- banner_gorseli (TEXT)
- kampanya_tipi (TEXT, CHECK: 'indirim', 'paket', 'ozel')
- olusturma_tarihi (TIMESTAMP)
- guncelleme_tarihi (TIMESTAMP)
```

#### 2. `onerilen_urunler`
```sql
- id (UUID, PK)
- urun_id (UUID, NOT NULL)
- manuel_secim (BOOLEAN, DEFAULT false)
- goruntuleme_sirasi (INTEGER)
- olusturma_tarihi (TIMESTAMP)
```

#### 3. `kampanya_banner`
```sql
- id (UUID, PK)
- kampanya_id (UUID, NOT NULL)
- gorsel_url (TEXT, NOT NULL)
- baslik (TEXT)
- aciklama (TEXT)
- link_url (TEXT)
- goruntuleme_sirasi (INTEGER)
- aktif (BOOLEAN, DEFAULT true)
- olusturma_tarihi (TIMESTAMP)
```

#### 4. `paket_urunler`
```sql
- id (UUID, PK)
- kampanya_id (UUID, NOT NULL)
- urun_id (UUID, NOT NULL)
- miktar (INTEGER, DEFAULT 1)
- olusturma_tarihi (TIMESTAMP)
```

**RLS Politikaları**: Tüm tablolar için SELECT herkes, INSERT/UPDATE/DELETE sadece admin

---

## Kullanım Senaryoları

### Senaryo 1: Yeni Kampanya Oluşturma

1. Admin paneline giriş yapın: `/admin`
2. Sol menüden "Kampanyalar" sekmesine tıklayın
3. "Kampanyalar" tab'ında "Yeni Kampanya" butonuna tıklayın
4. Formu doldurun:
   - Başlık: "Ramazan Özel İndirim"
   - Açıklama: "%30 indirim tüm baharat çeşitlerinde"
   - Başlangıç: 2025-03-01
   - Bitiş: 2025-04-01
   - Tip: İndirim
   - Aktif: ✓
5. "Kaydet" butonuna tıklayın
6. Kampanya otomatik olarak `/kampanyalar` sayfasında görünür

### Senaryo 2: Kampanya Banner Ekleme

1. "Bannerlar" tab'ına geçin
2. "Yeni Banner" butonuna tıklayın
3. Formu doldurun:
   - Kampanya: "Ramazan Özel İndirim" seçin
   - Görsel URL: Banner görselinin URL'si
   - Başlık: "Ramazan'a Özel"
   - Açıklama: "Tüm Baharat Çeşitlerinde %30 İndirim"
   - Link: /kampanyalar (veya spesifik kampanya sayfası)
   - Sıra: 1
   - Aktif: ✓
4. "Kaydet" butonuna tıklayın
5. Banner otomatik olarak carousel'de görünür

### Senaryo 3: Önerilen Ürün Ekleme

1. "Önerilen Ürünler" tab'ına geçin
2. "Ürün Ekle" butonuna tıklayın
3. Dropdown'dan ürün seçin (ör: "Kırmızı Pul Biber 500gr")
4. Görüntüleme sırası girin (ör: 1)
5. "Ekle" butonuna tıklayın
6. Ürün otomatik olarak `/en-cok-satan` sayfasında "Önerilen" modunda görünür

---

## Teknik Detaylar

### Frontend
- **Framework**: React 18 + TypeScript
- **Routing**: React Router v6
- **Styling**: TailwindCSS
- **Icons**: Lucide React
- **State Management**: React Context + Hooks
- **Forms**: Controlled components

### Backend
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth
- **RLS**: Row Level Security aktif
- **Real-time**: Supabase Realtime (opsiyonel)

### Performans
- **Bundle Size**: ~897 KB (gzipped: ~162 KB)
- **Code Splitting**: Route bazlı lazy loading (önerilir)
- **Image Optimization**: URL bazlı görseller

---

## Test Rehberi

### Manuel Test Adımları

#### 1. Public Pages Test
```
✓ Ana sayfa → Header'da yeni linkleri görün
✓ "En Çok Satan Ürünler" → Otomatik/Önerilen toggle test
✓ "Kampanyalar" → Banner carousel ve kampanya listesi kontrol
✓ Responsive → Mobil görünüm test (375px, 768px, 1024px)
```

#### 2. Admin Panel Test
```
✓ /admin → Giriş yapın
✓ Kampanyalar sekmesi → Menüde göründüğünü kontrol
✓ Kampanya CRUD → Oluştur, Düzenle, Sil test
✓ Banner CRUD → Oluştur, Düzenle, Sil test
✓ Önerilen Ürün → Ekle, Kaldır test
```

#### 3. Database Test
```
✓ Supabase Dashboard → Tabloları görüntüle
✓ RLS Policies → Politikaların çalıştığını doğrula
✓ Data Integrity → İlişkili verileri kontrol
```

---

## Deployment Bilgileri

**Production URL**: https://fvtsqapsfkjl.space.minimax.io

**Build Komutu**: `pnpm run build`

**Deploy Durumu**: ✅ Başarılı

**Son Deploy Tarihi**: 2025-11-05

---

## Gelecek Geliştirme Önerileri

1. **Bundle Ürün Sistemi**: Paket kampanyalar için özel UI geliştir
2. **Kampanya Performans Raporları**: Dashboard'da satış istatistikleri
3. **Otomatik Kampanya Aktivasyonu**: Başlangıç/bitiş tarihine göre otomatik aktif/pasif
4. **Görsel Upload**: Supabase Storage ile doğrudan görsel yükleme
5. **Kampanya Kopyalama**: Mevcut kampanyayı şablon olarak kullan
6. **Kampanya Önizleme**: Yayınlamadan önce önizleme özelliği
7. **Banner A/B Testing**: Farklı banner performanslarını karşılaştır
8. **Email Bildirimleri**: Yeni kampanya duyurusu için email gönder

---

## Sorun Giderme

### Kampanyalar Görünmüyor
- Admin panelde kampanyanın "Aktif" olduğunu kontrol edin
- Başlangıç/bitiş tarihlerinin geçerli olduğunu kontrol edin
- Browser cache'i temizleyin (Ctrl+Shift+R)

### Banner Carousel Çalışmıyor
- Banner'ların "Aktif" durumda olduğunu kontrol edin
- En az 1 banner olmalı
- Console'da JavaScript hataları kontrol edin

### Önerilen Ürünler Boş
- Admin panelde manuel ürün seçimi yapın
- "Manuel Seçim" toggle'ının aktif olduğunu kontrol edin
- Seçilen ürünlerin "Aktif" durumda olduğunu doğrulayın

---

## İletişim ve Destek

Herhangi bir sorun veya soru için:
- Supabase Dashboard: https://app.supabase.com/project/uvagzvevktzzfrzkvtsd
- Proje Klasörü: `/workspace/efsanebaharat`
- Test Progress: `/workspace/efsanebaharat/kampanya-test-progress.md`
