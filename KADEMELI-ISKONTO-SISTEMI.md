# Kademeli İskonto Sistemi ✅

## Nasıl Çalışır?

İskonto hesaplaması **kademeli** olarak yapılır:

1. **Önce Grup İskontosu** uygulanır
2. **Sonra Özel İskonto** kalan tutara uygulanır

## Örnek Hesaplama

### Senaryo: %10 Grup + %5 Özel İskonto

**Ürün Fiyatı:** 100 TL

#### Adım 1: Grup İskontosu
- Grup İskontosu: %10
- İndirim: 100 × 0.10 = **10 TL**
- Kalan: 100 - 10 = **90 TL**

#### Adım 2: Özel İskonto
- Özel İskonto: %5
- İndirim: 90 × 0.05 = **4.5 TL**
- Kalan: 90 - 4.5 = **85.5 TL**

#### Sonuç
- **Toplam İndirim:** 14.5 TL
- **Toplam İskonto Oranı:** %14.5
- **Final Fiyat:** 85.5 TL

## Neden Kademeli?

### ❌ Basit Toplama (Yanlış)
```
%10 + %5 = %15
100 TL - 15 TL = 85 TL
```

### ✅ Kademeli Hesaplama (Doğru)
```
1. 100 TL - (100 × 0.10) = 90 TL
2. 90 TL - (90 × 0.05) = 85.5 TL
Toplam: %14.5 iskonto
```

**Fark:** 0.5 TL (daha gerçekçi ve adil)

## Kod Örneği

```typescript
// utils/iskonto.ts
export function kademeli IskontoUygula(
  fiyat: number, 
  grupIskontoOrani: number, 
  ozelIskontoOrani: number
): IskontoInfo {
  let mevcutFiyat = fiyat
  let toplamIndirim = 0

  // 1. Grup iskontosunu uygula
  if (grupIskontoOrani > 0) {
    const grupIndirim = (mevcutFiyat * grupIskontoOrani) / 100
    toplamIndirim += grupIndirim
    mevcutFiyat -= grupIndirim
  }

  // 2. Özel iskontonu uygula (kalan tutara)
  if (ozelIskontoOrani > 0) {
    const ozelIndirim = (mevcutFiyat * ozelIskontoOrani) / 100
    toplamIndirim += ozelIndirim
    mevcutFiyat -= ozelIndirim
  }

  // Toplam iskonto oranını hesapla
  const toplamIskontoOrani = (toplamIndirim / fiyat) * 100

  return {
    varMi: true,
    oran: toplamIskontoOrani,
    yeniFiyat: mevcutFiyat,
    eskiFiyat: fiyat
  }
}
```

## Gerçek Örnekler

### Örnek 1: Sadece Grup İskontosu
- Fiyat: 200 TL
- Grup: %15
- Özel: %0

**Hesaplama:**
1. 200 - (200 × 0.15) = 170 TL
2. Özel iskonto yok
**Sonuç:** 170 TL (%15 iskonto)

### Örnek 2: Sadece Özel İskonto
- Fiyat: 150 TL
- Grup: %0
- Özel: %20

**Hesaplama:**
1. Grup iskontosu yok
2. 150 - (150 × 0.20) = 120 TL
**Sonuç:** 120 TL (%20 iskonto)

### Örnek 3: Her İkisi de Var
- Fiyat: 500 TL
- Grup: %10
- Özel: %5

**Hesaplama:**
1. 500 - (500 × 0.10) = 450 TL
2. 450 - (450 × 0.05) = 427.5 TL
**Sonuç:** 427.5 TL (%14.5 iskonto)

### Örnek 4: Yüksek İskontolar
- Fiyat: 1000 TL
- Grup: %20
- Özel: %10

**Hesaplama:**
1. 1000 - (1000 × 0.20) = 800 TL
2. 800 - (800 × 0.10) = 720 TL
**Sonuç:** 720 TL (%28 iskonto)

**Not:** Basit toplama ile %30 olurdu, ama kademeli ile %28 oluyor.

## Admin Panelinde Görünüm

Müşteri düzenleme ekranında:

```
Kademeli İskonto Hesaplama:
1. Grup İskontosu: %10 → 10.00 TL indirim
2. Özel İskonto: %5 → 4.50 TL ek indirim

Toplam İskonto: %14.50 (14.50 TL / 100 TL)
Örnek: 100 TL → 85.50 TL
```

## Müşteri Tarafında

Ürün kartlarında:
- Eski fiyat: ~~100 TL~~
- Yeni fiyat: **85.5 TL**
- İskonto etiketi: **%14.5 İndirim**

## Avantajlar

✅ **Matematiksel Doğruluk**: Gerçek ticari hesaplamaya uygun
✅ **Adil Fiyatlandırma**: Müşteri ve işletme için dengeli
✅ **Şeffaflık**: Hesaplama adımları görülebilir
✅ **Esneklik**: Farklı iskonto kombinasyonları
✅ **Standart**: Çoğu e-ticaret platformunda kullanılır

## Teknik Notlar

- Tüm hesaplamalar 2 ondalık basamağa yuvarlanır
- Maksimum toplam iskonto: %100
- Negatif iskonto olamaz
- Her iki iskonto da 0 ise iskonto uygulanmaz

## Test Senaryoları

### Test 1: Sıfır İskonto
```
Fiyat: 100 TL
Grup: %0, Özel: %0
Beklenen: 100 TL (%0)
```

### Test 2: Tek İskonto
```
Fiyat: 100 TL
Grup: %10, Özel: %0
Beklenen: 90 TL (%10)
```

### Test 3: Çift İskonto
```
Fiyat: 100 TL
Grup: %10, Özel: %5
Beklenen: 85.5 TL (%14.5)
```

### Test 4: Yüksek İskonto
```
Fiyat: 100 TL
Grup: %50, Özel: %20
Beklenen: 40 TL (%60)
```

## Sık Sorulan Sorular

**S: Neden %10 + %5 = %15 değil?**
C: Çünkü ikinci iskonto, ilk iskonto düştükten sonraki tutara uygulanır. Bu daha gerçekçi ve ticari standarttır.

**S: Hangi iskonto önce uygulanır?**
C: Her zaman grup iskontosu önce, özel iskonto sonra uygulanır.

**S: Maksimum iskonto nedir?**
C: Teorik olarak %100'e kadar çıkabilir, ama pratik olarak %50-60 arası makul.

**S: Negatif iskonto olabilir mi?**
C: Hayır, sistem negatif değerleri kabul etmez.
