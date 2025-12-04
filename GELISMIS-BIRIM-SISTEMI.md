# Gelişmiş Birim Sistemi

## 📋 Genel Bakış

E-ticaret platformunda ürünlerin farklı birimlerde (gram, kilogram, adet) satılabilmesi ve stok yönetiminin hassas bir şekilde yapılabilmesi için gelişmiş birim sistemi oluşturuldu.

## 🎯 Özellikler

### 1. Stok Grubu Sistemi
- **Müşteri**: Sadece müşterilere gösterilir
- **Bayi**: Sadece bayilere gösterilir
- **Hepsi**: Hem müşterilere hem bayilere gösterilir

### 2. Çoklu Birim Desteği
- **Adet**: Sayılabilir ürünler için (örn: 1 adet, 5 adet)
- **Gram**: Ağırlık bazlı ürünler için (örn: 250 gr, 500 gr)
- **Kilogram**: Büyük ağırlıklar için (örn: 1 kg, 5 kg)

### 3. Birim Adedi Sistemi
Her stok kaydı için:
- **Birim Türü**: Ürünün ana birimi (adet/gram/kilogram)
- **Birim Adedi**: Satış birimi miktarı (örn: 250)
- **Birim Adedi Türü**: Satış birimi türü (gram/kilogram)

**Örnek:**
```
Ürün: Baharat
- Birim Türü: gram
- Birim Adedi: 250
- Birim Adedi Türü: gram
→ Gösterim: "250 Gr"
```

### 4. Ondalık Stok Desteği
- Stok miktarları ondalık değer olarak tutulabilir
- Hassas stok takibi (örn: 10.5 kg, 9.75 kg)
- Otomatik birim dönüştürme

### 5. Akıllı Birim Gösterimi
Sistem otomatik olarak en uygun gösterimi seçer:
- 1000 gr → 1 Kg
- 0.5 kg → 500 Gr
- 10.5 kg → 10.5 Kg (10500 Gr)

### 6. Birim Uyumluluk Kontrolü
- Adet sadece adet ile uyumlu
- Gram ve kilogram birbirleriyle uyumlu
- Uyumsuz birimler arası işlem engellenir

## 📁 Dosya Yapısı

### 1. Utility Fonksiyonları
**Dosya:** `src/utils/birimDonusturucu.ts`

```typescript
// Birim dönüştürme
birimDonustur(miktar, kaynakBirim, hedefBirim)

// Stok hesaplama
stokHesapla(mevcutStok, stokBirimi, satilanMiktar, satisBirimi)

// Birim uyumluluk kontrolü
birimUyumluMu(birim1, birim2)

// Akıllı gösterim
akilliBirimGoster(miktar, birim)

// Ondalık stok gösterimi
ondalikStokGoster(stok, birim)

// Birim seçenekleri
getBirimSecenekleri(anaBirim)
```

### 2. Stok Yönetimi Bileşeni
**Dosya:** `src/components/admin/StokYonetimi.tsx`

Admin panelinde ürün bazlı stok yönetimi:
- Stok ekleme/düzenleme/silme
- Birim türü ve adedi seçimi
- Fiyat belirleme
- Stok miktarı güncelleme
- Min. sipariş miktarı ayarlama

### 3. Veritabanı Yapısı

#### urun_stoklari Tablosu
```sql
- id: uuid
- urun_id: uuid
- birim_turu: varchar (adet/gram/kilogram)
- birim_adedi: numeric(10,3) -- Yeni
- birim_adedi_turu: text -- Yeni
- fiyat: numeric
- stok_miktari: numeric(10,3) -- Ondalık destekli
- min_siparis_miktari: numeric
- stok_grubu: text (musteri/bayi/hepsi) -- Yeni
- aktif_durum: boolean
```

#### siparis_urunleri Tablosu
```sql
- id: uuid
- siparis_id: uuid
- urun_id: uuid
- birim_turu: varchar
- birim_adedi: numeric(10,3) -- Yeni
- birim_adedi_turu: text -- Yeni
- miktar: numeric
- birim_fiyat: numeric
- toplam_fiyat: numeric
```

## 🔧 Kullanım Örnekleri

### Örnek 1: Baharat Ürünü (Müşteri ve Bayi Farklı Fiyat)
```
Ürün: Kırmızı Biber
Stoklar:
1. 100 Gram → 10₺ (Stok: 5.5 kg) [Müşteri]
2. 250 Gram → 22₺ (Stok: 3.2 kg) [Hepsi]
3. 1 Kilogram → 75₺ (Stok: 10 kg) [Bayi]
4. 5 Kilogram → 350₺ (Stok: 5 kg) [Bayi]
```

### Örnek 2: Paketli Ürün
```
Ürün: Çay Paketi
Stoklar:
1. 1 Adet → 50₺ (Stok: 100 adet)
2. 5 Adet → 225₺ (Stok: 20 adet)
```

### Örnek 3: Satış Sonrası Stok Güncelleme
```
Başlangıç: 10.5 kg stok
Satış: 250 gr (0.25 kg)
Yeni Stok: 10.25 kg
```

## 🎨 Kullanıcı Arayüzü

### Admin Panel - Stok Yönetimi
1. **Ürünler** sayfasına git
2. Ürünün yanındaki **Stok** butonuna tıkla
3. **Yeni Stok** butonuna tıkla
4. Form doldur:
   - Birim Türü: Gram/Kilogram/Adet
   - Birim Adedi: 250
   - Birim Adedi Türü: Gram/Kilogram
   - Fiyat: 15₺
   - Stok Miktarı: 10.5
   - Min. Sipariş: 1
   - Stok Grubu: Müşteri/Bayi/Hepsi
5. Kaydet

### Ürün Detay Sayfası
- Birimler otomatik gösterilir: "250 Gr", "1 Kg"
- Stok durumu: "10.5 Kg (10500 Gr)"
- Müşteri birim seçer ve sepete ekler

### Sepet Sayfası
- Ürün birimi gösterilir: "250 Gr"
- Miktar artırılabilir
- Toplam hesaplanır

### Sipariş Yönetimi
- Sipariş detayında birimler gösterilir
- Stok otomatik düşer

## 🔄 Birim Dönüştürme Mantığı

### Gram ↔ Kilogram
```typescript
// Gram → Kilogram
1000 gr = 1 kg

// Kilogram → Gram
1 kg = 1000 gr

// Örnek
250 gr = 0.25 kg
1.5 kg = 1500 gr
```

### Adet
```typescript
// Adet sadece adet ile uyumlu
1 adet = 1 adet
// Gram/Kilogram ile dönüştürülemez
```

## ⚠️ Önemli Notlar

1. **Stok Grubu Filtreleme**: Müşteriler sadece "Müşteri" ve "Hepsi" stokları görür, Bayiler sadece "Bayi" ve "Hepsi" stokları görür
2. **Birim Uyumluluğu**: Adet birimi gram/kilogram ile karıştırılamaz
3. **Ondalık Hassasiyet**: Stok miktarları 3 ondalık basamak hassasiyetinde
4. **Minimum Sipariş**: Her stok için ayrı minimum sipariş miktarı belirlenebilir
5. **Aktif/Pasif Durum**: Stoklar aktif/pasif yapılabilir
6. **Fiyat Yönetimi**: Her birim için farklı fiyat belirlenebilir
7. **Farklı Fiyatlandırma**: Aynı üründe müşteri ve bayi için farklı fiyatlar belirlenebilir

## 🚀 Gelecek Geliştirmeler

- [ ] Toplu stok güncelleme
- [ ] Stok uyarı sistemi (kritik seviye)
- [ ] Otomatik birim önerisi
- [ ] Stok geçmişi takibi
- [ ] Excel'den stok aktarımı
- [ ] Barkod entegrasyonu

## 📊 Test Senaryoları

### Test 1: Stok Ekleme
1. Admin panelde ürün oluştur
2. Stok yönetimine git
3. 250 gr birim ekle
4. Fiyat ve stok belirle
5. Kaydet ve kontrol et

### Test 2: Sepete Ekleme
1. Ürün detayına git
2. 250 gr birim seç
3. Miktar belirle
4. Sepete ekle
5. Sepette doğru gösterildiğini kontrol et

### Test 3: Sipariş Oluşturma
1. Sepete ürün ekle
2. Ödeme yap
3. Sipariş oluştur
4. Stok düştüğünü kontrol et
5. Sipariş detayında birim gösterimini kontrol et

## 🐛 Bilinen Sorunlar

Şu anda bilinen sorun bulunmamaktadır.

## 📝 Değişiklik Geçmişi

### v1.2.0 (2024-11-29)
- ✅ Stok azalan ürünler birim bazlı hesaplama eklendi
- ✅ Küçükten büyüğe sıralama düzeltildi
- ✅ Kalan birim sayısı gösterimi eklendi

### v1.1.0 (2024-11-29)
- ✅ Stok grubu sistemi eklendi (müşteri/bayi/hepsi)
- ✅ Stok filtreleme mantığı uygulandı
- ✅ Ürün yönetimi sayfasına stok butonu eklendi
- ✅ Modal stok yönetimi bileşeni entegre edildi

### v1.0.0 (2024-11-29)
- ✅ Gelişmiş birim sistemi oluşturuldu
- ✅ Birim dönüştürme utility'leri eklendi
- ✅ Stok yönetimi bileşeni oluşturuldu
- ✅ Veritabanı migration'ları uygulandı
- ✅ Ürün detay sayfası güncellendi
- ✅ Sepet sistemi entegre edildi
- ✅ Sipariş yönetimi güncellendi

## 📞 Destek

Sorularınız için lütfen geliştirme ekibiyle iletişime geçin.
