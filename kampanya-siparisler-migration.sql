-- Siparisler tablosuna kampanya alanlarını ekle
ALTER TABLE siparisler
ADD COLUMN IF NOT EXISTS kampanya_kodu TEXT,
ADD COLUMN IF NOT EXISTS kampanya_indirimi DECIMAL(10,2) DEFAULT 0;

-- Kampanya kullanım sayısını artırmak için trigger
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

-- Kampanya istatistikleri için view
CREATE OR REPLACE VIEW kampanya_istatistikleri AS
SELECT 
  k.id,
  k.kod,
  k.ad,
  k.kullanim_sayisi,
  k.kullanim_limiti,
  COUNT(s.id) as siparis_sayisi,
  SUM(s.kampanya_indirimi) as toplam_indirim,
  SUM(s.toplam_tutar) as toplam_satis
FROM kampanyalar k
LEFT JOIN siparisler s ON s.kampanya_kodu = k.kod AND s.odeme_durumu = 'tamamlandi'
GROUP BY k.id, k.kod, k.ad, k.kullanim_sayisi, k.kullanim_limiti;
