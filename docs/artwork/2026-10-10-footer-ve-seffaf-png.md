# Footer referansı ve şeffaf PNG düzeltmesi — 10 Ekim 2026

## Kullanıcı isteği

Footer, kullanıcının ilk onayladığı `codex-clipboard-b5aff995-6f8c-4aff-b0b7-39c590ed6da9.png` taslağındaki yerleşime döndürüldü: iki yanında ince çizgi bulunan yıldız anason ayırıcı, solda botanik baharat kâsesi/marka/slogan, Keşfet–Yardım–Hesabım sütunları ve alt köşe süslemeleri. Geniş adres ve açıklama bloğu ana kompozisyondan çıkarıldı. Mevcut yedi yasal bağlantı ve satıcı bilgileri alt satırdaki klavyeyle kullanılabilir Yasal bilgiler açılır bölümünde korunur. Referanstaki kullanım koşulları için yeni bir hukuki metin uydurulmadı; Sıkça Sorulan Sorular bağlantısı mevcut İşlem Rehberi'ne gider.

## Görseller ve kaynaklar

- `public/artwork/transparent/`: 42 gerçek alfa kanallı PNG. Footer, yaprak, başlık motifleri, ayırıcılar, kategori/banner köşeleri, yardımcı sayfa çizimleri ve 13 kategori ailesinin üst/alt motifleri.
- Yerleşimler HTML/CSS olarak kalır; yazılar ve ürün bilgileri görsellere gömülmez.
- Şeffaflık için `mix-blend-mode` veya kenar maskesi kullanılmaz. Eski SVG kırpma bileşeni kaldırıldı. Yöneticinin kendi fotoğraf banner'ı ve intro videosu bu dekoratif PNG grubundan ayrıdır.
- Kaynak taslaklar yerleşim ve motif kimliği referansı olarak kullanıldı. Dahili ImageGen ile arka plan temizlenmiş üretim varlıkları hazırlandı (`transparent_background: true`). Bunlar düzenlenmiş türevlerdir; eski arşiv kaynaklarının 22/22 piksel eşitliği bu PNG'lerin özgün çizimlerle birebir piksel eşitliği olduğu anlamına gelmez.
- İstem özeti: Referanstaki yalnız dekoratif çizimleri, özgün renk ve çizim üslubunu koruyarak ayır; metin, arayüz, krem kâğıt ve çevre arka planını kaldır; üst/alt veya sol/sağ motifleri ayrı, gerçek şeffaf RGBA zemin üzerinde üret. Ana sayfa için yalnız son botanik banner'ın iki köşesi kullanıldı.
- `scripts/transparent-artwork-inputs.json` kaynak çıktı dosya adlarını, kesim bölgelerini ve boyut sınırlarını kaydeder. Yerel kaynak klasörü komut argümanıdır, uygulamanın geçici dosyalara bağımlılığı yoktur.
- `prepare-transparent-artwork.mjs <generated-PNG-directory>` yalnız varlık ayırma, kenar boşluğu kırpma ve ölçekleme yapar; arka plan temizleme ImageGen tarafından yapılmıştır. En büyük boyut kategori motiflerinde 720, yardımcı çizimlerde 600, yaprakta 256, hero köşelerinde 900 pikseldir.

## Doğrulama

- TypeScript, tam ESLint ve üretim derlemesi başarılı; yeni lint hatası yok.
- 52 mağaza senaryosu: ilk koşuda 48 geçti; SVG yerine PNG gelmesini beklemeyen eski görsel sayısı kontrolü düzeltildi. İlgili kategori ve footer tekrarında 8/8 geçti.
- Ana sayfa/video 24 senaryosu: 23 geçti; bir 390 px koşusu tarayıcı kapanışındaki kayıp trace dosyası nedeniyle hata verdi. Aynı senaryo bağımsız tekrarında geçti.
- Yasal bilgiler 44/44; bağımsız yönetici tema önizlemesi/kaydı 4/4 geçti.
- 360, 390, 768 ve 1440 px görünümde yatay taşma yok. Mobil footer'ın son bağlantısı, iki köşe motifi ve telif satırı tarayıcıda ayrıca görüldü; ilk kesik ekran görüntüsü, ekran görüntüsü alma alanından kaynaklanıyordu.
- 42 PNG'nin tamamı tarayıcıda açıldı; dört köşedeki alfa sıfır, anlamlı şeffaf alan ve görünür çizim pikselleri doğrulandı. Açık/koyu zeminli dört görsel sayfası gözle incelendi. `review-transparent-artwork.mjs` kontrolü yeniden çalıştırabilir.
- `review-footer.mjs` yerel 4197 sunucusunda dört genişlikte footer görüntüsü ve farklı zeminlerde ayırıcı önizlemesi üretir.

Bu kayıt kaynak kod ve yerel kabul içindir; bu görevde Coolify üzerinden canlı dağıtım yapılmadı ve çalışan canlı frontend sürümü doğrulanmadı. 10 Ekim'de başka görevde uygulanan katalog migrationlarının kaydı kök bilgi bankasındadır.
