-- Kullanıcı bazlı sepet sistemi için sepet_items tablosu
-- Bu tablo her kullanıcının sepetini veritabanında saklar

CREATE TABLE IF NOT EXISTS sepet_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  musteri_id UUID NOT NULL REFERENCES musteriler(id) ON DELETE CASCADE,
  urun_id UUID NOT NULL REFERENCES urunler(id) ON DELETE CASCADE,
  birim_turu TEXT NOT NULL,
  birim_adedi NUMERIC,
  birim_adedi_turu TEXT,
  miktar NUMERIC NOT NULL DEFAULT 1,
  birim_fiyat NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(musteri_id, urun_id, birim_turu)
);

-- Index'ler - performans için
CREATE INDEX IF NOT EXISTS idx_sepet_items_musteri ON sepet_items(musteri_id);
CREATE INDEX IF NOT EXISTS idx_sepet_items_urun ON sepet_items(urun_id);

-- RLS (Row Level Security) aktif et
ALTER TABLE sepet_items ENABLE ROW LEVEL SECURITY;

-- RLS Politikaları - Kullanıcılar sadece kendi sepetlerini görebilir/düzenleyebilir

-- SELECT policy
CREATE POLICY "Kullanıcılar kendi sepetlerini görebilir"
ON sepet_items FOR SELECT
USING (
  musteri_id IN (
    SELECT id FROM musteriler WHERE user_id = auth.uid()
  )
);

-- INSERT policy
CREATE POLICY "Kullanıcılar kendi sepetlerine ekleyebilir"
ON sepet_items FOR INSERT
WITH CHECK (
  musteri_id IN (
    SELECT id FROM musteriler WHERE user_id = auth.uid()
  )
);

-- UPDATE policy
CREATE POLICY "Kullanıcılar kendi sepetlerini güncelleyebilir"
ON sepet_items FOR UPDATE
USING (
  musteri_id IN (
    SELECT id FROM musteriler WHERE user_id = auth.uid()
  )
);

-- DELETE policy
CREATE POLICY "Kullanıcılar kendi sepetlerinden silebilir"
ON sepet_items FOR DELETE
USING (
  musteri_id IN (
    SELECT id FROM musteriler WHERE user_id = auth.uid()
  )
);

-- Updated_at otomatik güncelleme trigger'ı
CREATE OR REPLACE FUNCTION update_sepet_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sepet_items_updated_at
BEFORE UPDATE ON sepet_items
FOR EACH ROW
EXECUTE FUNCTION update_sepet_items_updated_at();

-- Kullanım Notları:
-- 1. Her kullanıcının sepeti musteri_id ile ilişkilendirilir
-- 2. Aynı ürün + birim_turu kombinasyonu bir kullanıcı için sadece bir kez olabilir (UNIQUE constraint)
-- 3. Kullanıcı silindiğinde sepeti de otomatik silinir (ON DELETE CASCADE)
-- 4. RLS sayesinde kullanıcılar sadece kendi sepetlerini görebilir
