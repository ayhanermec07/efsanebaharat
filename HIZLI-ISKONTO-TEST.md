# Hızlı İskonto Test Kılavuzu

## 1. Veritabanı Güncelleme (Tek Seferlik)

Supabase SQL Editor'de şu komutu çalıştırın:

```sql
-- hedef_tipi kolonu ekle
ALTER TABLE iskontolar 
ADD COLUMN IF NOT EXISTS hedef_tipi TEXT CHECK (hedef_tipi IN ('musteri', 'grup'));

-- Mevcut kayıtları güncelle
UPDATE iskontolar 
SET hedef_tipi = CASE 
    WHEN iskonto_tipi IN ('musteri', 'bayi') THEN 'musteri'
    WHEN iskonto_tipi IN ('grup', 'musteri_tipi_grubu') THEN 'grup'
    ELSE 'musteri'
END
WHERE hedef_tipi IS NULL;
```

## 2. Test İskontosu Oluşturma

### Adım 1: Müşteri ID'sini Bulun

```sql
SELECT 
    m.id as musteri_id,
    m.ad || ' ' || m.soyad as musteri_adi,
    u.email
FROM musteriler m
LEFT JOIN auth.users u ON m.user_id = u.id
WHERE m.aktif_durum = true
ORDER BY m.created_at DESC
LIMIT 5;
```

### Adım 2: İskonto Oluşturun

Yukarıdaki sorgudan aldığınız `musteri_id`'yi aşağıya yapıştırın:

```sql
INSERT INTO iskontolar (
    iskonto_adi,
    iskonto_tipi,
    hedef_tipi,
    hedef_id,
    hedef_adi,
    iskonto_orani,
    baslangic_tarihi,
    bitis_tarihi,
    aktif,
    aciklama
) VALUES (
    'Test Müşteri İndirimi',
    'musteri',
    'musteri',
    'BURAYA_MUSTERI_ID_YAPISTIR',
    'Test Müşteri',
    15.00,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    true,
    'Test amaçlı %15 indirim'
);
```

## 3. Test Etme

1. İskonto tanımladığınız müşteri ile giriş yapın
2. Ana sayfaya gidin
3. Ürünlerde şunları göreceksiniz:
   - ✅ Sağ üst köşede kırmızı "%15 İndirim" etiketi
   - ✅ Eski fiyat üstü çizili
   - ✅ Yeni fiyat büyük ve turuncu renkte
4. Ürün detayına gidin ve aynı indirimi görün
5. Sepete ekleyin - iskontolu fiyat sepete eklenecek

## 4. Grup İskontosu Test (Opsiyonel)

### Adım 1: Fiyat Grubu ID'sini Bulun

```sql
SELECT id, grup_adi FROM fiyat_gruplari WHERE aktif_durum = true;
```

### Adım 2: Grup İskontosu Oluşturun

```sql
INSERT INTO iskontolar (
    iskonto_adi,
    iskonto_tipi,
    hedef_tipi,
    hedef_id,
    hedef_adi,
    iskonto_orani,
    baslangic_tarihi,
    bitis_tarihi,
    aktif,
    aciklama
) VALUES (
    'Bireysel Müşteri Grubu İndirimi',
    'grup',
    'grup',
    'BURAYA_GRUP_ID_YAPISTIR',
    'Bireysel Müşteri',
    10.00,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    true,
    'Tüm bireysel müşteriler için %10 indirim'
);
```

## 5. İskonto Kontrolü ve Debug

### Mevcut İskontaları Görüntüle

```sql
SELECT 
    iskonto_adi,
    hedef_tipi,
    hedef_adi,
    iskonto_orani,
    baslangic_tarihi,
    bitis_tarihi,
    aktif,
    CASE 
        WHEN baslangic_tarihi <= CURRENT_DATE AND bitis_tarihi >= CURRENT_DATE THEN '✅ Aktif'
        WHEN baslangic_tarihi > CURRENT_DATE THEN '⏳ Başlamadı'
        WHEN bitis_tarihi < CURRENT_DATE THEN '❌ Dolmuş'
    END as durum
FROM iskontolar
WHERE aktif = true
ORDER BY olusturma_tarihi DESC;
```

### Detaylı Debug

`debug-iskonto.sql` dosyasını Supabase'de çalıştırın. Bu dosya:
- Tüm iskontaları listeler
- Müşteri-iskonto eşleştirmelerini gösterir
- Tarih kontrolü yapar
- Kolon yapısını kontrol eder

## Sorun mu var?

### İskonto görünmüyor:

1. **Tarayıcı Konsolunu Kontrol Edin (F12)**
   - Console sekmesine gidin
   - "🔍 İskonto hesaplanıyor" mesajını arayın
   - Hata mesajları varsa not alın

2. **Çıkış Yapıp Tekrar Giriş Yapın**
   - Tam çıkış yapın
   - Tarayıcıyı yenileyin (Ctrl+F5)
   - Tekrar giriş yapın

3. **Supabase'de Kontrol Edin**
   - `debug-iskonto.sql` dosyasını çalıştırın
   - İskontonun `aktif = true` olduğunu kontrol edin
   - Tarih aralığının bugünü kapsadığını kontrol edin
   - `hedef_tipi` kolonunun doğru değerde olduğunu kontrol edin

4. **RLS Politikalarını Kontrol Edin**
   ```sql
   -- Müşteri iskontolarını görebiliyor mu?
   SELECT * FROM iskontolar WHERE hedef_tipi = 'musteri';
   ```

### Yanlış fiyat:
- Sepeti temizleyin ve ürünü tekrar ekleyin
- Tarayıcı önbelleğini temizleyin
- Çıkış yapıp tekrar giriş yapın

### Hata alıyorsanız:
- Tarayıcı konsolunu kontrol edin (F12)
- Network sekmesinde Supabase isteklerini kontrol edin
- `debug-iskonto.sql` ile veritabanı durumunu kontrol edin
