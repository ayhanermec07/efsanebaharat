# Resim Yükleme Sistemi

## Kurulum

Resim yükleme özelliğini kullanmak için upload server'ı çalıştırmanız gerekiyor.

### 1. Bağımlılıkları Yükleyin

```bash
npm install
```

### 2. Upload Server'ı Başlatın

**Seçenek 1: Sadece Upload Server**
```bash
npm run upload-server
```

**Seçenek 2: Hem Vite hem Upload Server (Önerilen)**
```bash
npm run dev:full
```

## Kullanım

Upload server çalıştığında resimler şu klasörlere kaydedilir:

- **Ürün Resimleri**: `public/images/products/`
- **Banner Resimleri**: `public/images/banners/`
- **Marka Logoları**: `public/images/brands/`
- **Kategori Resimleri**: `public/images/categories/`

## API Endpoints

### 1. Base64 Upload
```
POST http://localhost:3001/upload-base64
Body: {
  "imageData": "data:image/png;base64,...",
  "folder": "products",
  "fileName": "optional-name"
}
```

### 2. URL'den Upload
```
POST http://localhost:3001/upload-from-url
Body: {
  "imageUrl": "https://example.com/image.jpg",
  "folder": "products"
}
```

### 3. Dosya Silme
```
DELETE http://localhost:3001/delete/:folder/:filename
```

## Önemli Notlar

- Maksimum dosya boyutu: **5MB**
- Desteklenen formatlar: **JPEG, PNG, GIF, WebP**
- Upload server portu: **3001**
- Vite dev server portu: **5174**

## Sorun Giderme

**Upload server çalışmıyor:**
```bash
# Port 3001'in kullanımda olup olmadığını kontrol edin
netstat -ano | findstr :3001

# Eğer kullanımdaysa, process'i sonlandırın veya upload-server.cjs'de PORT değişkenini değiştirin
```

**Resimler yüklenmiyor:**
- Upload server'ın çalıştığından emin olun
- Tarayıcı konsolunda hata mesajlarını kontrol edin
- `public/images/` klasörünün yazma izinlerini kontrol edin
