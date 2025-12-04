# Sepet Sistemi Güncelleme - Kullanıcı Bazlı Sepet

## ✅ Tamamlanan Değişiklikler

### 1. Veritabanı Yapısı

**Yeni Tablo: `sepet_items`**
- Kullanıcı bazlı sepet saklama
- Her kullanıcının sepeti ayrı ayrı
- RLS (Row Level Security) ile güvenlik

```sql
CREATE TABLE sepet_items (
  id UUID PRIMARY KEY,
  musteri_id UUID REFERENCES musteriler(id),
  urun_id UUID REFERENCES urunler(id),
  birim_turu TEXT,
  birim_adedi NUMERIC,
  birim_adedi_turu TEXT,
  miktar NUMERIC,
  birim_fiyat NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(musteri_id, urun_id, birim_turu)
);
```

### 2. SepetContext Güncellemeleri

**Önceki Sistem:**
- ❌ Tüm kullanıcılar için tek localStorage
- ❌ Profil değiştiğinde sepet karışıyor
- ❌ Sepet kaybolabiliyor

**Yeni Sistem:**
- ✅ Giriş yapan kullanıcılar için veritabanı
- ✅ Misafir kullanıcılar için localStorage (sepet_guest)
- ✅ Profil değiştiğinde otomatik sepet yükleme
- ✅ Giriş yapınca misafir sepeti veritabanına aktarma

### 3. Özellikler

#### Giriş Yapan Kullanıcılar
- ✅ Sepet veritabanında saklanır
- ✅ Farklı cihazlardan erişilebilir
- ✅ Profil değiştiğinde sepet değişir
- ✅ Sipariş tamamlanınca sepet temizlenir
- ✅ "Sepeti Temizle" ile manuel temizleme

#### Misafir Kullanıcılar
- ✅ Sepet localStorage'da saklanır (sepet_guest)
- ✅ Giriş yapınca sepet veritabanına aktarılır
- ✅ Otomatik migration

## 🔄 Çalışma Mantığı

### Senaryo 1: Misafir Kullanıcı
1. Misafir ürün ekler → localStorage'a kaydedilir
2. Giriş yapar → localStorage sepeti veritabanına aktarılır
3. localStorage temizlenir

### Senaryo 2: Giriş Yapan Kullanıcı
1. Kullanıcı A giriş yapar → Sepeti veritabanından yüklenir
2. Ürün ekler → Veritabanına kaydedilir
3. Çıkış yapar → Sepet veritabanında kalır
4. Kullanıcı B giriş yapar → Kendi sepeti yüklenir (A'nın sepeti görünmez)

### Senaryo 3: Sipariş Tamamlama
1. Kullanıcı sepeti doldurur
2. Ödeme yapar
3. Sipariş tamamlanır
4. Sepet otomatik temizlenir (veritabanından silinir)

### Senaryo 4: Manuel Temizleme
1. Kullanıcı "Sepeti Temizle" butonuna tıklar
2. Sepet veritabanından silinir
3. Sayfa yenilenir

## 🔒 Güvenlik

### RLS Politikaları
- Kullanıcılar sadece kendi sepetlerini görebilir
- Başkasının sepetine erişemez
- Veritabanı seviyesinde güvenlik

```sql
-- Örnek RLS Policy
CREATE POLICY "Kullanıcılar kendi sepetlerini görebilir"
ON sepet_items FOR SELECT
USING (
  musteri_id IN (
    SELECT id FROM musteriler WHERE user_id = auth.uid()
  )
);
```

## 📊 Veri Akışı

```
┌─────────────────┐
│  Misafir User   │
│  localStorage   │
└────────┬────────┘
         │ Giriş Yap
         ▼
┌─────────────────┐
│  Auth Context   │
│  user, musteri  │
└────────┬────────┘
         │ Load Cart
         ▼
┌─────────────────┐
│ Sepet Context   │
│  loadCart()     │
└────────┬────────┘
         │
         ├─► Giriş Yapan: DB'den yükle
         └─► Misafir: localStorage'dan yükle
```

## 🧪 Test Senaryoları

### Test 1: Profil Değiştirme
1. ✅ Kullanıcı A ile giriş yap
2. ✅ Sepete ürün ekle
3. ✅ Çıkış yap
4. ✅ Kullanıcı B ile giriş yap
5. ✅ Sepet boş olmalı
6. ✅ Kullanıcı A ile tekrar giriş yap
7. ✅ Önceki sepet görünmeli

### Test 2: Misafir → Giriş
1. ✅ Misafir olarak ürün ekle
2. ✅ Giriş yap
3. ✅ Sepet korunmalı
4. ✅ Veritabanında görünmeli

### Test 3: Sipariş Tamamlama
1. ✅ Sepete ürün ekle
2. ✅ Sipariş ver
3. ✅ Ödeme tamamla
4. ✅ Sepet temizlenmeli

### Test 4: Manuel Temizleme
1. ✅ Sepete ürün ekle
2. ✅ "Sepeti Temizle" tıkla
3. ✅ Sepet boşalmalı
4. ✅ Veritabanından silinmeli

## 🚀 Kurulum

### 1. Migration Çalıştır
```bash
# Supabase SQL Editor'de çalıştır
create_sepet_items.sql
```

### 2. Kod Güncellemeleri
- ✅ SepetContext.tsx güncellendi
- ✅ OdemeBasarili.tsx zaten sepeti temizliyor
- ✅ Sepet.tsx değişiklik gerektirmiyor

### 3. Test Et
- Farklı kullanıcılarla giriş yap
- Sepet işlemlerini test et
- Profil değiştirmeyi test et

## 📝 Önemli Notlar

### Breaking Changes
- ⚠️ Mevcut localStorage sepetleri kaybolacak
- ⚠️ Kullanıcılar yeniden ürün eklemeli
- ⚠️ Misafir sepetleri `sepet_guest` key'i kullanıyor

### Migration Stratejisi
1. Eski `sepet` key'i koru (opsiyonel)
2. Yeni `sepet_guest` key'i kullan
3. Giriş yapınca otomatik aktar

### Performans
- ✅ Veritabanı sorguları optimize edildi
- ✅ Index'ler eklendi
- ✅ RLS politikaları verimli

## 🐛 Sorun Giderme

### Sepet Yüklenmiyor
1. Kullanıcı giriş yapmış mı kontrol et
2. musteriData var mı kontrol et
3. Browser console'da hata var mı bak
4. Supabase RLS politikalarını kontrol et

### Sepet Karışıyor
1. RLS politikalarının aktif olduğunu kontrol et
2. musteri_id'nin doğru olduğunu kontrol et
3. Veritabanında UNIQUE constraint'i kontrol et

### Misafir Sepeti Aktarılmıyor
1. localStorage'da `sepet_guest` var mı kontrol et
2. Giriş sonrası loadCart çağrılıyor mu kontrol et
3. Console'da hata var mı bak

## ✨ Gelecek İyileştirmeler

- [ ] Sepet senkronizasyonu (real-time)
- [ ] Sepet geçmişi
- [ ] Favori ürünler
- [ ] Sepet paylaşma
- [ ] Sepet analitikleri
- [ ] Otomatik sepet temizleme (eski sepetler)

## 🎉 Sonuç

Sepet sistemi başarıyla kullanıcı bazlı hale getirildi!

- ✅ Her kullanıcının kendi sepeti var
- ✅ Profil değiştiğinde sepet değişiyor
- ✅ Güvenli ve ölçeklenebilir
- ✅ Misafir kullanıcılar destekleniyor
