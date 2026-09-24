# Yayın Öncesi Test Kılavuzu

Bu kılavuz yalnızca ayrı test Supabase ortamında uygulanır. Canlı müşteri hesabı, gerçek ödeme bilgisi ve gerçek alıcı iletişim bilgisi kullanılmaz.

## 1. Her çalıştırmada otomatik kontroller

```powershell
npm run test:environment
npm run test:preflight
node .\node_modules\typescript\bin\tsc -b --pretty false
node .\node_modules\eslint\bin\eslint.js .
```

`test:environment`, yanlışlıkla canlı Supabase adresiyle test çalıştırılmasını engeller. `test:preflight` rota, kritik Edge Function ve temel ödeme/yükleme/yetki savunmalarını kontrol eder.

## 2. Test hesapları

| Rol | Amaç | Beklenen yetki |
| --- | --- | --- |
| Ziyaretçi | Giriş yapmadan mağaza kullanımı | Genel katalog dışında hesap, sipariş ve yönetim verisi görmez |
| Müşteri | Kayıt, sepet, hesap ve soru akışları | Yalnızca kendi hesabı ve siparişleri |
| XML müşteri | XML ürün/sipariş akışı | XML siparişi, geçmişi ve kendi fişleri |
| Bayi | Bayi ekranları ve fiyatlar | Yalnızca kendi bayi verileri |
| Yönetici | Tüm yönetim modülleri | Yönetim sayfaları ve onay işlemleri |

Şifreler `.env.test.local` içinde kalır; raporlara veya TestSprite çıktısına yazılmaz.

## 3. Arayüz ve kullanıcı akışları

Her satır masaüstü, 768px, 390px ve 360px görünümünde kontrol edilir.

| Alan | Kontrol |
| --- | --- |
| Ana sayfa ve banner | Kampanya geçişi, ürün bağlantısı, sayfa başında açılma, taşmayan metin/görsel |
| Header ve mobil menü | Logo, arama, sepet, hesap, XML/yönetici bağlantıları, kapanma ve tam kaydırma |
| Ürünler | Arama önerisi, Enter ile arama, kategori/marka filtresi, sonuç/hata durumu |
| Ürün detayı | Görsel, birim/stok/fiyat, sepet ve soru modülü |
| Sepet ve kampanya | Ekleme/silme, stok rezervasyonu, kupon indirimi, giriş zorunluluğu |
| Kayıt/hesap | Alan doğrulama, bekleyen üyelik, giriş/çıkış, yalnızca kendi geçmişi |
| XML müşteri | Ürün/birim seçimi, ad-soyad, geçerli JPG/PNG/WEBP/PDF fiş, geçmiş ve fiş erişimi |
| Bayi | Bayi paneli, satış listesi ve rol dışı erişimin reddi |
| Yönetici | Dashboard, ürün, stok/asorti, kategori, marka, müşteri, bayi, sipariş/kargo, kampanya/banner, iskonto, XML, soru, canlı destek, ayarlar |

Yazma testlerinde `TEST-` ön eki kullanılır; her tur sonunda test ürünleri, siparişleri, fişleri ve hesapları silinir.

## 4. TestSprite güvenli akışları

TestSprite ile yalnızca anonim ve veri değiştirmeyen senaryolar çalıştırılır: ana sayfa, kampanya, ürün listesi/detayı, arama, filtre, mobil menü, iletişim ve boş sepet. Kayıt olma, giriş, fiş yükleme, sipariş gönderme, yönetici güncellemesi ve ödeme TestSprite'a verilmez.

## 5. Güvenlik ve dış servis kontrolleri

- Anonim kullanıcı `/admin`, XML siparişi, bayi paneli ve başka müşterinin sipariş/fişlerine erişememelidir.
- Müşteri rolü kendi `musteri_tipi`, onay veya indirim alanlarını değiştirememelidir.
- Ödeme isteğinde tarayıcıdan gelen fiyat, indirim ve stok değeri değiştirildiğinde sunucu işlemi reddetmeli veya kendi hesabını kullanmalıdır.
- Yüklemeler: izin verilmeyen bucket, MIME/imza uyuşmazlığı, 8 MB üstü dosya ve yetkisiz kullanıcı reddedilmelidir.
- E-posta, kargo, WhatsApp/Telegram ve ödeme yalnızca deneme modunda hata/başarı tepkisi açısından gözlenir; gerçek gönderim veya tahsilat yapılmaz.

## 6. Canlıya çıkış kontrolü

- Alan adı, SSL ve yönlendirmeler doğru.
- Canlı Supabase ortam değişkenleri doğru, servis rolü anahtarı yalnızca Edge Function sırlarında.
- Ödeme sağlayıcısı canlıya alınmadan önce sağlayıcı deneme sonucu onaylı.
- SMTP/gönderici adı ve geri dönüş e-posta adresi doğrulanmış.
- Veritabanı yedeği ve hata izleme erişimi tanımlı.
- Bu kılavuzdaki kritik kontrollerin tamamı geçti; açık hatalar yayın kararında kayda geçmiş.
