-- İskonto tablosuna hedef_tipi kolonu ekleme
-- Bu SQL'i Supabase SQL Editor'de çalıştırın

-- Eğer hedef_tipi kolonu yoksa ekle
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'iskontolar' AND column_name = 'hedef_tipi'
    ) THEN
        ALTER TABLE iskontolar 
        ADD COLUMN hedef_tipi TEXT CHECK (hedef_tipi IN ('musteri', 'grup'));
        
        -- Mevcut kayıtlar için varsayılan değer ata
        UPDATE iskontolar 
        SET hedef_tipi = CASE 
            WHEN iskonto_tipi IN ('musteri', 'bayi') THEN 'musteri'
            WHEN iskonto_tipi IN ('grup', 'musteri_tipi_grubu') THEN 'grup'
            ELSE 'musteri'
        END
        WHERE hedef_tipi IS NULL;
        
        -- Kolonu NOT NULL yap
        ALTER TABLE iskontolar 
        ALTER COLUMN hedef_tipi SET NOT NULL;
        
        RAISE NOTICE 'hedef_tipi kolonu başarıyla eklendi!';
    ELSE
        RAISE NOTICE 'hedef_tipi kolonu zaten mevcut.';
    END IF;
END $$;

SELECT 'İskonto tablosu güncelleme tamamlandı!' as message;
