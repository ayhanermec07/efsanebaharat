-- İskonto Debug SQL
-- Bu SQL'i Supabase SQL Editor'de çalıştırarak iskonto durumunu kontrol edin

-- 1. Tüm iskontaları listele
SELECT 
    id,
    iskonto_adi,
    iskonto_tipi,
    hedef_tipi,
    hedef_id,
    hedef_adi,
    iskonto_orani,
    baslangic_tarihi,
    bitis_tarihi,
    aktif,
    CASE 
        WHEN baslangic_tarihi <= CURRENT_DATE AND bitis_tarihi >= CURRENT_DATE THEN '✅ Aktif Tarih'
        WHEN baslangic_tarihi > CURRENT_DATE THEN '⏳ Henüz Başlamadı'
        WHEN bitis_tarihi < CURRENT_DATE THEN '❌ Süresi Dolmuş'
        ELSE '❓ Belirsiz'
    END as tarih_durumu
FROM iskontolar
ORDER BY olusturma_tarihi DESC;

-- 2. Müşteri ve iskonto eşleştirmesi
SELECT 
    m.id as musteri_id,
    m.ad || ' ' || m.soyad as musteri_adi,
    u.email,
    m.fiyat_grubu_id,
    fg.grup_adi,
    i.iskonto_adi,
    i.iskonto_orani,
    i.hedef_tipi,
    i.aktif,
    i.baslangic_tarihi,
    i.bitis_tarihi
FROM musteriler m
LEFT JOIN auth.users u ON m.user_id = u.id
LEFT JOIN fiyat_gruplari fg ON m.fiyat_grubu_id = fg.id
LEFT JOIN iskontolar i ON (
    (i.hedef_tipi = 'musteri' AND i.hedef_id = m.id) OR
    (i.hedef_tipi = 'grup' AND i.hedef_id = m.fiyat_grubu_id)
)
WHERE m.aktif_durum = true
ORDER BY m.created_at DESC;

-- 3. Bugünün tarihi
SELECT CURRENT_DATE as bugun;

-- 4. Aktif iskontolar (bugün geçerli)
SELECT 
    iskonto_adi,
    hedef_tipi,
    hedef_adi,
    iskonto_orani,
    baslangic_tarihi,
    bitis_tarihi
FROM iskontolar
WHERE aktif = true
    AND baslangic_tarihi <= CURRENT_DATE
    AND bitis_tarihi >= CURRENT_DATE;

-- 5. hedef_tipi kolonu kontrolü
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'iskontolar'
ORDER BY ordinal_position;
