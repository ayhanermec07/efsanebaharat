# Stok Yönetimi - Birim Senkronizasyonu

## 🎯 Yapılan Değişiklikler

### Problem
Stok yönetimi panelinde "Birim Türü" seçildiğinde "Stok Miktarı" alanının birimi bağımsızdı. Bu durum karışıklığa neden oluyordu:
- Birim Türü: Adet seçildiğinde → Stok Miktarı: Gram olabiliyordu ❌
- Birim Türü: Gram seçildiğinde → Stok Miktarı: Kilogram olabiliyordu (bu mantıklı ✅)

### Çözüm
Birim türü seçildiğinde birimler akıllı şekilde senkronize ediliyor:

**Kurallar:**
- Birim Türü: **Adet** → Birim Adedi Türü: Adet, Stok Birimi: Adet (sabit)
- Birim Türü: **Gram** → Birim Adedi Türü: Gram, Stok Birimi: Gram veya Kilogram (seçilebilir)
- Birim Türü: **Kilogram** → Birim Adedi Türü: Kilogram, Stok Birimi: Kilogram (sabit)

## 📝 Kod Değişiklikleri

### 1. FormData State Güncellendi
```typescript
const [formData, setFormData] = useState({
  birim_turu: 'gram',
  birim_adedi: 100,
  birim_adedi_turu: 'gram',
  fiyat: 0,
  stok_miktari: 0,
  stok_birimi: 'gram',  // YENİ ALAN
  min_siparis_miktari: 1,
  stok_grubu: 'hepsi',
  aktif_durum: true
})
```

### 2. Birim Türü Değişim Handler'ı Güncellendi
```typescript
const handleBirimTuruChange = (yeniBirim: string) => {
  setFormData(prev => ({
    ...prev,
    birim_turu: yeniBirim,
    birim_adedi_turu: yeniBirim,
    // Gram seçilirse stok birimi gram (kullanıcı değiştirebilir), diğerleri aynı
    stok_birimi: yeniBirim === 'gram' ? 'gram' : yeniBirim
  }))
}
```

### 3. Stok Birimi Akıllı Seçim
Gram için seçilebilir, diğerleri otomatik:

```typescript
<div>
  <label>Stok Birimi *</label>
  {formData.birim_turu === 'gram' ? (
    <select
      value={formData.stok_birimi}
      onChange={(e) => setFormData({ ...formData, stok_birimi: e.target.value })}
    >
      <option value="gram">Gram</option>
      <option value="kilogram">Kilogram</option>
    </select>
  ) : (
    <input
      type="text"
      value={BIRIM_TURLERI.find(b => b.value === formData.birim_turu)?.label}
      disabled
    />
  )}
  <p className="text-xs text-gray-500 mt-1">
    {formData.birim_turu === 'gram' ? 'Gram veya Kilogram seçebilirsiniz' : 'Birim türü ile aynı'}
  </p>
</div>
```

### 4. Veritabanı Kayıt Güncellendi
```typescript
const stokData = {
  urun_id: urunId,
  birim_turu: formData.birim_turu,
  birim_adedi: formData.birim_adedi,
  birim_adedi_turu: formData.birim_adedi_turu,
  fiyat: formData.fiyat,
  stok_miktari: formData.stok_miktari,
  stok_birimi: formData.stok_birimi,  // YENİ
  min_siparis_miktari: formData.min_siparis_miktari,
  stok_grubu: formData.stok_grubu,
  aktif_durum: formData.aktif_durum
}
```

### 5. Tabloda Gösterim Güncellendi
```typescript
<td className="px-4 py-3">
  <div className="font-medium">
    {ondalikStokGoster(stok.stok_miktari || 0, stok.stok_birimi || stok.birim_turu)}
  </div>
</td>
```

## 🎨 Kullanıcı Deneyimi

### Senaryo 1: Adet Bazlı Ürün
1. Birim Türü: **Adet** seç
2. Birim Adedi: **1**
3. Stok Miktarı: **100**
4. Stok Birimi: **Adet** (otomatik, değiştirilemez)

**Sonuç:** 100 Adet stok, 1 Adet birim

### Senaryo 2: Gram Bazlı Ürün (Gram Stok)
1. Birim Türü: **Gram** seç
2. Birim Adedi: **250**
3. Stok Miktarı: **5000**
4. Stok Birimi: **Gram** (varsayılan, değiştirilebilir)

**Sonuç:** 5000 Gr stok (5 Kg gösterilir), 250 Gr birim

### Senaryo 3: Gram Bazlı Ürün (Kilogram Stok)
1. Birim Türü: **Gram** seç
2. Birim Adedi: **250**
3. Stok Miktarı: **5**
4. Stok Birimi: **Kilogram** (manuel seçildi)

**Sonuç:** 5 Kg stok, 250 Gr birim

### Senaryo 4: Kilogram Bazlı Ürün
1. Birim Türü: **Kilogram** seç
2. Birim Adedi: **1**
3. Stok Miktarı: **10**
4. Stok Birimi: **Kilogram** (otomatik, değiştirilemez)

**Sonuç:** 10 Kg stok, 1 Kg birim

## ✅ Avantajlar

1. **Esneklik:** Gram için Gram/Kilogram seçimi yapılabilir
2. **Tutarlılık:** Adet ve Kilogram için birimler otomatik aynı
3. **Kullanıcı Dostu:** Akıllı form, gereksiz seçenekler gösterilmez
4. **Hata Önleme:** Uyumsuz birim kombinasyonları engellenir
5. **Doğru Hesaplama:** Stok azalan ürünler doğru hesaplanır

## 🔄 Birim Mantığı

### Adet
```
Birim Türü: Adet
Birim Adedi Türü: Adet (otomatik)
Stok Birimi: Adet (otomatik, değiştirilemez)
Örnek: 1 Adet birim, 100 Adet stok
```

### Gram
```
Birim Türü: Gram
Birim Adedi Türü: Gram (otomatik)
Stok Birimi: Gram veya Kilogram (seçilebilir)

Örnek 1: 250 Gr birim, 5000 Gr stok (gösterim: 5 Kg)
Örnek 2: 250 Gr birim, 5 Kg stok
```

### Kilogram
```
Birim Türü: Kilogram
Birim Adedi Türü: Kilogram (otomatik)
Stok Birimi: Kilogram (otomatik, değiştirilemez)
Örnek: 1 Kg birim, 10 Kg stok
```

## 📊 Veritabanı Yapısı

```sql
CREATE TABLE urun_stoklari (
  id uuid PRIMARY KEY,
  urun_id uuid NOT NULL,
  birim_turu varchar NOT NULL,        -- adet/gram/kilogram
  birim_adedi numeric(10,3) NOT NULL, -- 100, 250, 1, vb.
  birim_adedi_turu text NOT NULL,     -- adet/gram/kilogram
  stok_miktari numeric(10,3),         -- 5000, 10.5, vb.
  stok_birimi text,                   -- adet/gram/kilogram (YENİ)
  fiyat numeric NOT NULL,
  min_siparis_miktari numeric,
  stok_grubu text,                    -- musteri/bayi/hepsi
  aktif_durum boolean DEFAULT true
);
```

## 🧪 Test Senaryoları

### Test 1: Adet Ürün
1. Yeni stok ekle
2. Birim Türü: Adet seç
3. Stok Birimi'nin otomatik "Adet" olduğunu kontrol et
4. Stok Birimi'nin değiştirilemediğini kontrol et

### Test 2: Gram Ürün
1. Yeni stok ekle
2. Birim Türü: Gram seç
3. Birim Adedi: 250 gir
4. Stok Miktarı: 5000 gir
5. Tüm birimlerin "Gram" olduğunu kontrol et

### Test 3: Kilogram Ürün
1. Yeni stok ekle
2. Birim Türü: Kilogram seç
3. Birim Adedi: 1 gir
4. Stok Miktarı: 10 gir
5. Tüm birimlerin "Kilogram" olduğunu kontrol et

### Test 4: Birim Türü Değiştirme
1. Mevcut bir stok kaydını düzenle
2. Birim Türü'nü Gram'dan Kilogram'a değiştir
3. Birim Adedi Türü ve Stok Birimi'nin otomatik "Kilogram" olduğunu kontrol et
4. Kaydet ve veritabanında doğru kaydedildiğini kontrol et

## 📝 Notlar

1. **Geriye Uyumluluk:** Eski kayıtlarda `stok_birimi` yoksa `birim_turu` kullanılır
2. **Varsayılan Değer:** Yeni kayıtlarda stok_birimi = birim_turu
3. **Validasyon:** Birim uyumluluğu kontrolü yapılır
4. **Gösterim:** `ondalikStokGoster` fonksiyonu stok_birimi'ni kullanır

---

**Oluşturulma Tarihi:** 29 Kasım 2024  
**Versiyon:** 1.3.0  
**Durum:** ✅ Tamamlandı
