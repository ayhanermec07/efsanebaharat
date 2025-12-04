# Stok Güncelleme Hata Çözümü

## Sorun

Ürün stok seçeneklerini güncellerken aşağıdaki hatalar alınıyordu:

1. **Supabase Hatası**: `Could not find the 'satis_birimi' column of 'urun_stoklari' in the schema cache`
2. **React Hatası**: `Warning: Received NaN for the value attribute`

## Hata Analizi

### 1. Satis_birimi Hatası

**Neden**: 
- Kod, veritabanında olmayan `satis_birimi` ve `satis_miktari` kolonlarını çekmeye çalışıyordu
- Supabase sorgusu `select('*')` kullanıyordu ve cache'de eski kolon isimleri vardı

**Çözüm**:
- Explicit column selection kullanıldı
- Sadece var olan kolonlar çekildi: `birim_turu`, `birim_adedi`, `birim_adedi_turu`, `fiyat`, `stok_miktari`, `stok_birimi`, `min_siparis_miktari`, `stok_grubu`

### 2. NaN Hatası

**Neden**:
- Input değerleri `undefined` veya `null` olduğunda `parseFloat()` NaN döndürüyordu
- React number input'ları NaN değerini kabul etmiyor

**Çözüm**:
- Input value'larda fallback eklendi: `value={stok.birim_adedi || ''}`
- onChange'de default değer eklendi: `parseFloat(e.target.value) || 0`
- Number() ile explicit conversion yapıldı

## Yapılan Değişiklikler

### 1. Stok Sorgusunda Explicit Column Selection

**Önce**:
```typescript
supabase.from('urun_stoklari').select('*').eq('urun_id', urun.id)
```

**Sonra**:
```typescript
supabase.from('urun_stoklari')
  .select('id, urun_id, birim_turu, birim_adedi, birim_adedi_turu, fiyat, stok_miktari, stok_birimi, min_siparis_miktari, stok_grubu, aktif_durum')
  .eq('urun_id', urun.id)
```

### 2. Number Conversion ve Fallback

**Önce**:
```typescript
birim_adedi: s.birim_adedi || 100,
fiyat: s.fiyat,
stok_miktari: s.stok_miktari,
```

**Sonra**:
```typescript
birim_adedi: Number(s.birim_adedi) || 100,
fiyat: Number(s.fiyat) || 0,
stok_miktari: Number(s.stok_miktari) || 0,
```

### 3. Input Value Fallback

**Önce**:
```typescript
<input
  type="number"
  value={stok.birim_adedi}
  onChange={(e) => updateStok(index, 'birim_adedi', parseFloat(e.target.value))}
/>
```

**Sonra**:
```typescript
<input
  type="number"
  value={stok.birim_adedi || ''}
  onChange={(e) => updateStok(index, 'birim_adedi', parseFloat(e.target.value) || 0)}
  min="0"
/>
```

### 4. Default Stok Objesi Güncellendi

**Önce**:
```typescript
{ birim_adedi: 100, birim_turu: 'gr', fiyat: 0, ... }
```

**Sonra**:
```typescript
{ 
  birim_adedi: 100, 
  birim_adedi_turu: 'gr',
  birim_turu: 'gr', 
  fiyat: 0, 
  stok_miktari: 0, 
  stok_birimi: 'gr', 
  min_siparis_miktari: 1, 
  stok_grubu: 'hepsi' 
}
```

### 5. Stok Yoksa Default Ekleme

```typescript
if (data && data.length > 0) {
  // Stokları map et
} else {
  // Stok yoksa default ekle
  setStoklar([{ 
    birim_adedi: 100, 
    birim_adedi_turu: 'gr',
    birim_turu: 'gr', 
    fiyat: 0, 
    stok_miktari: 0, 
    stok_birimi: 'gr', 
    min_siparis_miktari: 1, 
    stok_grubu: 'hepsi' 
  }])
}
```

## Test Senaryoları

### Test 1: Yeni Ürün Ekleme
1. Admin panelinde "Yeni Ürün Ekle" butonuna tıklayın
2. Ürün bilgilerini doldurun
3. Stok seçeneklerini girin
4. Kaydet
5. ✅ Hata alınmamalı

### Test 2: Mevcut Ürün Düzenleme
1. Bir ürünü düzenle
2. Stok seçeneklerini değiştir
3. Kaydet
4. ✅ NaN hatası alınmamalı

### Test 3: Boş Stok Değerleri
1. Ürün düzenle
2. Stok değerlerini sil
3. Tekrar değer gir
4. ✅ Input'lar düzgün çalışmalı

### Test 4: Çoklu Stok Seçenekleri
1. "+ Stok Ekle" ile birden fazla stok ekle
2. Her birini farklı değerlerle doldur
3. Kaydet
4. ✅ Tüm stoklar kaydedilmeli

## En İyi Uygulamalar

### 1. Explicit Column Selection
```typescript
// ❌ Kötü
.select('*')

// ✅ İyi
.select('id, name, price, stock')
```

### 2. Number Input Handling
```typescript
// ❌ Kötü
value={number}
onChange={(e) => setValue(parseFloat(e.target.value))}

// ✅ İyi
value={number || ''}
onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
```

### 3. Type Conversion
```typescript
// ❌ Kötü
const value = data.price

// ✅ İyi
const value = Number(data.price) || 0
```

### 4. Default Values
```typescript
// ❌ Kötü
const stock = data.stock

// ✅ İyi
const stock = data.stock ?? 0
```

## Önleme Stratejileri

1. **Type Safety**: TypeScript interface'leri kullanın
2. **Validation**: Zod veya Yup ile input validation
3. **Default Values**: Her zaman default değer belirleyin
4. **Explicit Queries**: Select sorgularında kolon isimlerini belirtin
5. **Error Boundaries**: React Error Boundary kullanın
6. **Logging**: Console.error ile hataları logla

## İlgili Dosyalar

- `efsanebaharat/src/pages/admin/UrunlerYonetim.tsx` - Düzeltildi
- `efsanebaharat/src/components/admin/StokYonetimi.tsx` - İlgili bileşen

## Sonuç

✅ Tüm hatalar düzeltildi
✅ NaN uyarıları giderildi
✅ Supabase sorguları optimize edildi
✅ Input handling iyileştirildi
✅ Default değerler eklendi

Sistem artık stabil ve kullanıma hazır!
