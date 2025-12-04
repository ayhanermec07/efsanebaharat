# Gelişmiş Kampanya Yönetimi Sistemi

## 🎯 Özellikler

### 1. Hedef Grup Seçimi
- **Müşteri**: Sadece müşterilere özel kampanyalar
- **Bayi**: Sadece bayilere özel kampanyalar
- **Hepsi**: Hem müşteri hem bayilere açık kampanyalar

### 2. İskonto Yönetimi
- **Yüzde Bazlı İskonto**: %10, %20, %50 gibi
- **Minimum Sepet Tutarı**: Kampanya için minimum alışveriş tutarı
- **Maksimum İskonto Tutarı**: İskonto üst limiti (opsiyonel)

### 3. Kullanım Tipi
- **Tek Kullanımlık**: Her müşteri sadece 1 kez kullanabilir
- **Çoklu Kullanım**: Sınırsız veya belirli sayıda kullanım

### 4. Kampanya Kodu
- **Opsiyonel Kod**: Kampanya kodu ile özel kampanyalar
- **Otomatik Uygulama**: Kod olmadan otomatik uygulanan kampanyalar

### 5. Tarih Aralığı
- **Başlangıç - Bitiş**: Belirli tarih aralığında geçerli
- **Otomatik Aktivasyon**: Tarih geldiğinde otomatik aktif olur

### 6. Kullanım Takibi
- **Kullanım Geçmişi**: Her kullanım kaydedilir
- **İstatistikler**: Toplam kullanım, toplam iskonto tutarı
- **Müşteri Bazlı Takip**: Hangi müşteri ne zaman kullandı

## 📊 Veritabanı Yapısı

### kampanyalar Tablosu (Güncellenmiş)
```sql
- id: uuid
- baslik: text
- aciklama: text
- baslangic_tarihi: timestamp
- bitis_tarihi: timestamp
- iskonto_yuzdesi: numeric(5,2)          -- YENİ: %10, %20 gibi
- hedef_grup: text                       -- YENİ: musteri/bayi/hepsi
- kullanim_tipi: text                    -- YENİ: tekli/coklu
- min_sepet_tutari: numeric(10,2)        -- YENİ: Minimum sepet tutarı
- max_kullanim_sayisi: integer           -- YENİ: Maksimum kullanım (NULL = sınırsız)
- kampanya_kodu: text UNIQUE             -- YENİ: Kampanya kodu (opsiyonel)
- aktif_durum: boolean                   -- YENİ: Aktif/Pasif
- banner_gorseli: text
- kampanya_tipi: text
```

### kampanya_kullanimlari Tablosu (YENİ)
```sql
- id: uuid
- kampanya_id: uuid (FK)
- musteri_id: uuid (FK)
- siparis_id: uuid (FK)
- kullanim_tarihi: timestamp
- iskonto_tutari: numeric(10,2)
- sepet_tutari: numeric(10,2)
```

## 🎨 Kullanıcı Arayüzü

### Admin Panel - Kampanya Oluşturma

**Temel Bilgiler:**
- Kampanya Başlığı
- Açıklama
- Başlangıç - Bitiş Tarihi
- Banner Görseli

**İskonto Ayarları:**
- İskonto Yüzdesi (%)
- Minimum Sepet Tutarı (₺)
- Kampanya Kodu (opsiyonel)

**Hedef Kitle:**
- ○ Müşteriler
- ○ Bayiler
- ○ Hepsi

**Kullanım Ayarları:**
- ○ Tek Kullanımlık
- ○ Çoklu Kullanım
  - Maksimum Kullanım Sayısı (boş = sınırsız)

**Durum:**
- ☑ Aktif

### Müşteri/Bayi Paneli - Kampanya Kullanımı

**Sepet Sayfası:**
1. Kampanya kodu giriş alanı
2. "Uygula" butonu
3. İskonto hesaplama
4. Toplam tutar güncelleme

**Otomatik Kampanyalar:**
- Kod gerektirmeyen kampanyalar otomatik uygulanır
- Sepet tutarı minimum tutarı geçtiğinde aktif olur

## 📝 Kullanım Senaryoları

### Senaryo 1: Müşterilere Özel %20 İndirim
```
Başlık: "Hoş Geldin İndirimi"
İskonto: %20
Hedef Grup: Müşteri
Kullanım: Tek Kullanımlık
Min. Sepet: 100₺
Kampanya Kodu: HOSGELDIN20
Tarih: 01.12.2024 - 31.12.2024
```

**Sonuç:**
- Sadece müşteriler görebilir
- Her müşteri 1 kez kullanabilir
- 100₺ üzeri alışverişlerde geçerli
- HOSGELDIN20 kodu girilmeli

### Senaryo 2: Bayilere Toplu Alım İndirimi
```
Başlık: "Toplu Alım Fırsatı"
İskonto: %15
Hedef Grup: Bayi
Kullanım: Çoklu
Min. Sepet: 500₺
Kampanya Kodu: -
Tarih: 01.12.2024 - 28.02.2025
```

**Sonuç:**
- Sadece bayiler görebilir
- Sınırsız kullanım
- 500₺ üzeri alışverişlerde otomatik uygulanır
- Kod gerekmez

### Senaryo 3: Yılbaşı Kampanyası (Herkese)
```
Başlık: "Yılbaşı Özel %25"
İskonto: %25
Hedef Grup: Hepsi
Kullanım: Tek Kullanımlık
Min. Sepet: 200₺
Kampanya Kodu: YILBASI25
Tarih: 25.12.2024 - 05.01.2025
```

**Sonuç:**
- Hem müşteri hem bayi kullanabilir
- Her kullanıcı 1 kez kullanabilir
- 200₺ üzeri alışverişlerde geçerli
- YILBASI25 kodu girilmeli

## 🔄 İş Akışı

### Kampanya Oluşturma
1. Admin kampanya oluşturur
2. Hedef grup, iskonto, tarih belirler
3. Kampanya kodu oluşturur (opsiyonel)
4. Aktif duruma getirir

### Kampanya Kullanımı
1. Müşteri/Bayi sepete ürün ekler
2. Kampanya kodu girer (varsa)
3. Sistem kontrol eder:
   - Kampanya aktif mi?
   - Tarih aralığında mı?
   - Hedef gruba uygun mu?
   - Minimum sepet tutarı geçildi mi?
   - Daha önce kullanıldı mı? (tek kullanımlık ise)
   - Maksimum kullanım aşıldı mı?
4. İskonto uygulanır
5. Sipariş tamamlanır
6. Kullanım kaydedilir

### Kampanya Takibi
1. Admin kampanya detayına girer
2. Kullanım istatistiklerini görür:
   - Toplam kullanım sayısı
   - Toplam iskonto tutarı
   - Kullanıcı listesi
   - Kullanım tarihleri

## 🎯 Validasyon Kuralları

### Kampanya Oluşturma
- ✅ Başlık zorunlu
- ✅ İskonto yüzdesi 0-100 arası
- ✅ Başlangıç tarihi < Bitiş tarihi
- ✅ Kampanya kodu benzersiz (varsa)
- ✅ Minimum sepet tutarı >= 0

### Kampanya Kullanımı
- ✅ Kampanya aktif olmalı
- ✅ Tarih aralığında olmalı
- ✅ Hedef gruba uygun olmalı
- ✅ Sepet tutarı >= Minimum tutarı
- ✅ Tek kullanımlık ise daha önce kullanılmamış olmalı
- ✅ Maksimum kullanım aşılmamış olmalı

## 📊 Raporlama

### Kampanya Performansı
- Toplam kullanım sayısı
- Toplam iskonto tutarı
- Ortalama sepet tutarı
- En çok kullanan müşteriler
- Günlük/Haftalık/Aylık kullanım grafiği

### Müşteri Bazlı Rapor
- Hangi müşteri hangi kampanyaları kullandı
- Toplam kazanılan iskonto
- Kullanım tarihleri

## 🚀 Gelecek Geliştirmeler

- [ ] Ürün bazlı kampanyalar
- [ ] Kategori bazlı kampanyalar
- [ ] Marka bazlı kampanyalar
- [ ] Kademeli iskonto (100₺ üzeri %10, 200₺ üzeri %15)
- [ ] Hediye ürün kampanyaları
- [ ] Kargo bedava kampanyaları
- [ ] Otomatik kampanya önerileri
- [ ] A/B test desteği

---

**Oluşturulma Tarihi:** 29 Kasım 2024  
**Versiyon:** 2.0.0  
**Durum:** Geliştirme Aşamasında
