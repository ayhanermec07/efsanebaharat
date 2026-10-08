# Efsane Baharat sanatsal tasarım uygulama planı

Kullanıcı tüm onaylanan ve geçici kabul edilen tasarımları, banner animasyonu dahil uygulamayı ve canlıda değerlendirmeyi istedi. Bu belge uygulama kapsamı ve kabul kaydıdır.

## Kapsam ve kararlar

- Header yüksekliği korunur. Altından kısa bir dala bağlı orta yaprak ve küçük yapraklar çıkar. Soluk filtre sembolü tıklanabilir aramayı belirtir; dokununca kısa sallanma olur. Yaprak yerinde kalır, gelişmiş arama yanında açılır. Mobilde altında tam genişlik, iki sütun. Ürün araması yalnız headerdadır; kategori, alt kategori, marka, sıralama ve temizleme korunur.
- Ana sayfada 5 saniyelik sessiz baharat karışma videosu, sonra botanik banner. Aynı sekmede bir kez oynar; Atla, oynatma hatası, yükleme zaman aşımı ve hareket azaltma tercihi botanik görünüme geçirir. Ardından gerçek ve uygun kampanyalar aynı alanda 6 saniyede döner; kampanyasız botanik görünüm kalır.
- Ürün detayında kategoriye özgü üst çizim ve tamamlayıcı alt görsel. İki görsel birbirini tekrar etmez. Ürün resmi tıklanınca büyük açılır; zoom yoktur. Sepete ekleme yalnız sunucu başarısından sonra kısa onay gösterir.
- Kategori bannerları ve detay motifleri yönetimden ayrı seçilir. Boş seçim üst kategoriden miras; `plain` mirası kapatır. Başlık kök kategoriyi korurken alt kategori tema tercihi uygulanır.
- Liste kartları krem yüzey, ince çerçeve, gerçek ürün fotoğrafı ve hizalı bilgiler içerir. Kartta dekoratif motif bulunmaz. Asorti çoksa fiyatlı, kaydırılabilir zarif dropdown; tek seçenek statik. Stok kimliği ve güncel fiyatlar kullanılır.
- Kampanya kuponu, boş sepetin keten kesesi, iletişimin açık/kapalı zarfı, hesabın paket görünümü, çok satanların küçük motifi ve botanik footer uygulanır. Gerçek iletişim, sipariş, havale, kargo ve kupon akışları korunur.

## Sanat aileleri

| Tema | Üst / alt yapı |
|---|---|
| Baharat | Çizimsel karışık baharatlar / gerçekçi baharat kompozisyonu |
| Yağ | Zeytin dalından düşen damlalar / yağ ve zeytin kompozisyonu |
| Sabun | Bitkisel çizim / sabun kompozisyonu |
| Lokum | Şekerci kâğıdı / lokum kompozisyonu |
| Bitki suyu | Bitki çizimi / bitki suyu kompozisyonu |
| Macun | Bitkisel çizim / macun kompozisyonu |
| Esans | Esans çizimi / şişe kompozisyonu |
| Gıda boyası | Kıvrımlı, kalınlaşan renk çizgileri / renkli krema tabağı |
| Krem | Çizimsel bitkisel yapı / krem kompozisyonu |
| Pekmez | Çizimsel bitkisel yapı / pekmez kompozisyonu |
| Sirke | Çizimsel meyve yapısı / sirke kompozisyonu |
| Şampuan | Çizimsel bitkisel yapı / şampuan kompozisyonu |
| Tuz | Çizgisel tuz akışı / ayrı tuz tabağı; akış tabakla birleşmez |

ORİKA sade bırakılır. Tuz, lokum, canlı verili alanlar ve diğer geçici kabul edilen tasarımlar ilk yayına dahildir; sonraki revizyon ayrıca değerlendirilir.

## Uygulama ve yayın sırası

1. Ortak görselleri üret; şeffaf WebP atlaslarına dönüştür. Videosu 120 gerçek kare / 24 fps / 5 saniye olarak kodlanır; masaüstü ve mobil ayrı dosyadır.
2. Kategori alanlarını nullable migration ile ekle; yalnız tanınan kategorilerin boş tema alanlarını doldur. RLS, satış veya ödeme kurallarını değiştirme. `public-catalog` meta alanlarını güncelle.
3. Yaprak, kategori bannerı, ürün detayı ve kartları bağla; yardımcı sayfaları tamamla.
4. Birim kontrolleri, TypeScript, ESLint, üretim build; 360/390/768/1440 px tarayıcı kabulü. Gerçek video süresi ve oynatma, hata geri dönüşü, hareket azaltma, URL filtreleri, dropdown klavyesi ve modal odağı doğrulanır.
5. Bağımsız kod incelemesi; önemli bulguları kapat. Commit/push sonrası yalnız iki sanat migrationı ve katalog fonksiyonunu uygula, frontend kesin commit ile yayınlanır. Canlı kabul sağlıklı yayın ve gerçek kategori/ürün verisiyle yapılır.
6. Bilgi bankası ve bu kayıtta gerçek yayın durumunu güncelle. Canlı yayın gerçekleşmeden tamamlandı denmez.

## Doğrulama kaydı

- Birim paketi: 85/85 geçti.
- Kategori tarayıcı paketi: 44 geçti, 4 mevcut koşullu test atlandı.
- Sanatsal arayüz paketi: 28/28 geçti; dört ekran genişliği, gerçek atlas yüklemesi.
- Bağımsız incelemenin alt kategori tema override bulgusu düzeltildi; 8/8 özel tarayıcı testi geçti.
- Gerçek video tarayıcı kabulü: 8/8 geçti; 390/1440 px gerçek 5 saniye oynatma, 350 ms geçiş, sabit alan yüksekliği, kampanya döngüsü, atlama/oturum/hareket azaltma/hata geri dönüşü.
- TypeScript ve tam ESLint temiz. Son CSS dahil üretim build geçti. SQL migrationları kaynak incelemesinden geçti; veritabanında henüz uygulanmadı.
- Canlı yayın erişim bekliyor: açık Coolify oturumu yok, bulunan üç eski SSH anahtarı üretim sunucusunda kabul edilmedi. Kullanıcıdan erişim yolu istendi. Mevcut canlı sürüm değiştirilmedi.

## Çalışma kaydı

Frontend/backend ayrı Git depolarında `design/artistic-storefront-20261008` izole çalışma ağacı kullanıldı. Bağımsız kart, kategori ve yardımcı sayfa işleri mevcut paralel ajanlarla yürütüldü; kök uygulama ve yayın koordinasyonunu yaptı. Görseller `public/artwork/` içindedir; üretim sitesinin geçici Codex dosyalarına bağımlılığı yoktur. Yeni çalışma zamanı bağımlılığı eklenmedi.
