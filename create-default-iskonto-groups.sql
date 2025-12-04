-- Varsayılan İskonto Gruplarını Oluşturma
-- Bu SQL'i Supabase SQL Editor'de çalıştırın

-- Müşteri İskonto Grubu (varsayılan)
INSERT INTO fiyat_gruplari (grup_adi, aciklama, indirim_orani, aktif_durum)
VALUES (
  'Müşteri İskonto Grubu',
  'Tüm yeni müşteriler için varsayılan iskonto grubu',
  0,
  true
)
ON CONFLICT DO NOTHING;

-- Bayi İskonto Grubu (varsayılan)
INSERT INTO fiyat_gruplari (grup_adi, aciklama, indirim_orani, aktif_durum)
VALUES (
  'Bayi İskonto Grubu',
  'Tüm yeni bayiler için varsayılan iskonto grubu',
  10,
  true
)
ON CONFLICT DO NOTHING;

-- VIP Müşteri Grubu (örnek)
INSERT INTO fiyat_gruplari (grup_adi, aciklama, indirim_orani, aktif_durum)
VALUES (
  'VIP Müşteri Grubu',
  'Özel müşteriler için yüksek iskonto grubu',
  15,
  true
)
ON CONFLICT DO NOTHING;

-- Başarılı mesajı
SELECT 'Varsayılan iskonto grupları başarıyla oluşturuldu!' as message;

-- Oluşturulan grupları göster
SELECT * FROM fiyat_gruplari ORDER BY created_at;
