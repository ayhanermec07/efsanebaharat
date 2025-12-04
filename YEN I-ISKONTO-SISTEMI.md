# Yeni İskonto Sistemi - Basitleştirilmiş ✅

## Sistem Özeti

Yeni iskonto sistemi daha basit ve yönetilebilir:

### 1. İskonto Grupları
- Admin Panel > İskonto Grupları
- Grup bazlı iskonto yönetimi
- Her grup için tek bir iskonto oranı

### 2. Müşteri Kartında İskonto
- Müşteri > Düzenle
- İskonto grubu seçimi
- Kişiye özel ek iskonto

## Özellikler

### ✅ İskonto Grupları Sayfası
- **Dosya**: `src/pages/admin/IskontoGruplari.tsx`
- Grup oluşturma/düzenleme/silme
- İskonto oranı belirleme
- Kart görünümü ile kolay yönetim

### ✅ Varsayılan Gruplar
1. **Müşteri İskonto Grubu** - %0 (yeni müşteriler için)
2. **Bayi İskonto Grubu** - %10 (yeni bayiler için)
3. **VIP Müşteri Grubu** - %15 (özel müşteriler için)

### ✅ Müşteri Kartında İskonto
- İskonto grubu seçimi
- Kişiye özel ek iskonto alanı
- Toplam iskonto hesaplama göstergesi

### ✅ Otomatik Hesaplama
- Grup iskontosu + Özel iskonto = Toplam iskonto
- Maksimum %100 sınırı
- Gerçek zamanlı hesaplama

## Kullanım

### İskonto Grubu Oluşturma

1. Admin Panel > İskonto Grupları
2. "Yeni Grup Ekle" tıkla
3. Bilgileri doldur:
   - Grup Adı (örn: "Toptan Müşteri Grubu")
   - Açıklama
   - İndirim Oranı (%)
   - Aktif/Pasif
4. Kaydet

### Müşteriye İskonto Atama

1. Admin Panel > Müşteriler
2. Müşteri kartında "Düzenle" tıkla
3. İskonto Grubu seç
4. (Opsiyonel) Kişiye özel ek iskonto gir
5. Toplam iskonto hesaplamasını gör
6. Güncelle

### Örnek Senaryolar

#### Senaryo 1: Normal Müşteri
- İskonto Grubu: Müşteri İskonto Grubu (%0)
- Özel İskonto: %0
- **Toplam: %0**

#### Senaryo 2: Bayi
- İskonto Grubu: Bayi İskonto Grubu (%10)
- Özel İskonto: %0
- **Toplam: %10**

#### Senaryo 3: VIP Müşteri
- İskonto Grubu: VIP Müşteri Grubu (%15)
- Özel İskonto: %5
- **Toplam: %20**

#### Senaryo 4: Özel Anlaşmalı Müşteri
- İskonto Grubu: Müşteri İskonto Grubu (%0)
- Özel İskonto: %25
- **Toplam: %25**

## Teknik Detaylar

### Veritabanı Değişiklikleri

1. **musteriler tablosu**:
   - `ozel_iskonto_orani` kolonu eklendi (NUMERIC 5,2)
   - 0-100 arası değer alır

2. **fiyat_gruplari tablosu**:
   - Mevcut tablo kullanılıyor
   - `indirim_orani` kolonu iskonto oranı için

### İskonto Hesaplama

```typescript
// AuthContext.tsx
async function hesaplaIskontoOrani(musteriId: string) {
  // 1. Müşteri bilgisini al
  const musteri = await getMusteriById(musteriId)
  
  // 2. Grup iskontosunu al
  let toplamIskonto = 0
  if (musteri.fiyat_grubu_id) {
    const fiyatGrubu = await getFiyatGrubuById(musteri.fiyat_grubu_id)
    toplamIskonto += fiyatGrubu.indirim_orani
  }
  
  // 3. Özel iskonto ekle
  if (musteri.ozel_iskonto_orani) {
    toplamIskonto += musteri.ozel_iskonto_orani
  }
  
  // 4. Maksimum %100 sınırı
  toplamIskonto = Math.min(toplamIskonto, 100)
  
  return toplamIskonto
}
```

### Fiyat Uygulama

```typescript
// iskonto.ts
function iskontoUygula(fiyat: number, iskontoOrani: number) {
  const indirim = (fiyat * iskontoOrani) / 100
  const yeniFiyat = fiyat - indirim
  
  return {
    varMi: iskontoOrani > 0,
    oran: iskontoOrani,
    yeniFiyat: Math.round(yeniFiyat * 100) / 100,
    eskiFiyat: fiyat
  }
}
```

## Eski Sistemden Farklar

### Eski Sistem ❌
- Karmaşık iskonto tablosu
- Tarih bazlı iskontolar
- Bireysel ve grup iskontolar ayrı
- Yönetimi zor

### Yeni Sistem ✅
- Basit grup yapısı
- Sürekli iskontolar
- Grup + Özel iskonto birlikte
- Kolay yönetim

## Kurulum

### 1. Veritabanı Güncellemesi

```sql
-- Özel iskonto kolonu ekle
ALTER TABLE musteriler 
ADD COLUMN IF NOT EXISTS ozel_iskonto_orani NUMERIC(5,2) DEFAULT 0 
CHECK (ozel_iskonto_orani >= 0 AND ozel_iskonto_orani <= 100);
```

### 2. Varsayılan Grupları Oluştur

```sql
-- create-default-iskonto-groups.sql dosyasını çalıştır
```

### 3. Menüye Ekle

Admin menüsüne "İskonto Grupları" linkini ekleyin.

## Sorun Giderme

### İskonto uygulanmıyor
- Müşterinin iskonto grubu atanmış mı?
- Grup aktif mi?
- Tarayıcı önbelleğini temizle

### Yanlış iskonto hesaplanıyor
- Grup iskonto oranını kontrol et
- Özel iskonto oranını kontrol et
- Konsol loglarını kontrol et (F12)

### Grup silinemiyor
- Bu grubu kullanan müşteriler var
- Önce müşterilerin grubunu değiştir

## Gelecek Geliştirmeler

- [ ] Toplu müşteri grup değiştirme
- [ ] İskonto geçmişi
- [ ] İskonto raporları
- [ ] Otomatik grup atama kuralları
- [ ] Ürün bazlı iskontolar

## Notlar

⚠️ **ÖNEMLİ:**
- Eski `iskontolar` tablosu artık kullanılmıyor
- Tüm iskontolar grup + özel iskonto ile yönetiliyor
- Maksimum toplam iskonto %100
- Negatif iskonto olamaz
