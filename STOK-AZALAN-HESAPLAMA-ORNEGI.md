# Stok Azalan Ürünler - Hesaplama Örneği

## Birim Bazlı Stok Hesaplama

### Örnek 1: 250 Gr'lık Ürün

**Ürün:** Kırmızı Biber  
**Birim Adedi:** 250 gr  
**Birim Türü:** gr  
**Stok Birimi:** gr

| Stok Miktarı | Hesaplama | Kalan Birim | Durum | Gösterilir mi? |
|--------------|-----------|-------------|-------|----------------|
| 1000 gr | 1000 / 250 = 4 | 4 birim | İyi | ❌ Hayır (≥3) |
| 750 gr | 750 / 250 = 3 | 3 birim | İyi | ❌ Hayır (≥3) |
| 500 gr | 500 / 250 = 2 | 2 birim | Az | ✅ Evet |
| 250 gr | 250 / 250 = 1 | 1 birim | Çok Az | ✅ Evet |
| 100 gr | 100 / 250 = 0.4 | 0.4 birim | Kritik | ✅ Evet |
| 0 gr | 0 / 250 = 0 | 0 birim | Tükendi | ✅ Evet |

### Örnek 2: 1 Kg'lık Ürün (Stok kg cinsinden)

**Ürün:** Karabiber  
**Birim Adedi:** 1 kg  
**Birim Türü:** kg  
**Stok Birimi:** kg

| Stok Miktarı | Hesaplama | Kalan Birim | Durum | Gösterilir mi? |
|--------------|-----------|-------------|-------|----------------|
| 5 kg | 5 / 1 = 5 | 5 birim | İyi | ❌ Hayır (≥3) |
| 3 kg | 3 / 1 = 3 | 3 birim | İyi | ❌ Hayır (≥3) |
| 2.5 kg | 2.5 / 1 = 2.5 | 2.5 birim | Az | ✅ Evet |
| 1.5 kg | 1.5 / 1 = 1.5 | 1.5 birim | Çok Az | ✅ Evet |
| 0.8 kg | 0.8 / 1 = 0.8 | 0.8 birim | Kritik | ✅ Evet |
| 0 kg | 0 / 1 = 0 | 0 birim | Tükendi | ✅ Evet |

### Örnek 3: 100 Gr'lık Ürün (Stok kg cinsinden)

**Ürün:** Kimyon  
**Birim Adedi:** 100 gr  
**Birim Türü:** gr  
**Stok Birimi:** kg

| Stok Miktarı | Dönüştürme | Hesaplama | Kalan Birim | Durum | Gösterilir mi? |
|--------------|------------|-----------|-------------|-------|----------------|
| 1 kg | 1000 gr | 1000 / 100 = 10 | 10 birim | İyi | ❌ Hayır (≥3) |
| 0.5 kg | 500 gr | 500 / 100 = 5 | 5 birim | İyi | ❌ Hayır (≥3) |
| 0.3 kg | 300 gr | 300 / 100 = 3 | 3 birim | İyi | ❌ Hayır (≥3) |
| 0.25 kg | 250 gr | 250 / 100 = 2.5 | 2.5 birim | Az | ✅ Evet |
| 0.15 kg | 150 gr | 150 / 100 = 1.5 | 1.5 birim | Çok Az | ✅ Evet |
| 0.08 kg | 80 gr | 80 / 100 = 0.8 | 0.8 birim | Kritik | ✅ Evet |
| 0 kg | 0 gr | 0 / 100 = 0 | 0 birim | Tükendi | ✅ Evet |

### Örnek 4: 5 Adet'lik Ürün

**Ürün:** Çay Paketi  
**Birim Adedi:** 5 adet  
**Birim Türü:** adet  
**Stok Birimi:** adet

| Stok Miktarı | Hesaplama | Kalan Birim | Durum | Gösterilir mi? |
|--------------|-----------|-------------|-------|----------------|
| 20 adet | 20 / 5 = 4 | 4 birim | İyi | ❌ Hayır (≥3) |
| 15 adet | 15 / 5 = 3 | 3 birim | İyi | ❌ Hayır (≥3) |
| 10 adet | 10 / 5 = 2 | 2 birim | Az | ✅ Evet |
| 5 adet | 5 / 5 = 1 | 1 birim | Çok Az | ✅ Evet |
| 3 adet | 3 / 5 = 0.6 | 0.6 birim | Kritik | ✅ Evet |
| 0 adet | 0 / 5 = 0 | 0 birim | Tükendi | ✅ Evet |

## Durum Renkleri

| Kalan Birim | Durum | Renk | Açıklama |
|-------------|-------|------|----------|
| 0 | Tükendi | 🔴 Kırmızı | Stok tamamen bitti |
| 0 - 1 | Kritik | 🔴 Kırmızı | 1 birimden az kaldı |
| 1 - 2 | Çok Az | 🟠 Turuncu | 1-2 birim arası |
| 2 - 3 | Az | 🟡 Sarı | 2-3 birim arası |
| ≥ 3 | İyi | - | Listede gösterilmez |

## Sıralama

Ürünler **küçükten büyüğe** sıralanır:
1. En kritik ürünler (0 birim) en üstte
2. Kritik ürünler (0-1 birim)
3. Çok az ürünler (1-2 birim)
4. Az ürünler (2-3 birim)

## Kod Mantığı

```typescript
// Stok miktarını birim cinsine çevir
let birimCinsindenStok = stokMiktari

// Eğer stok birimi ile birim türü farklıysa dönüştür
if (stokBirimi === 'kg' && birimTuru === 'gr') {
  birimCinsindenStok = stokMiktari * 1000 // kg'yi gr'a çevir
} else if (stokBirimi === 'gr' && birimTuru === 'kg') {
  birimCinsindenStok = stokMiktari / 1000 // gr'yi kg'ye çevir
}

// Kaç birim kaldığını hesapla
const kalanBirimSayisi = birimCinsindenStok / birimAdedi

// 3 birimden az olanları filtrele
.filter(stok => stok.kalan_birim_sayisi < 3)

// Küçükten büyüğe sırala
.sort((a, b) => a.kalan_birim_sayisi - b.kalan_birim_sayisi)
```

## Test Senaryosu

1. **Hazırlık:**
   - 250 gr'lık bir ürün oluştur
   - Stok miktarını 500 gr yap (2 birim)

2. **Kontrol:**
   - "Stoğu Azalan Ürünler" sayfasına git
   - Ürün listede görünmeli
   - "Kalan Birim" kolonu: "2.00 birim"
   - Durum: "Az" (Sarı)

3. **Satış Simülasyonu:**
   - 250 gr satış yap
   - Yeni stok: 250 gr (1 birim)
   - Durum: "Çok Az" (Turuncu)

4. **Kritik Seviye:**
   - 150 gr daha satış yap
   - Yeni stok: 100 gr (0.4 birim)
   - Durum: "Kritik" (Kırmızı)

5. **Tükendi:**
   - Kalan 100 gr'ı sat
   - Yeni stok: 0 gr (0 birim)
   - Durum: "Tükendi" (Kırmızı)

---

**Oluşturulma Tarihi:** 29 Kasım 2024  
**Versiyon:** 1.2.0
