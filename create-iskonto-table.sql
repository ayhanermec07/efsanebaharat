-- İskonto Tablosunu Oluşturma
-- Bu SQL'i Supabase SQL Editor'de çalıştırın

-- İskonto Sistemi Tablosu
CREATE TABLE IF NOT EXISTS iskontolar (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    iskonto_adi TEXT NOT NULL,
    iskonto_tipi TEXT NOT NULL CHECK (iskonto_tipi IN ('musteri', 'bayi', 'grup', 'musteri_tipi_grubu')),
    hedef_tipi TEXT NOT NULL CHECK (hedef_tipi IN ('musteri', 'grup')),
    hedef_id UUID,
    hedef_adi TEXT NOT NULL,
    iskonto_orani DECIMAL(5,2) NOT NULL CHECK (iskonto_orani >= 0 AND iskonto_orani <= 100),
    baslangic_tarihi DATE NOT NULL,
    bitis_tarihi DATE,
    aktif BOOLEAN DEFAULT true,
    aciklama TEXT,
    musteri_tipi TEXT CHECK (musteri_tipi IN ('musteri', 'bayi')),
    olusturma_tarihi TIMESTAMPTZ DEFAULT now(),
    guncelleme_tarihi TIMESTAMPTZ DEFAULT now()
);

-- İskonto Index'leri
CREATE INDEX IF NOT EXISTS idx_iskontolar_hedef_id ON iskontolar(hedef_id);
CREATE INDEX IF NOT EXISTS idx_iskontolar_aktif ON iskontolar(aktif);
CREATE INDEX IF NOT EXISTS idx_iskontolar_tarih ON iskontolar(baslangic_tarihi, bitis_tarihi);
CREATE INDEX IF NOT EXISTS idx_iskontolar_tipi ON iskontolar(iskonto_tipi);

-- İskonto RLS Politikaları
ALTER TABLE iskontolar ENABLE ROW LEVEL SECURITY;

-- Önce mevcut politikaları temizle (varsa)
DROP POLICY IF EXISTS "iskontolar_admin_all" ON iskontolar;
DROP POLICY IF EXISTS "iskontolar_musteri_select" ON iskontolar;
DROP POLICY IF EXISTS "iskontolar_bayi_select" ON iskontolar;

-- Adminler tüm iskontolara erişebilir
CREATE POLICY "iskontolar_admin_all" ON iskontolar
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM admin_users
        )
    );

-- Müşteriler sadece kendi iskontolarını görebilir
CREATE POLICY "iskontolar_musteri_select" ON iskontolar
    FOR SELECT USING (
        hedef_id IN (
            SELECT id FROM musteriler WHERE user_id = auth.uid()
        )
        AND aktif = true
        AND baslangic_tarihi <= CURRENT_DATE
        AND (bitis_tarihi IS NULL OR bitis_tarihi >= CURRENT_DATE)
    );

-- Bayiler sadece kendi iskontolarını görebilir  
CREATE POLICY "iskontolar_bayi_select" ON iskontolar
    FOR SELECT USING (
        hedef_id IN (
            SELECT id FROM bayiler 
            WHERE id IN (
                SELECT id FROM musteriler WHERE user_id = auth.uid()
            )
        )
        AND aktif = true
        AND baslangic_tarihi <= CURRENT_DATE
        AND (bitis_tarihi IS NULL OR bitis_tarihi >= CURRENT_DATE)
    );

-- Başarılı mesajı
SELECT 'İskonto tablosu başarıyla oluşturuldu!' as message;
