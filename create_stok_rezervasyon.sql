-- Stok Rezervasyon Sistemi
-- Bu sistem sepetteki ürünleri 24 saat boyunca rezerve eder
-- Böylece aynı ürünü birden fazla kullanıcı aynı anda satın alamaz

-- 1. Rezervasyon Tablosu
CREATE TABLE IF NOT EXISTS stok_rezervasyonlari (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  musteri_id UUID NOT NULL REFERENCES musteriler(id) ON DELETE CASCADE,
  urun_id UUID NOT NULL REFERENCES urunler(id) ON DELETE CASCADE,
  birim_turu TEXT NOT NULL,
  miktar NUMERIC NOT NULL,
  rezervasyon_tarihi TIMESTAMPTZ DEFAULT NOW(),
  gecerlilik_suresi INTERVAL DEFAULT '24 hours',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(musteri_id, urun_id, birim_turu)
);

COMMENT ON TABLE stok_rezervasyonlari IS 'Sepetteki ürünler için stok rezervasyonları';
COMMENT ON COLUMN stok_rezervasyonlari.gecerlilik_suresi IS 'Rezervasyonun geçerli olduğu süre (varsayılan 24 saat)';

-- 2. Index'ler - Performans için
CREATE INDEX IF NOT EXISTS idx_rezervasyon_musteri ON stok_rezervasyonlari(musteri_id);
CREATE INDEX IF NOT EXISTS idx_rezervasyon_urun ON stok_rezervasyonlari(urun_id);
CREATE INDEX IF NOT EXISTS idx_rezervasyon_tarih ON stok_rezervasyonlari(rezervasyon_tarihi);
CREATE INDEX IF NOT EXISTS idx_rezervasyon_gecerlilik ON stok_rezervasyonlari(rezervasyon_tarihi, gecerlilik_suresi);

-- 3. RLS (Row Level Security) Politikaları
ALTER TABLE stok_rezervasyonlari ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi rezervasyonlarını görebilir
CREATE POLICY "Kullanıcılar kendi rezervasyonlarını görebilir"
ON stok_rezervasyonlari FOR SELECT
USING (
  musteri_id IN (
    SELECT id FROM musteriler WHERE user_id = auth.uid()
  )
);

-- Kullanıcılar rezervasyon oluşturabilir
CREATE POLICY "Kullanıcılar rezervasyon oluşturabilir"
ON stok_rezervasyonlari FOR INSERT
WITH CHECK (
  musteri_id IN (
    SELECT id FROM musteriler WHERE user_id = auth.uid()
  )
);

-- Kullanıcılar kendi rezervasyonlarını güncelleyebilir
CREATE POLICY "Kullanıcılar kendi rezervasyonlarını güncelleyebilir"
ON stok_rezervasyonlari FOR UPDATE
USING (
  musteri_id IN (
    SELECT id FROM musteriler WHERE user_id = auth.uid()
  )
);

-- Kullanıcılar kendi rezervasyonlarını silebilir
CREATE POLICY "Kullanıcılar kendi rezervasyonlarını silebilir"
ON stok_rezervasyonlari FOR DELETE
USING (
  musteri_id IN (
    SELECT id FROM musteriler WHERE user_id = auth.uid()
  )
);

-- 4. Otomatik Temizleme Function
CREATE OR REPLACE FUNCTION temizle_eski_rezervasyonlar()
RETURNS void AS $$
BEGIN
  DELETE FROM stok_rezervasyonlari
  WHERE rezervasyon_tarihi + gecerlilik_suresi < NOW();
  
  RAISE NOTICE 'Eski rezervasyonlar temizlendi';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION temizle_eski_rezervasyonlar IS 'Süresi dolmuş rezervasyonları temizler';

-- 5. Müsait Stok View
-- Bu view rezervasyonları da hesaba katarak müsait stok miktarını gösterir
CREATE OR REPLACE VIEW musait_stoklar AS
SELECT 
  us.id,
  us.urun_id,
  us.birim_turu,
  us.stok_miktari,
  COALESCE(SUM(sr.miktar), 0) as rezerve_miktar,
  us.stok_miktari - COALESCE(SUM(sr.miktar), 0) as musait_miktar,
  us.stok_birimi,
  us.birim_adedi,
  us.birim_adedi_turu,
  us.fiyat,
  us.aktif_durum
FROM urun_stoklari us
LEFT JOIN stok_rezervasyonlari sr 
  ON us.urun_id = sr.urun_id 
  AND us.birim_turu = sr.birim_turu
  AND sr.rezervasyon_tarihi + sr.gecerlilik_suresi > NOW()
GROUP BY us.id, us.urun_id, us.birim_turu, us.stok_miktari, us.stok_birimi, 
         us.birim_adedi, us.birim_adedi_turu, us.fiyat, us.aktif_durum;

COMMENT ON VIEW musait_stoklar IS 'Rezervasyonlar düşüldükten sonra müsait stok miktarları';

-- 6. Otomatik Temizleme için Cron Job (Opsiyonel - pg_cron extension gerekir)
-- Eğer pg_cron extension'ı varsa, her saat başı otomatik temizleme yapılır
-- SELECT cron.schedule('temizle-rezervasyonlar', '0 * * * *', 'SELECT temizle_eski_rezervasyonlar()');

-- 7. Test Sorguları
-- Aktif rezervasyonları göster
-- SELECT * FROM stok_rezervasyonlari WHERE rezervasyon_tarihi + gecerlilik_suresi > NOW();

-- Müsait stokları göster
-- SELECT * FROM musait_stoklar;

-- Süresi dolmuş rezervasyonları temizle
-- SELECT temizle_eski_rezervasyonlar();
