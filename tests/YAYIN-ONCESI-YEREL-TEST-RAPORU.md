# Efsane Baharat — yayın öncesi yerel test raporu

Tarih: 24 Ağustos 2026  
Ortam: yalnızca yerel Supabase ve `127.0.0.1:4173`  
Canlı sistem: başlangıçta değiştirilmedi; onay sonrası uygulama kaydı aşağıdadır

## Sonuç

Yerel yayın öncesi kabul kontrolleri geçti. Canlı ortama geçmeden önce bu
rapordaki Supabase migration'larını canlı projeye uygulamak için ayrıca onay
alınmalıdır.

## Geçen kontroller

- Derleme ve ESLint başarılı.
- Güvenlik ön kontrolü: 6/6 başarılı.
- Yerel `public-catalog` 200 yanıtı veriyor; test ürünleri, kampanya ve arama
  sonuçları görüntüleniyor.
- Ana sayfa, ürün listesi/detayı, Enter ile arama, filtre, kampanya, iletişim,
  boş sepet ve mobil menü Chrome ile doğrulandı.
- 360px, 390px, 768px ve masaüstü görünümünde yatay taşma kontrolü geçti.
- XML ürün akışı, XML siparişi, geçerli fiş, geçmiş, başka müşterinin fişine
  erişim engeli ve hatalı fiş/stok/ad-soyad reddi doğrulandı.
- Normal müşteri XML ekranına erişemiyor; XML rolü kendi verisini görüyor.
- Bayi, müşteri ve yönetici rol sınırları yerel API üzerinden doğrulandı.
- Yönetici ekranlarının tamamı açılıp veri yükledi: dashboard, ürün, kategori,
  marka, sipariş, kargo, bayi, bayi satışları, müşteri, iskonto, XML, asorti
  stok, ayarlar, kampanya, soru ve canlı destek.
- Yönetici yazma testleri geçti: bayi oluşturma, ürün güncelleme, kategori
  oluşturma ve kampanya güncelleme.
- Normal müşteri kampanya yazmayı RLS ile yapamıyor.

## Bu turda düzeltilenler

1. Yönetici kullanıcının bayi ekranına erişmesini engelleyen tablo izni.
2. Yönetici kullanıcının ürün, kategori, marka ve kampanya gibi RLS korumalı
   yönetim tablolarına yazmasını engelleyen PostgreSQL tablo izinleri.
3. Kampanya formunda eksik tarihin ham veritabanı hatası vermesi. Artık kullanıcı
   tarih alanına yönlendirilip anlaşılır uyarı görüyor.
4. XML sipariş fonksiyonunda kullanıcı hatalarının 500 yerine 400/403 dönmesi.

## Dış servis notu

TestSprite'ın dış tüneli bağlantı hatası verdi. Aynı salt-okunur müşteri
senaryoları yerel Chrome otomasyonu ile tamamlandı; bu, uygulama hatası olarak
değerlendirilmedi. Gerçek e-posta, ödeme, kargo ve mesaj bildirimleri bu yerel
turda bilinçli olarak çalıştırılmadı.

## Canlıya geçişten önce

- Canlı Supabase'e sadece onay sonrası migration'ları uygulayın.
- Uygulamayı canlıda yeniden derleyip yayınlayın.
- Ardından yalnızca güvenli kontrolleri yapın: katalog, arama, ürün detayı,
  kampanya ve yetkisiz XML erişim reddi.

## Canlı uygulama kaydı — 25 Ağustos 2026

Kullanıcı onayıyla aşağıdaki güvenli canlı uygulama ve kontroller tamamlandı:

- Yönetici/RLS tablo izinleri ve anonim katalog için güvenlik düzenlemeleri
  canlı Supabase veritabanına başarıyla uygulandı.
- `xml-musteri-siparis` Edge Function güncellendi.
- Canlı katalog 200 yanıtı veriyor; ana sayfa, Enter ile arama, kampanya,
  yönetici paneli ve bayi yönetimi salt-okunur olarak doğrulandı.
- Kimliği olmayan isteğin XML sipariş uç noktasına erişimi 401 ile reddedildi.
