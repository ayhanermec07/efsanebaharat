-- Test İskonto Oluşturma
-- Bu SQL'i Supabase SQL Editor'de çalıştırın

-- Önce hedef_tipi kolonunu ekle (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'iskontolar' AND column_name = 'hedef_tipi'
    ) THEN
        ALTER TABLE iskontolar 
        ADD COLUMN hedef_tipi TEXT CHECK (hedef_tipi IN ('musteri', 'grup'));
        
        UPDATE iskontolar 
        SET hedef_tipi = CASE 
            WHEN iskonto_tipi IN ('musteri', 'bayi') THEN 'musteri'
            WHEN iskonto_tipi IN ('grup', 'musteri_tipi_grubu') THEN 'grup'
            ELSE 'musteri'
        END
        WHERE hedef_tipi IS NULL;
        
        ALTER TABLE iskontolar 
        ALTER COLUMN hedef_tipi SET NOT NULL;
    END IF;
END $$;

-- Mevcut müşterileri listele
SELECT 
    m.id as musteri_id,
    m.ad || ' ' || m.soyad as musteri_adi,
    m.musteri_tipi,
    u.email,
    fg.grup_adi as fiyat_grubu
FROM musteriler m
LEFT JOIN auth.users u ON m.user_id = u.id
LEFT JOIN fiyat_gruplari fg ON m.fiyat_grubu_id = fg.id
WHERE m.aktif_durum = true
ORDER BY m.created_at DESC
LIMIT 10;

-- Örnek: Bireysel müşteri iskontosu oluşturma
-- Aşağıdaki musteri_id'yi yukarıdaki listeden alın ve değiştirin
/*
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
    'BURAYA_MUSTERI_ID_YAZIN', -- Yukarıdaki listeden bir musteri_id seçin
    'Test Müşteri',
    15.00, -- %15 indirim
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    true,
    'Test amaçlı oluşturulmuş iskonto'
);
*/

-- Örnek: Fiyat grubu iskontosu oluşturma
-- Önce fiyat gruplarını listele
SELECT 
    id as grup_id,
    grup_adi,
    aciklama
FROM fiyat_gruplari
WHERE aktif_durum = true;

-- Fiyat grubu için iskonto oluştur
/*
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
    'BURAYA_GRUP_ID_YAZIN', -- Yukarıdaki listeden bir grup_id seçin
    'Bireysel Müşteri',
    10.00, -- %10 indirim
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    true,
    'Bireysel müşteriler için grup indirimi'
);
*/

-- Mevcut iskontaları kontrol et
SELECT 
    i.iskonto_adi,
    i.iskonto_tipi,
    i.hedef_tipi,
    i.hedef_adi,
    i.iskonto_orani,
    i.baslangic_tarihi,
    i.bitis_tarihi,
    i.aktif,
    i.aciklama
FROM iskontolar i
WHERE i.aktif = true
ORDER BY i.olusturma_tarihi DESC;
