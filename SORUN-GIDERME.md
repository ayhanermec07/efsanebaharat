# Boş Sayfa Sorunu - Çözüm Adımları

## Sorun
Sayfa yenilendiğinde boş sayfa görünüyor.

## Hata Mesajı
```
Uncaught SyntaxError: The requested module '/src/pages/admin/KampanyalarGelismis.tsx' 
does not provide an export named 'default' (at App.tsx:33:8)
```

## Neden Oluştu
1. Yeni kampanya dosyaları eklendi
2. App.tsx'te import edildi
3. Dosyalar silindi ama tarayıcı cache'i eski kodu hatırlıyor

## Çözüm Adımları

### 1. Development Server'ı Durdur
```bash
Ctrl + C (terminalde)
```

### 2. Node Modules ve Cache Temizle
```bash
# Windows CMD
rmdir /s /q node_modules
rmdir /s /q .vite
del package-lock.json

# Sonra yeniden yükle
npm install
```

### 3. Tarayıcı Cache Temizle
- Chrome/Edge: `Ctrl + Shift + Delete`
- "Cached images and files" seç
- "Clear data" tıkla

### 4. Hard Refresh
- `Ctrl + F5`
- veya `Ctrl + Shift + R`

### 5. Server'ı Yeniden Başlat
```bash
npm run dev
```

### 6. Tarayıcıyı Tamamen Kapat ve Aç
- Tüm sekmeleri kapat
- Tarayıcıyı kapat
- Yeniden aç
- Siteye git

## Alternatif Çözüm: Incognito Mode
1. Yeni gizli pencere aç (`Ctrl + Shift + N`)
2. Siteye git
3. Çalışıyorsa cache sorunu

## Dosya Durumu

### Silinen Dosyalar
- ❌ `src/components/KampanyaUygula.tsx`
- ❌ `src/pages/admin/KampanyalarGelismis.tsx`

### Temiz Dosyalar
- ✅ `src/App.tsx` - Import'lar temizlendi
- ✅ `src/pages/Sepet.tsx` - Orijinal haline döndü

## Kontrol Listesi

- [ ] Development server durduruldu
- [ ] Cache temizlendi
- [ ] Server yeniden başlatıldı
- [ ] Tarayıcı cache temizlendi
- [ ] Hard refresh yapıldı
- [ ] Sayfa yüklendi

## Hala Çalışmıyorsa

### Konsol Hatalarını Kontrol Et
1. F12 ile Developer Tools aç
2. Console sekmesine bak
3. Kırmızı hataları kopyala
4. Hataları paylaş

### Vite Cache Temizle
```bash
# .vite klasörünü sil
rmdir /s /q .vite

# node_modules/.vite klasörünü sil
rmdir /s /q node_modules/.vite
```

### Port Değiştir
package.json'da port değiştir:
```json
"dev": "vite --port 3001"
```

## Kampanya Sistemi

Veritabanı hazır:
- ✅ `kampanyalar` tablosu
- ✅ `kampanya_kullanimlari` tablosu
- ✅ Migration'lar uygulandı

Frontend'i daha sonra tekrar ekleyeceğiz.

---

**Son Güncelleme:** 29 Kasım 2024
