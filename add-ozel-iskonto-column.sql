-- Müşteriler tablosuna özel iskonto oranı kolonu ekleme
-- Bu SQL'i Supabase SQL Editor'de çalıştırın

-- Özel iskonto oranı kolonu ekle
ALTER TABLE musteriler 
ADD COLUMN IF NOT EXISTS ozel_iskonto_orani NUMERIC(5,2) DEFAULT 0 CHECK (ozel_iskonto_orani >= 0 AND ozel_iskonto_orani <= 100);

-- Yorum ekle
COMMENT ON COLUMN musteriler.ozel_iskonto_orani IS 'Müşteriye özel ek iskonto oranı (grup iskontosuna ek olarak uygulanır)';

-- Başarılı mesajı
SELECT 'Özel iskonto oranı kolonu başarıyla eklendi!' as message;
