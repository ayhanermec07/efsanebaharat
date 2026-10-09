# Onaylanan tasarımlara uygunluk denetimi — 8 Ekim 2026

## Bulgu ve düzeltme

İlk uygulama, onaylanan taslakların yerine yeniden üretilmiş motif atlasları kullanıyordu. İşlev testleri bu görsel farklılığı yakalamamıştı. Bu atlaslar kaldırıldı. 22 onaylı kaynak dosya kayıpsız WebP olarak projeye eklendi; kaynak PNG ile tarayıcıda açılan WebP'nin her RGBA pikseli ve kaynak SHA-256 değeri karşılaştırıldı. 22/22 eşleşti. Makineye bağlı geçici dosya yolları üretim uygulamasında kullanılmaz.

`approved-source-verification.json` kaynak kimliklerini ve doğrulama sonucunu, `scripts/approved-artwork-sources.json` ise gösterilecek motif bölgelerini kaydeder. `ApprovedArtwork` bu bölgeleri SVG üzerinden gösterir. Taslaklardaki örnek metinler ve düğmeler arayüze resim olarak taşınmaz; gerçek metinler, formlar, fiyatlar ve eylemler HTML olarak çalışır. Motifleri yeniden çizme veya başka bir görselle değiştirme yapılmadı. Uyumlu kenar geçişleri CSS maskeleriyle sağlanır.

## Kararların uygulamadaki karşılığı

| Onay | Uygulama / kontrol |
|---|---|
| Header'ı büyütmeyen kısa dal, orta yaprak ve küçük yapraklar | Özgün üç yapraklı motif; header altına sabitlenir. Soluk filtre sembolü kaynak görselin kendi sembolüdür. |
| Dokununca küçük sallanma, yaprak aşağı inmez | 400 ms tek sallanma; açılış öncesi/sonrası tetikleyici koordinatları test edilir. Hareket azaltma desteklenir. |
| Yaprağın yanında, yaklaşık yaprak yüksekliğinde açılan arama | Masaüstünde tek sıra dört seçim + temizleme; 300 ms aşağı açılma. Mobilde kullanılabilir iki sütun panel. Kapalı başlar. |
| Gelişmiş aramada ürün araması kaldırılır | Panelde metin araması yok; tek arama header'dadır. |
| Ürün resmi büyük açılsın, zoom olmasın | Odağı içinde tutan büyük resim penceresi; zoom dönüşümü yok; Escape ile kapanır. |
| Ürüne değil kategoriye özgü motif | 13 tema; bağımsız detay/banner seçimi, üst kategoriden miras, `plain` ile sade görünüm. ORİKA için sade başlangıç eşlemesi. |
| Tamamlayıcı, birbirinin aynısı olmayan üst/alt görseller | Her aile özgün taslaktan ayrı iki bölge kullanır. Yönetici önizlemesinin yanlışlıkla iki üst görsel göstermesi de düzeltildi. |
| Yağ | Üstte zeytin dalından yağ damlaları; altta yağ kâsesi. |
| Sabun | Üstte bitki, su ve köpük çizimi; altta kumaş üzerindeki sabun. |
| Baharat | Üstte sarkan karabiber dalı ve karışık baharat çizimi; altta kaşıkla baharat kompozisyonu. |
| Lokum — geçici kabul | Üstte desenli şekerci kâğıdı; altta lokum tabağı. |
| Bitki suyu / macun / esans | Sırasıyla damlalı dal–su kabı, otlu havan–macun kaşığı, çiçek–esans şişesi özgün çiftleri. |
| Gıda boyası | İşaretlenen yönde kıvrımlı renk çizgileri; altta üç renk krema tabağı. |
| Krem / pekmez / sirke / şampuan | Özgün bitkisel çizim–krem, üzüm dalı–pekmez, meyve dalı–sirke, saç çizgileri–şampuan çiftleri. |
| Tuz — geçici kabul | Çizgisel akış ve ayrı tabak. Akış görseli tabakla birleştirilmez. |
| Ana sayfa intro ve botanik son görünüm | Onaylı fotoğraf kompozisyonundan 120 kare / 24 fps / 5 saniyelik hareketli WebM; ardından özgün botanik dallar ve baharat kâsesi. Başlık “Sofranıza her zaman lezzet”. Atla, hata geri dönüşü, sekme oturumu ve hareket azaltma korunur. |
| Kupon / boş sepet / iletişim / hesap / çok satanlar / footer | Özgün kupon baharatı, açık keten kese, açık/kapalı zarf, çizimsel paket, küçük baharat motifleri ve botanik ayırıcı/köşeler. Başarı durumları gerçek işlem sonucuna bağlı kalır. |
| Motifsiz ürün kartı ve zarif asorti dropdown | Gerçek ürün fotoğrafı; dekoratif motif yok. Çoklu seçenek fiyatlı ve kaydırılabilir dropdown; tek seçenek statik. 30 seçenekle klavye ve ekran sınırı testi. |
| Şimdilik onaylananlar da ilk sürüme girsin | Tuz/lokum ve yardımcı alanlar dahil tutuldu; yeniden değerlendirme sonraki kullanıcı kararına bırakılır. |

Kategori şeridi gibi taslak çevresinde görünen, ayrı kapsam olarak onaylanmamış veya önceki açık kararla kaldırılmış öğeler geri eklenmedi. Ürün adları, fiyatlar ve örnek stok sayıları taslak görsellerden kopyalanmadı.

## Doğrulama sınırı

Görsel ve etkileşim kabulü 360, 390, 768 ve 1440 px yerel tarayıcıda yürütülür. Testlerde kontrollü katalog/sipariş yanıtları kullanılır; bu, canlı veritabanı veya gerçek müşteri siparişi kabulü değildir. Kaynak dosyanın piksel eşitliği, tüm sayfanın taslakla piksel piksel aynı olduğu anlamına gelmez: gerçek ürün metni, ekran genişliği, erişilebilir kontroller ve içerik uzunluğu yerleşimi etkiler.

**Canlı yayın yapılmadı.** Tasarım dalındaki frontend düzeltmeleri hazır olduğunda backend'in bekleyen sanat migrationları ve katalog fonksiyonu, ardından frontend yayınlanmalıdır. Önceki turdaki Coolify/SSH erişim engeli sürüyor. Canlı veride kategori eşleşmesi ve son görsel kabul yayın sonrasında ayrıca doğrulanmalı; bu aşama tamamlanmış sayılmaz.

## 9 Ekim son karşılaştırması

Önceki tasarım sohbetindeki kullanıcı seçimleri tekrar okundu. Özgün 22 dosyanın kaynak hash ve RGBA eşitliği yeniden 22/22 doğrulandı. Bağımsız incelemede belirlenen eksikler tamamlandı:

- Ana sayfa ve çok satanlar sayfasındaki başlıklar artık iki yan motifi de kullanır. Ürün kartları ilk görünümde 60 ms aralıklarla hafifçe yükselir; tamamlanan hareket aynı rafta sayfalama sırasında yeniden başlamaz.
- Gerçek video zamanı sloganı 1. saniyeden sonra görünür kılar; 3–5. saniyeler arasında video ve slogan çekilerek botanik görünüm belirir. Kaynak fotoğraf korunur; taneler ayrı hareket eder. Kaşık ayrıca hareketlendirilmiş bir nesne değildir.
- Yaprak 400 ms boyunca 4° → −2° → 0° sallanır; hareket azaltmada kısa ton geri bildirimi vardır. Sepet simgesi kısa basma hareketi yapar; başarılı sunucu yanıtından sonra ✓ Eklendi bildirimi yaklaşık 1,5 saniye kalır.

9 Ekim doğrulamaları: 85/85 birim testi, 44/44 geniş mağaza kabulü, son düzeltmeler için 12/12 yaprak/çok satanlar kabulü, 24/24 ana sayfa/video kabulü ve 4/4 bağımsız yönetici tema kaydı. Ekranlar 360/390/768/1440 px; kontrollü ağ yanıtları kullanılır. TypeScript ve tam ESLint temizdir. Video dosyası yeniden kodlanırken eşzamanlı okuyan ilk zamanlama testindeki tek geçici hata, kodlama tamamlandıktan sonra 24/24 tam tekrar ile giderildi.

Kullanıcı Coolify güvenlik değişikliği nedeniyle **yalnız Git gönderimi** istedi. Tasarım dalı `design/artistic-storefront-20261008`; canlı site, main ve mevcut yayın dalı bu görevde değiştirilmez. Backend kodu `72fea1d` olarak aynı adlı uzak dalda mevcuttur; canlı migration/katalog/frontend kabulü bu Git doğrulamasına dahil değildir.
