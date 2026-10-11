# Onaylı tasarımlara uygunluk denetimi — 11 Ekim 2026

## Karşılaştırma ve düzeltmeler

Referanslar `public/artwork/approved/` altındaki onaylı taslaklar ve ana uygulama planıdır. Taslak üzerindeki örnek metin, fiyat ve form alanları yerine gerçek ürün ve hesap verileri kullanılır. Şeffaf görseller 10 Ekim'de kabul edilen alfa PNG türevleridir; bu turda yeni motif üretilmedi.

| Alan | Karşılaştırma / sonuç |
|---|---|
| Yapraklı arama | Kısa dal, orta/küçük yapraklar, soluk filtre işareti ve dokunma sallanması korunur. Açılışta yaprak konumu sabit. Masaüstünde yanında kompakt panel; mobilde aşağıda. Tek ürün araması headerda. |
| Ana sayfa | 5 saniyelik sessiz baharat videosu → botanik banner, Atla ve hareket azaltma korunur. Başlık yanları şeffaf PNG. |
| Ürün kartı | Dekoratif motif yok. Çoklu asorti fiyatlı dropdown, tekli seçenek statik. 30 seçenek ve klavye kontrolü doğrulanır. |
| 13 ürün ailesi | Üst çizim ve tamamlayıcı alt PNG ayrı. Alt motif metadata sonundan satın alma kontrollerinin yanına taşındı (mobilde altına). Tuz akışı tabakla birleşmez. Gıda boyasında dalgalı renk çizgileri; yağda zeytinden damlalar korunur. Büyük ürün görselinde zoom yok. |
| Kupon | Küçük rozet düzeni yerine kiremit kenar şeridi, sağ üst bitkisel motif, açıklama, ayrı kod ve geniş kopyalama düğmesi. Başarı yalnız clipboard başarılıysa. |
| İletişim | Zarf formun üstünden başlığın sağına taşındı. Başarıda ortada kapalı zarf. Başarısız mesaj korunur; oturum, konu/mesaj ve satıcı bilgileri korunur. |
| Hesap / sipariş | Paket başlıktaki küçük ikon yerine sağ üstte büyük tamamlayıcı motif. Sipariş kalemlerinde gerçek ürün küçük resmi; toplamın ardından belge ve iade işlemleri. Profil/havale/kargo akışları korunur. |
| Boş sepet | Onaylı keten kese daha büyük, merkezde ferah düzen ve keşfet bağlantısı. |
| Çok satanlar | Motifler sayfa uçlarından başlığa yaklaştırıldı, kısa kiremit alt çizgi. Sayfa doğrudan açıldığında eksik kalan stil importu düzeltildi. |
| Footer / ayırıcılar | Önceki düzeltmedeki Keşfet–Yardım–Hesabım, baharat kâseli marka, köşe motifleri ve ayırıcı çizgileri korunur. Gerçek alfa PNG, maske/zemin karıştırma yok. Yasal ve satıcı bilgilerine erişim korunur. |

## Yayın ayrımı

11 Ekim canlı ürün sayfası tarayıcıda açılarak kontrol edildi: 917 ürün geliyor, yapraklı filtre ve motifsiz kartlar mevcut. Fakat hâlâ eski Alışveriş–Hesap–Yardım footer'ı ve eski SVG motif sunumu var. Önceki yenilemede `index-CFqP2sSo.js` gözlendi. Dolayısıyla `4562dbb` ve bu düzeltmenin canlıda olduğu söylenemez. Bu çalışma Git düzeltmesidir; Coolify dağıtımı yapılmadı. Canlıda aktif kampanya listesi boş olduğundan kupon, oturum gerektiren sipariş/iletişim ve hata durumları kontrollü yerel verilerle sınandı; canlıya mesaj/sipariş gönderilmedi.

10 Ekim'de kategori şeması migrationları ayrı katalog düzeltmesiyle canlıya uygulanmıştır. Eski plandaki “migration bekliyor” kayıtları tarihsel kabul edilmelidir.

## Kanıt ve sınırlar

Dört genişlik: 360, 390, 768, 1440 px. Yerel görsel kanıtlar workspace kökünde `audit/2026-10-11/design-fidelity/` altında. Referans taslakların resimleri yerine gerçek HTML kontrolleri kullanılır; birebir piksel eşliği iddia edilmez. Hesapta mevcut profil/ödeme/iadeye ilişkin ek kontroller, taslaktaki sade örnekten daha fazla içerik oluşturur.

Bağımsız inceleme işlevsel/güvenlik regresyonu bulmadı. Sipariş kartının açılmış iade formu ayrıca görüntülendi. Nihai test sonuçları aşağıda kaydedilir.

## Nihai doğrulama

- TypeScript, tam ESLint ve üretim build başarılı; legacy lint hatası yok. 85/85 birim testi geçti.
- Sanatsal mağaza: 52 senaryonun ilk turunda 49 geçti; üç genişlikte çok satanlar başlık stil yüklemesi düzeltildi. İlgili başlık/sipariş son turu 8/8, iletişim son turu 4/4 geçti. İlk turdaki diğer senaryolar (13 aile × dört genişlik, yaprak, dropdown, büyük görsel, kategori, kupon, footer, boş sepet) geçti.
- Hesap testindeki Hesabım başlığı footer ile çakıştığı için h1 olarak daraltıldı. Açılmış iade alanı dört genişlikte yeniden doğrulandı; ekran yüksekliği yalnız görsel kanıtın tamamını alabilmek için artırıldı.
- Ana sayfa 24 senaryo: ilk tur 23 başarılı; tek testin trace dosyası başka test çıktılarının temizlenmesiyle kayboldu. Aynı senaryo ayrı çalıştırmada geçti (1/1); video süresi, slogan/geçiş, kampanyasız görünüm, atlama, oturum ve hareket azaltma doğrulandı.
- İşletme/yasal/checkout regresyonu: 44/44 geçti. Canlı işlem oluşturulmadı.
