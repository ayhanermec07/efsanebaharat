# Anadolu Aktarı Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task. Kullanıcı tasarımı doğrudan uygulamayı istedi; çalışma bu oturumda yürütülür.

**Goal:** Onaylanan Anadolu Aktarı görünümünü bütün mevcut mağaza, hesap, bayi/XML ve yönetim ekranlarına uygulamak.

**Architecture:** Mevcut Tailwind ve CSS değişkenleri ortak görsel sözlüğü sağlar. Header, footer, ürün kartı ve ana sayfa tasarıma göre uyarlanır; diğer ekranların ortak renk/form/buton stilleri mevcut sınıfları üzerinden tutarlı olur. İş kuralları korunur.

**Tech Stack:** React, TypeScript, Tailwind, lucide-react, mevcut Node testleri ve Playwright.

**Spec:** `docs/superpowers/specs/2026-09-30-anadolu-aktari-design.md`

## Global Constraints

- 360, 390, 768 px ve masaüstü; body düzeyinde yatay kaydırma yok.
- Auth, fiyat, stok, kampanya, ödeme ve sunucu yetkilendirmesi mevcut akışlarını korur.
- Yeni bağımlılık veya backend değişikliği gerekmez.
- Source Serif 4 / DM Sans, krem/yeşil/kiremit palet, 12 px köşeler.
- TypeScript, ESLint ve görsel kabul doğrulanır; bilgi bankası Türkçe güncellenir.

## Review Focus

- Eski kaydedilmiş tema yeni görünümü yükleme sonrasında geri çevirmemeli.
- Açık/koyu yüzeylerde yazı, ikon, hata ve durumlar okunmalı.
- Mobil header uzun marka adıyla taşmamalı; menü Escape/Tab ve odak iadesini korumalı.
- Gerçek ürün görselleri kırpılmadan, eksik görseller dürüst boş durumla görünmeli.
- Bayi/XML/admin erişimleri ve ödeme sonucu doğrulaması yalnız görsel değişiklik almalı.

### Task 1: Ortak tema ve görsel temeller

**Files:** `src/lib/theme.ts`, `src/contexts/ThemeContext.tsx`, `src/index.css`, `tailwind.config.js`, `index.html`, `public/manifest.webmanifest`, `tests/theme.test.mjs`.

**Interfaces:** `ThemeSettings`, `defaultTheme`, `normalizeTheme(value)`, `colorForWhiteText(color)`, `THEME_DESIGN`; mevcut ThemeProvider API'si korunur.

- [x] Mevcut tema varsayılanını sınayan Node testini yazıp eski palet nedeniyle başarısız olduğunu doğrula: `node --test tests/theme.test.mjs`.
- [x] Tema normalizasyonunu küçük saf modüle taşı. `normalizeTheme` yalnız yeni tasarım kimliği taşıyan kayıtlarda renk özelleştirmelerini okur; diğerlerinde onaylı varsayılanı kullanır. Kaydetme aynı tasarım kimliğini ekler.
- [x] CSS tokenları, yerel yazı tipleri, Tailwind nötr/marka tonları, odak ve hareket tercihlerini uygula. HTML/manifest tema renklerini eşitle.
- [x] `node --test tests/theme.test.mjs` çalıştır; beklenen: bütün testler geçer.

### Task 2: Mağaza kabuğu ve temel etkileşimler

**Files:** `Header.tsx`, `Footer.tsx`, `Layout.tsx`, `UrunKart.tsx`, `CanliDestekWidget.tsx`, `main.tsx`, `tests/e2e/guest-store.spec.ts`.

**Interfaces:** Aynı auth/sepet/arama/catalog çağrıları ve mevcut rota bağlantıları.

- [x] Playwright'a header araması, yeni görsel tema, menü odak döngüsü ve Escape/odak iadesi kabulünü ekle; eski görünümde başarısız olduğunu doğrula.
- [x] Mevcut gerçek logo ve site bilgileriyle header/footer kur. Mevcut `AccessibleModal` davranışına uygun mobil menü; dokunma ve arama korunur.
- [x] Ürün kartının görselini kare ve `object-contain` yap; gerçek seçili varyant, fiyat ve sepete ekleme sonucu korunur. Ortak buton ve toast yüzeylerini uyumla.
- [x] Ziyaretçi kabulünü 360/390/768/1440 px projelerinde çalıştır; beklenen: geçer ve yatay taşma yok.

### Task 3: Ana sayfa ve bütün sayfalarda tasarım uyumu

**Files:** `AnaSayfa.tsx`, mağaza/hesap/bayi/XML sayfalarının görsel sınıfları, `AdminLayout.tsx`, yönetim sayfalarının görsel sınıfları ve grafik renkleri.

**Interfaces:** Ortak tema sınıfları ve mevcut veri sorguları/işlem fonksiyonları.

- [x] Ana sayfanın kampanyasız durumda onaylı marka başlığını gösterdiğini kabul testine ekle.
- [x] Ana sayfayı metin + gerçek görsel düzenine geçir; kampanya başlığı/açıklaması/hedef bağlantısını ve ürün raylarını koru.
- [x] Bütün rota bileşenlerinin renk/form/buton sınıflarını tarayıp ortak palete uyumla; yönetim kabuğu açık kâğıt yüzeyli, gruplu ve yoğun kalır.
- [x] Yerel müşteri/bayi/admin kabulünü ve tüm rota görsellerini 360/390/768/1440 px kontrol et; beklenen: rol ekranları, tablolar ve modallar kullanılabilir.

### Task 4: Son doğrulama ve dokümantasyon

**Files:** `PROJE_BILGI_BANKASI.md`, bu planın ilerleme kutuları.

- [x] `node .\node_modules\typescript\bin\tsc -b --pretty false`, `node .\node_modules\eslint\bin\eslint.js .`, `npm run build`, ilgili Node ve Playwright kabullerini çalıştır. Başlangıç TypeScript/ESLint temizdir.
- [x] Farkları ayrı kod incelemesine ver; önemli bulguları düzelt ve ilgili kabulü tekrar çalıştır.
- [x] Bilgi bankasının frontend görünüm bölümünü ve değişiklik günlüğünü güncelle; kaynak uygulanması ile canlı dağıtım durumunu ayır.
- [x] Sonuç, testler ve görsel kanıtı kullanıcıya sun. Canlı yayın durumu yalnız doğrulanmışsa değiştirilir.

## Yürütme notları

- Başlangıç commit'i: `6e695fb`; çalışma dizini temiz; `design/anadolu-aktari` dalı mevcut audit çalışmasının üzerine açıldı.
- Kullanıcının doğrudan uygulama isteği nedeniyle tasarım/plan için yeniden onay beklenmez. Kaynak değişiklikleri bu dalda tutulur; ortak dala gönderme veya canlı dağıtım bu planın parçası değildir.
- Görsel değişiklikleri aynalayan birim testleri yerine tema geçişi ve gerçek tarayıcı kullanım kabulleri sınanır.

## Son doğrulama notları

- TypeScript ve ESLint temiz; 37/37 Node testi ve üretim build başarılı.
- Açık mağaza/kayıt/şifre/kampanya/ödeme sonucu/404 sayfaları 320/360/390/768/1440 px testlerinde geçti. Müşteri ve bayi erişimleri aynı genişliklerde doğrulandı.
- Yönetim işlemleri 390/768/1440 px: sipariş onayı, stok iadesi, kargo durumları, kategori/marka/ürün/bayi formları geçti. İlk 360 px soğuk Edge çağrısında mevcut 5 sn test poll sınırı aşıldı; 20 sn sınırına alındı.
- Tüm yönetim rotalarının menüyle taraması 320/360/390 px geçti; 768/1440 px son menü taraması tekrar çalıştırıldı ve geçti. XML sipariş/geçmiş ekranları 360/390/768/1440 px geçti.
- Ayrı incelemenin mobil arama yüksekliği bulgusu giderildi. Gerçek tarayıcıda klasik scrollbar ile 360 px hero taşması ve font CSS adındaki sayı sorunu giderildi.

- Son 360 px yönetim işlem turu 10/10 başarılı. Tüm gereken genişliklerde mağaza, hesap/bayi/XML ve yönetim kontrolleri tamamlandı.
