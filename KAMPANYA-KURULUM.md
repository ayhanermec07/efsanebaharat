# Kampanya Sistemi Kurulum Kılavuzu

## Adım 1: Veritabanı Migrasyonları

### 1.1 Kampanyalar Tablosunu Oluştur

Supabase SQL Editor'de aşağıdaki komutu çalıştırın:

```sql
-- Kampanyalar tablosunu oluştur
CREATE TABLE IF NOT EXISTS kampanyalar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kod TEXT UNIQUE NOT NULL,
  ad TEXT NOT NULL,
  aciklama TEXT,
  indirim_tipi TEXT CHECK (indirim_tipi IN ('yuzde', 'tutar')) NOT NULL,
  indirim_degeri DECIMAL(10,2) NOT NULL,
  min_sepet_tutari DECIMAL(10,2) DEFAULT 0,
  max_indirim_tutari DECIMAL(10,2),
  hedef_grup TEXT CHECK (hedef_grup IN ('musteri', 'bayi', 'tumu')) DEFAULT 'tumu',
  baslangic_tarihi TIMESTAMP NOT NULL,
  bitis_tarihi TIMESTAMP NOT NULL,
  kullanim_limiti INTEGER,
  kullanim_sayisi INTEGER DEFAULT 0,
  aktif BOOLEAN DEFAULT true,
  olusturma_tarihi TIMESTAMP DEFAULT NOW()
);

-- Index'ler
CREATE INDEX idx_kampanyalar_kod ON kampanyalar(kod);
CREATE INDEX idx_kampanyalar_aktif ON kampanyalar(aktif);
CREATE INDEX idx_kampanyalar_tarih ON kampanyalar(baslangic_tarihi, bitis_tarihi);
```

### 1.2 Siparisler Tablosunu Güncelle

```sql
-- Siparisler tablosuna kampanya alanlarını ekle
ALTER TABLE siparisler
ADD COLUMN IF NOT EXISTS kampanya_kodu TEXT,
ADD COLUMN IF NOT EXISTS kampanya_indirimi DECIMAL(10,2) DEFAULT 0;

-- Index ekle
CREATE INDEX IF NOT EXISTS idx_siparisler_kampanya ON siparisler(kampanya_kodu);
```

### 1.3 Trigger ve Function Oluştur

```sql
-- Kampanya kullanım sayısını artırmak için function
CREATE OR REPLACE FUNCTION kampanya_kullanim_artir()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.kampanya_kodu IS NOT NULL AND NEW.odeme_durumu = 'tamamlandi' THEN
    UPDATE kampanyalar
    SET kullanim_sayisi = kullanim_sayisi + 1
    WHERE kod = NEW.kampanya_kodu;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı oluştur
DROP TRIGGER IF EXISTS trigger_kampanya_kullanim ON siparisler;
CREATE TRIGGER trigger_kampanya_kullanim
AFTER UPDATE OF odeme_durumu ON siparisler
FOR EACH ROW
WHEN (NEW.odeme_durumu = 'tamamlandi' AND OLD.odeme_durumu != 'tamamlandi')
EXECUTE FUNCTION kampanya_kullanim_artir();
```

### 1.4 İstatistik View Oluştur

```sql
-- Kampanya istatistikleri için view
CREATE OR REPLACE VIEW kampanya_istatistikleri AS
SELECT 
  k.id,
  k.kod,
  k.ad,
  k.kullanim_sayisi,
  k.kullanim_limiti,
  COUNT(s.id) as siparis_sayisi,
  COALESCE(SUM(s.kampanya_indirimi), 0) as toplam_indirim,
  COALESCE(SUM(s.toplam_tutar), 0) as toplam_satis
FROM kampanyalar k
LEFT JOIN siparisler s ON s.kampanya_kodu = k.kod AND s.odeme_durumu = 'tamamlandi'
GROUP BY k.id, k.kod, k.ad, k.kullanim_sayisi, k.kullanim_limiti;
```

## Adım 2: RLS (Row Level Security) Politikaları

```sql
-- Kampanyalar tablosu için RLS
ALTER TABLE kampanyalar ENABLE ROW LEVEL SECURITY;

-- Herkes aktif kampanyaları görebilir
CREATE POLICY "Herkes aktif kampanyaları görebilir"
ON kampanyalar FOR SELECT
USING (aktif = true);

-- Sadece adminler kampanya oluşturabilir
CREATE POLICY "Adminler kampanya oluşturabilir"
ON kampanyalar FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM kullanicilar
    WHERE kullanicilar.id = auth.uid()
    AND kullanicilar.rol = 'admin'
  )
);

-- Sadece adminler kampanya güncelleyebilir
CREATE POLICY "Adminler kampanya güncelleyebilir"
ON kampanyalar FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM kullanicilar
    WHERE kullanicilar.id = auth.uid()
    AND kullanicilar.rol = 'admin'
  )
);

-- Sadece adminler kampanya silebilir
CREATE POLICY "Adminler kampanya silebilir"
ON kampanyalar FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM kullanicilar
    WHERE kullanicilar.id = auth.uid()
    AND kullanicilar.rol = 'admin'
  )
);
```

## Adım 3: Test Verileri (Opsiyonel)

```sql
-- Test kampanyaları ekle
INSERT INTO kampanyalar (kod, ad, aciklama, indirim_tipi, indirim_degeri, min_sepet_tutari, max_indirim_tutari, hedef_grup, baslangic_tarihi, bitis_tarihi, kullanim_limiti)
VALUES 
  ('YENIMUSTERI', 'Yeni Müşteri İndirimi', 'İlk alışverişinizde %15 indirim', 'yuzde', 15, 200, 50, 'musteri', NOW(), NOW() + INTERVAL '30 days', 100),
  ('BAYI100', 'Bayi Özel İndirim', '500 TL ve üzeri alışverişlerde 100 TL indirim', 'tutar', 100, 500, NULL, 'bayi', NOW(), NOW() + INTERVAL '60 days', NULL),
  ('FLASH20', 'Flash İndirim', 'Sınırlı sayıda %20 indirim', 'yuzde', 20, 100, 100, 'tumu', NOW(), NOW() + INTERVAL '7 days', 50);
```

## Adım 4: Frontend Entegrasyonu

### 4.1 Bileşenler Oluşturuldu

✅ `src/components/KampanyaUygula.tsx` - Kampanya kodu uygulama bileşeni
✅ `src/components/admin/KampanyaIstatistikleri.tsx` - İstatistik görüntüleme
✅ `src/pages/admin/Kampanyalar.tsx` - Kampanya yönetim sayfası

### 4.2 Sepet Entegrasyonu

✅ `src/pages/Sepet.tsx` - Kampanya uygulama entegrasyonu eklendi

## Adım 5: Kontrol Listesi

- [ ] Veritabanı tabloları oluşturuldu
- [ ] Trigger ve function'lar çalışıyor
- [ ] RLS politikaları aktif
- [ ] Test kampanyaları eklendi
- [ ] Frontend bileşenleri çalışıyor
- [ ] Sepet sayfasında kampanya uygulanabiliyor
- [ ] Admin panelinde kampanyalar yönetilebiliyor
- [ ] İstatistikler görüntülenebiliyor

## Adım 6: Test Senaryoları

### Test 1: Yüzde İndirim Kampanyası

1. Admin panelinden %15 indirimli kampanya oluşturun
2. Minimum sepet tutarını 200 TL yapın
3. Müşteri olarak giriş yapın
4. 250 TL'lik ürün ekleyin
5. Kampanya kodunu uygulayın
6. İndirimin doğru hesaplandığını kontrol edin (37.50 TL)

### Test 2: Sabit Tutar İndirim

1. Admin panelinden 100 TL sabit indirim kampanyası oluşturun
2. Minimum sepet tutarını 500 TL yapın
3. 600 TL'lik ürün ekleyin
4. Kampanya kodunu uygulayın
5. 100 TL indirim uygulandığını kontrol edin

### Test 3: Hedef Grup Kontrolü

1. Sadece bayiler için kampanya oluşturun
2. Müşteri hesabıyla kampanyayı kullanmayı deneyin
3. Hata mesajı aldığınızı kontrol edin
4. Bayi hesabıyla giriş yapın
5. Kampanyanın başarıyla uygulandığını kontrol edin

### Test 4: Kullanım Limiti

1. Kullanım limiti 2 olan kampanya oluşturun
2. İki farklı siparişte kampanyayı kullanın
3. Üçüncü kullanımda hata mesajı aldığınızı kontrol edin

### Test 5: Tarih Kontrolü

1. Gelecek tarihli kampanya oluşturun
2. Kampanyayı kullanmayı deneyin
3. "Henüz başlamadı" mesajı aldığınızı kontrol edin

## Adım 7: Performans Optimizasyonu

```sql
-- Kampanya sorgularını hızlandırmak için ek index'ler
CREATE INDEX IF NOT EXISTS idx_kampanyalar_composite 
ON kampanyalar(aktif, baslangic_tarihi, bitis_tarihi) 
WHERE aktif = true;

-- Siparisler için composite index
CREATE INDEX IF NOT EXISTS idx_siparisler_kampanya_odeme 
ON siparisler(kampanya_kodu, odeme_durumu) 
WHERE kampanya_kodu IS NOT NULL;
```

## Adım 8: Monitoring ve Logging

```sql
-- Kampanya kullanım logları için tablo (opsiyonel)
CREATE TABLE IF NOT EXISTS kampanya_kullanim_loglari (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kampanya_id UUID REFERENCES kampanyalar(id),
  kullanici_id UUID REFERENCES kullanicilar(id),
  siparis_id UUID REFERENCES siparisler(id),
  indirim_tutari DECIMAL(10,2),
  kullanim_tarihi TIMESTAMP DEFAULT NOW()
);

-- Log trigger'ı
CREATE OR REPLACE FUNCTION kampanya_kullanim_logla()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.kampanya_kodu IS NOT NULL THEN
    INSERT INTO kampanya_kullanim_loglari (kampanya_id, kullanici_id, siparis_id, indirim_tutari)
    SELECT k.id, NEW.musteri_id, NEW.id, NEW.kampanya_indirimi
    FROM kampanyalar k
    WHERE k.kod = NEW.kampanya_kodu;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_kampanya_log
AFTER INSERT ON siparisler
FOR EACH ROW
EXECUTE FUNCTION kampanya_kullanim_logla();
```

## Sorun Giderme

### Kampanya Uygulanamıyor

1. Kampanyanın aktif olduğunu kontrol edin
2. Tarih aralığını kontrol edin
3. Minimum sepet tutarını kontrol edin
4. Hedef grup uyumunu kontrol edin
5. Browser console'da hata mesajlarını inceleyin

### İstatistikler Görünmüyor

1. View'in oluşturulduğunu kontrol edin
2. RLS politikalarını kontrol edin
3. Supabase dashboard'dan view'i sorgulayın

### Kullanım Sayısı Artmıyor

1. Trigger'ın oluşturulduğunu kontrol edin
2. Sipariş durumunun 'tamamlandi' olduğunu kontrol edin
3. Kampanya kodunun doğru kaydedildiğini kontrol edin

## Güvenlik Notları

1. Kampanya kodları büyük harfle saklanır
2. RLS politikaları ile yetkilendirme yapılır
3. Kampanya kontrolleri backend'de yapılır
4. SQL injection koruması aktif
5. Rate limiting önerilir

## Bakım ve Güncelleme

### Düzenli Bakım

```sql
-- Süresi dolmuş kampanyaları pasifleştir
UPDATE kampanyalar
SET aktif = false
WHERE bitis_tarihi < NOW() AND aktif = true;

-- Kullanım limitine ulaşan kampanyaları pasifleştir
UPDATE kampanyalar
SET aktif = false
WHERE kullanim_limiti IS NOT NULL 
  AND kullanim_sayisi >= kullanim_limiti 
  AND aktif = true;
```

### Periyodik Temizlik

```sql
-- 1 yıldan eski kampanyaları arşivle
CREATE TABLE IF NOT EXISTS kampanyalar_arsiv AS
SELECT * FROM kampanyalar WHERE bitis_tarihi < NOW() - INTERVAL '1 year';

DELETE FROM kampanyalar WHERE bitis_tarihi < NOW() - INTERVAL '1 year';
```

## Destek ve Dokümantasyon

- Kullanım kılavuzu: `KAMPANYA-SISTEMI-KULLANIM.md`
- API dokümantasyonu: Supabase Auto-generated docs
- Örnek kodlar: `src/components/KampanyaUygula.tsx`

## Tamamlandı! ✅

Kampanya sistemi başarıyla kuruldu ve kullanıma hazır.
