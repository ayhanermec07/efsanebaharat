# Supabase Storage Bucket Oluşturma

## Sorun

Marka logosu yüklerken "Bucket not found" hatası alıyorsunuz.

## Çözüm

### Seçenek 1: Mevcut Bucket Kullan (Önerilen)

Markalar için `urun-gorselleri` bucket'ını kullanıyoruz. Bu bucket zaten mevcut olmalı.

✅ **Kod güncellendi** - `bucketName="urun-gorselleri"` olarak değiştirildi.

### Seçenek 2: Yeni Bucket Oluştur

Eğer ayrı bir bucket istiyorsanız:

#### Adım 1: Supabase Dashboard'a Git

1. https://app.supabase.com
2. Projenizi seçin
3. Sol menüden **Storage** tıklayın

#### Adım 2: Yeni Bucket Oluştur

1. **New bucket** butonuna tıklayın
2. Bucket adı: `marka-logolari` (veya istediğiniz ad)
3. **Public bucket** seçeneğini işaretleyin (logolar herkese açık olmalı)
4. **Create bucket** tıklayın

#### Adım 3: Bucket Politikalarını Ayarla

```sql
-- Public okuma izni
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'marka-logolari');

-- Authenticated kullanıcılar yükleme yapabilir
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'marka-logolari' 
  AND auth.role() = 'authenticated'
);

-- Authenticated kullanıcılar güncelleyebilir
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'marka-logolari' 
  AND auth.role() = 'authenticated'
);

-- Authenticated kullanıcılar silebilir
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'marka-logolari' 
  AND auth.role() = 'authenticated'
);
```

#### Adım 4: Kod'u Güncelle

Eğer yeni bucket oluşturduysanız, `Markalar.tsx` dosyasında:

```typescript
<ImageUpload
  maxFiles={1}
  bucketName="marka-logolari"  // Yeni bucket adı
  onUploadComplete={(urls) => setFormData({ ...formData, logo_url: urls[0] || '' })}
  existingImages={formData.logo_url ? [formData.logo_url] : []}
  maxSizeMB={2}
/>
```

## Mevcut Bucket'ları Kontrol Et

Supabase Dashboard > Storage > Buckets listesinde şunları göreceksiniz:

- `urun-gorselleri` - Ürün görselleri için
- `avatars` - Kullanıcı avatarları için (varsa)
- `marka-logolari` - Marka logoları için (yeni oluşturduysanız)

## Test Et

1. Admin Panel > Markalar
2. Yeni Marka Ekle
3. Logo yükle
4. Hata almamalısınız ✅

## Sorun Devam Ederse

### Bucket Adını Kontrol Et

```typescript
// Markalar.tsx dosyasında
bucketName="urun-gorselleri"  // Bu bucket mevcut mu?
```

### Supabase Storage Loglarını Kontrol Et

1. Supabase Dashboard > Storage
2. Logs sekmesine git
3. Hata mesajlarını kontrol et

### RLS Politikalarını Kontrol Et

```sql
-- Mevcut politikaları listele
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';
```

## Önerilen Bucket Yapısı

```
urun-gorselleri/
├── urunler/          # Ürün görselleri
├── markalar/         # Marka logoları
├── kategoriler/      # Kategori görselleri
└── bannerlar/        # Banner görselleri
```

Bu yapıda tek bucket kullanarak klasörlerle organize edebilirsiniz.

## Güvenlik Notları

⚠️ **ÖNEMLİ:**
- Public bucket'lar herkese açıktır
- Hassas bilgiler yüklemeyin
- Dosya boyutu limitlerini ayarlayın
- RLS politikalarını doğru yapılandırın
