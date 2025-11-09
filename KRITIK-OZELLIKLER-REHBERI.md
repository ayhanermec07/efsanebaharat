# EfsaneBaharat.com - Kritik Özellikler Tamamlama Rehberi

## 🎯 Tamamlanması Gereken İki Kritik Özellik

### 1. ✅ GÖRSEL YÜKLEME ÖZELLİĞİ - Manuel Test Gerekli

#### Mevcut Durum
- ✅ Frontend component hazır ve görünüyor
- ✅ Edge function deploy edildi (`image-storage-upload`)
- ✅ Supabase Storage buckets oluşturuldu
- ✅ Database kolonları eklendi
- ⚠️ **GERÇEK DOSYA YÜKLEME TESTİ YAPILMADI**

#### Manuel Test Adımları

**Test 1: Kategori Görseli Yükleme**
1. Admin panele giriş yap: https://77p1nkfr1tte.space.minimax.io/admin
   - Email: xenebugc@minimax.com
   - Şifre: 9BHBxBfIXv
2. "Kategoriler" sekmesine git
3. "Yeni Kategori Ekle" butonuna tıkla
4. Form doldur:
   - Kategori Adı: "Test Görsel Upload"
   - Açıklama: "Görsel yükleme testi"
   - Sıra No: 99
5. **ImageUpload component'ine tıkla** ve bir görsel seç (max 5MB)
6. "Görseli Yükle" butonuna tıkla (yükleme progress bar görünecek)
7. "Kaydet" butonuna tıkla
8. **Doğrulama**: Kategoriler listesinde yeni kategori görünmeli

**Test 2: Marka Logosu Yükleme**
1. "Markalar" sekmesine git
2. "Yeni Marka Ekle" butonuna tıkla
3. Form doldur:
   - Marka Adı: "Test Logo Upload"
4. **ImageUpload component'ine tıkla** ve logo seç (max 2MB)
5. "Görseli Yükle" butonuna tıkla
6. "Kaydet" butonuna tıkla
7. **Doğrulama**: Markalar listesinde logo linki görünmeli

**Test 3: Ürün Çoklu Görsel Yükleme**
1. "Ürün Yönetimi" sekmesine git
2. "Yeni Ürün Ekle" butonuna tıkla
3. Form doldur:
   - Ürün Adı: "Test Çoklu Görsel"
   - Kategori: Herhangi bir kategori seç
   - Marka: Herhangi bir marka seç
   - Stok bilgisi: Varsayılan değerleri kullan
4. **ImageUpload component'ine tıkla** ve 3-5 görsel seç (max 10, her biri max 5MB)
5. "X Görseli Yükle" butonuna tıkla (progress bar izle)
6. **İlk görsel ana görsel olacaktır** notuna dikkat et
7. "Kaydet" butonuna tıkla
8. **Doğrulama**: 
   - Ürünler listesinde yeni ürün görünmeli
   - Ürün detay sayfasında görseller görünmeli

#### Beklenen Hatalar ve Çözümleri

**Hata 1**: "Edge function hatası" veya "Upload failed"
- **Neden**: Edge function permissions veya CORS sorunu olabilir
- **Çözüm**: Browser console'u aç (F12), hata detayını kontrol et
- **Alternatif**: Supabase Dashboard'dan function logs kontrol et

**Hata 2**: "Dosya çok büyük"
- **Neden**: Dosya boyutu limitini aşıyor
- **Çözüm**: Daha küçük dosya seç veya görsel sıkıştır
  - Kategoriler: max 5MB
  - Markalar: max 2MB
  - Ürünler: max 5MB (her görsel)

**Hata 3**: Yükleme başarılı ama görsel görünmüyor
- **Neden**: Database'e kaydedilmedi veya public URL yanlış
- **Çözüm**: 
  - Supabase Dashboard → Storage → Bucket'ları kontrol et
  - Database'de gorsel_url kolonunu kontrol et

---

### 2. ❌ PAYTR ÖDEME ALTYAPISI - Credentials Gerekli

#### Mevcut Durum
- ✅ Edge function hazır (`paytr-payment`)
- ✅ Frontend checkout sayfası hazır
- ✅ Ödeme başarılı/başarısız sayfaları hazır
- ❌ **GERÇEK API CREDENTIALS YOK**

#### Gerekli Credentials

**[ACTION_REQUIRED]** PayTr entegrasyonunu tamamlamak için aşağıdaki bilgiler gereklidir:

1. **MERCHANT_ID**: PayTr mağaza ID'si
2. **MERCHANT_KEY**: PayTr API anahtarı
3. **MERCHANT_SALT**: PayTr güvenlik salt değeri

**Bu bilgileri almak için**:
- PayTr hesabınıza giriş yapın: https://www.paytr.com
- Entegrasyon → API Bilgileri bölümüne gidin
- Test modu için "Test API Bilgileri"ni kullanın

#### Credentials Ekleme Adımları

**Adım 1**: Environment Variables Ekleme
```bash
# Supabase Dashboard'a git
# Settings → Edge Functions → Secrets
# Şu değişkenleri ekle:

PAYTR_MERCHANT_ID=your_merchant_id
PAYTR_MERCHANT_KEY=your_merchant_key
PAYTR_MERCHANT_SALT=your_merchant_salt
```

**Adım 2**: Edge Function Güncelleme
Edge function zaten bu environment variables'ı kullanacak şekilde kodlandı:
```typescript
const merchant_id = Deno.env.get('PAYTR_MERCHANT_ID')
const merchant_key = Deno.env.get('PAYTR_MERCHANT_KEY')
const merchant_salt = Deno.env.get('PAYTR_MERCHANT_SALT')
```

**Adım 3**: Test Ödemesi
1. Site'de ürün sepete ekle
2. Sepet sayfasına git
3. "Ödemeye Geç" butonuna tıkla
4. PayTr iframe'i açılacak
5. Test kartı bilgileri:
   - Kart No: 5406675406675403
   - SKT: 12/26
   - CVV: 000
6. Ödeme yap ve başarılı sayfaya yönlendirildiğini doğrula

#### Beklenen Test Sonuçları

**Başarılı Ödeme**:
- PayTr iframe açılır
- Test kartı ile ödeme yapılır
- "Ödeme Başarılı" sayfasına yönlendirilir (`/odeme-basarili`)
- Sipariş veritabanına kaydedilir
- Sepet temizlenir

**Başarısız Ödeme**:
- "Ödeme Başarısız" sayfasına yönlendirilir (`/odeme-basarisiz`)
- Sipariş kaydedilmez
- Sepet korunur

---

## 🔧 Troubleshooting

### Edge Function Logs Kontrol Etme
```bash
# Supabase Dashboard → Edge Functions → Functions Listesi
# image-storage-upload veya paytr-payment seç
# Logs sekmesine git
# Son çağrıları ve hataları gör
```

### Database Verification
```sql
-- Görsellerin kaydedildiğini kontrol et
SELECT * FROM kategoriler WHERE gorsel_url IS NOT NULL;
SELECT * FROM markalar WHERE logo_url IS NOT NULL;
SELECT * FROM urun_gorselleri ORDER BY created_at DESC LIMIT 10;

-- Siparişlerin kaydedildiğini kontrol et (PayTr testi sonrası)
SELECT * FROM siparisler ORDER BY created_at DESC LIMIT 5;
```

### Storage Bucket Kontrol
```bash
# Supabase Dashboard → Storage → Buckets
# kategori-gorselleri, marka-logolari, urun-gorselleri bucket'larını aç
# Yüklenen dosyaları gör ve public URL'lerini test et
```

---

## ✅ Tamamlama Checklist

### Görsel Yükleme
- [ ] Kategori görseli yüklendi ve görünüyor
- [ ] Marka logosu yüklendi ve görünüyor
- [ ] Ürün çoklu görsel yüklendi (min 3 görsel)
- [ ] Görseller veritabanına kaydedildi
- [ ] Görseller public URL ile erişilebilir
- [ ] Frontend'de görseller doğru görüntüleniyor

### PayTr Ödeme
- [ ] PayTr credentials Supabase'e eklendi
- [ ] Edge function environment variables güncel
- [ ] Test ödemesi başarılı
- [ ] Sipariş veritabanına kaydedildi
- [ ] Başarılı ödeme sayfası görüntülendi
- [ ] Başarısız ödeme senaryosu test edildi

---

## 📞 Yardım Gerekirse

**Edge Function Hatası**:
- Supabase Dashboard → Edge Functions → Logs
- Browser Console (F12) → Network tab
- Hata mesajını not al

**Database Hatası**:
- Supabase Dashboard → Table Editor
- Kolonların doğru olduğunu kontrol et
- RLS policy'lerin aktif olduğunu kontrol et

**Storage Hatası**:
- Supabase Dashboard → Storage
- Bucket'ların public olduğunu kontrol et
- Dosya boyutu limitlerini kontrol et

---

**Son Güncelleme**: 2025-11-05  
**Deployment URL**: https://77p1nkfr1tte.space.minimax.io
