# 🎯 Stok Rezervasyon Sistemi

## ✅ Tamamlandı!

Sepetteki ürünler artık 24 saat boyunca rezerve ediliyor. Bu sayede:
- ✅ Aynı ürünü birden fazla kullanıcı aynı anda satın alamaz
- ✅ Kullanıcı stok garantisi alır
- ✅ Yarış durumu (race condition) önlenir
- ✅ Kullanıcı deneyimi iyileşir

---

## 🔄 Sistem Akışı

### 1. Sepete Ekleme
```
Kullanıcı "Sepete Ekle" tıklar
    ↓
Müsait stok kontrolü (rezervasyonlar dahil)
    ↓
Yeterli stok var mı?
    ├─ EVET → Rezervasyon oluştur → Sepete ekle ✅
    └─ HAYIR → "Yeterli stok yok" hatası ❌
```

### 2. Miktar Güncelleme
```
Kullanıcı miktarı artırır/azaltır
    ↓
Müsait stok kontrolü
    ↓
Yeterli stok var mı?
    ├─ EVET → Rezervasyonu güncelle → Miktarı güncelle ✅
    └─ HAYIR → "Yeterli stok yok" hatası ❌
```

### 3. Sepetten Çıkarma
```
Kullanıcı ürünü sepetten çıkarır
    ↓
Rezervasyonu kaldır
    ↓
Stok serbest kalır ✅
```

### 4. Sipariş Tamamlama
```
Kullanıcı siparişi tamamlar
    ↓
Stokları düşür
    ↓
Rezervasyonları kaldır
    ↓
Sepeti temizle ✅
```

### 5. Otomatik İptal
```
24 saat geçer
    ↓
Rezervasyon otomatik iptal edilir
    ↓
Stok serbest kalır ✅
```

---

## 📊 Veritabanı Yapısı

### stok_rezervasyonlari Tablosu
```sql
CREATE TABLE stok_rezervasyonlari (
  id UUID PRIMARY KEY,
  musteri_id UUID,           -- Hangi kullanıcı
  urun_id UUID,              -- Hangi ürün
  birim_turu TEXT,           -- Hangi birim (gr, kg, adet)
  miktar NUMERIC,            -- Ne kadar rezerve
  rezervasyon_tarihi TIMESTAMPTZ,  -- Ne zaman
  gecerlilik_suresi INTERVAL DEFAULT '24 hours',  -- Ne kadar süre
  UNIQUE(musteri_id, urun_id, birim_turu)  -- Kullanıcı başına 1 rezervasyon
);
```

### musait_stoklar View
```sql
CREATE VIEW musait_stoklar AS
SELECT 
  stok_miktari,                    -- Toplam stok
  SUM(rezerve_miktar),             -- Rezerve edilen
  stok_miktari - rezerve_miktar    -- Müsait stok
FROM urun_stoklari
LEFT JOIN stok_rezervasyonlari
WHERE rezervasyon_tarihi + gecerlilik_suresi > NOW()
GROUP BY urun_id, birim_turu;
```

---

## 🎮 Kullanım Örnekleri

### Örnek 1: Normal Akış
```
Stok: 10 adet
Kullanıcı A: 3 adet sepete ekler
  → Rezerve: 3 adet
  → Müsait: 7 adet ✅

Kullanıcı B: 5 adet sepete ekler
  → Rezerve: 5 adet
  → Müsait: 2 adet ✅

Kullanıcı C: 5 adet sepete eklemeye çalışır
  → HATA: "Yeterli stok yok! Müsait: 2" ❌
```

### Örnek 2: Otomatik İptal
```
Stok: 5 adet
Kullanıcı A: 3 adet sepete ekler
  → Rezerve: 3 adet
  → Müsait: 2 adet

24 saat geçer...
  → Rezervasyon otomatik iptal
  → Müsait: 5 adet ✅

Kullanıcı B: 5 adet sepete ekler
  → Başarılı ✅
```

### Örnek 3: Sipariş Tamamlama
```
Stok: 10 adet
Kullanıcı A: 3 adet sepete ekler
  → Rezerve: 3 adet
  → Müsait: 7 adet

Kullanıcı A siparişi tamamlar
  → Stok: 7 adet
  → Rezervasyon kaldırılır
  → Müsait: 7 adet ✅
```

---

## ⚙️ Yapılandırma

### Rezervasyon Süresini Değiştirme

**Veritabanında:**
```sql
-- Tüm rezervasyonlar için varsayılan süreyi değiştir
ALTER TABLE stok_rezervasyonlari 
ALTER COLUMN gecerlilik_suresi SET DEFAULT '12 hours';

-- Belirli bir rezervasyon için süreyi değiştir
UPDATE stok_rezervasyonlari 
SET gecerlilik_suresi = '48 hours'
WHERE urun_id = 'xxx';
```

**Kod'da:**
```typescript
// SepetContext.tsx içinde
const REZERVASYON_SURESI = '24 hours'; // Buradan değiştir
```

---

## 🔧 Bakım ve İzleme

### Otomatik Temizleme

**Manuel Temizleme:**
```sql
SELECT temizle_eski_rezervasyonlar();
```

**Otomatik Temizleme (pg_cron ile):**
```sql
-- Her saat başı otomatik temizle
SELECT cron.schedule(
  'temizle-rezervasyonlar', 
  '0 * * * *', 
  'SELECT temizle_eski_rezervasyonlar()'
);
```

**Alternatif: Supabase Edge Function**
```typescript
// Her gün 03:00'te çalışacak edge function
Deno.serve(async () => {
  await supabase.rpc('temizle_eski_rezervasyonlar');
  return new Response('OK');
});
```

### İstatistikler

**Aktif Rezervasyonlar:**
```sql
SELECT COUNT(*) as aktif_rezervasyonlar
FROM stok_rezervasyonlari
WHERE rezervasyon_tarihi + gecerlilik_suresi > NOW();
```

**Süresi Dolmuş Rezervasyonlar:**
```sql
SELECT COUNT(*) as suresi_dolmus
FROM stok_rezervasyonlari
WHERE rezervasyon_tarihi + gecerlilik_suresi < NOW();
```

**En Çok Rezerve Edilen Ürünler:**
```sql
SELECT 
  u.urun_adi,
  COUNT(*) as rezervasyon_sayisi,
  SUM(sr.miktar) as toplam_rezerve
FROM stok_rezervasyonlari sr
JOIN urunler u ON sr.urun_id = u.id
WHERE sr.rezervasyon_tarihi + sr.gecerlilik_suresi > NOW()
GROUP BY u.urun_adi
ORDER BY rezervasyon_sayisi DESC
LIMIT 10;
```

**Ortalama Rezervasyon Süresi:**
```sql
SELECT AVG(siparis_tarihi - rezervasyon_tarihi) as ortalama_sure
FROM stok_rezervasyonlari sr
JOIN siparisler s ON sr.musteri_id = s.musteri_id;
```

---

## 🐛 Sorun Giderme

### Sorun 1: "Yeterli stok yok" Hatası

**Neden:**
- Başka kullanıcılar ürünü rezerve etmiş
- Gerçek stok tükenmiş

**Çözüm:**
```sql
-- Müsait stoku kontrol et
SELECT * FROM musait_stoklar WHERE urun_id = 'xxx';

-- Rezervasyonları kontrol et
SELECT * FROM stok_rezervasyonlari 
WHERE urun_id = 'xxx' 
AND rezervasyon_tarihi + gecerlilik_suresi > NOW();
```

### Sorun 2: Rezervasyon Temizlenmiyor

**Neden:**
- Otomatik temizleme çalışmıyor
- Cron job kurulmamış

**Çözüm:**
```sql
-- Manuel temizle
SELECT temizle_eski_rezervasyonlar();

-- Cron job'u kontrol et
SELECT * FROM cron.job WHERE jobname = 'temizle-rezervasyonlar';
```

### Sorun 3: Stok Negatif Oluyor

**Neden:**
- Rezervasyon ve stok düşürme senkronize değil

**Çözüm:**
```sql
-- Stokları kontrol et
SELECT 
  us.urun_id,
  us.stok_miktari,
  SUM(sr.miktar) as rezerve,
  us.stok_miktari - SUM(sr.miktar) as musait
FROM urun_stoklari us
LEFT JOIN stok_rezervasyonlari sr ON us.urun_id = sr.urun_id
GROUP BY us.urun_id, us.stok_miktari
HAVING us.stok_miktari - SUM(sr.miktar) < 0;
```

---

## 📈 Performans

### Index'ler
```sql
-- Rezervasyon sorgularını hızlandırır
CREATE INDEX idx_rezervasyon_musteri ON stok_rezervasyonlari(musteri_id);
CREATE INDEX idx_rezervasyon_urun ON stok_rezervasyonlari(urun_id);
CREATE INDEX idx_rezervasyon_tarih ON stok_rezervasyonlari(rezervasyon_tarihi);
```

### Sorgu Optimizasyonu
```sql
-- EXPLAIN ANALYZE ile sorgu performansını kontrol et
EXPLAIN ANALYZE
SELECT * FROM musait_stoklar WHERE urun_id = 'xxx';
```

### Beklenen Performans
- Rezervasyon oluşturma: < 50ms
- Stok kontrolü: < 20ms
- Otomatik temizleme: < 100ms (1000 rezervasyon için)

---

## 🔒 Güvenlik

### RLS Politikaları
- ✅ Kullanıcılar sadece kendi rezervasyonlarını görebilir
- ✅ Başkasının rezervasyonunu değiştiremez
- ✅ Veritabanı seviyesinde güvenlik

### SQL Injection Koruması
- ✅ Parametreli sorgular kullanılıyor
- ✅ Supabase client otomatik koruma sağlıyor

---

## 🚀 Gelecek İyileştirmeler

- [ ] Ürün tipine göre dinamik süre
- [ ] Kullanıcıya rezervasyon süresi bildirimi
- [ ] Admin panelinde rezervasyon yönetimi
- [ ] Rezervasyon istatistikleri dashboard'u
- [ ] Otomatik stok uyarıları
- [ ] Rezervasyon geçmişi
- [ ] Rezervasyon öncelik sistemi (VIP kullanıcılar)

---

## ✨ Sonuç

Stok rezervasyon sistemi başarıyla kuruldu!

**Avantajlar:**
- ✅ Yarış durumu önlendi
- ✅ Kullanıcı deneyimi iyileşti
- ✅ Stok yönetimi güvenilir
- ✅ Performans etkilenmedi
- ✅ Ölçeklenebilir yapı

**Kullanıma Hazır!** 🎉
