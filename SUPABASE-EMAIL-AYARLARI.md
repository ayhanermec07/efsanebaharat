# Supabase E-posta Doğrulama Ayarları

## Mevcut Durum

Uygulamanız her e-posta adresi ile kayıt oluşturabilir, ancak Supabase'in varsayılan ayarlarına göre:

- ✅ Kullanıcı kaydı oluşturulur
- 📧 E-posta doğrulama linki gönderilir
- ⚠️ E-posta doğrulanmadan da giriş yapılabilir (varsayılan)

## E-posta Doğrulamayı Tamamen Devre Dışı Bırakma

Eğer e-posta doğrulama istemiyorsanız:

### Yöntem 1: Supabase Dashboard (Önerilen)

1. [Supabase Dashboard](https://app.supabase.com) > Projeniz
2. **Authentication** > **Settings** > **Email Auth**
3. **"Enable email confirmations"** seçeneğini **KAPATIN**
4. **Save** butonuna tıklayın

### Yöntem 2: Supabase CLI

```bash
# supabase/config.toml dosyasını düzenleyin
[auth.email]
enable_signup = true
enable_confirmations = false  # Bu satırı false yapın
```

## E-posta Doğrulama ile Çalışma (Önerilen)

E-posta doğrulama güvenlik için önemlidir. Mevcut ayarlarla:

### Kullanıcı Deneyimi:
1. ✅ Kullanıcı kayıt olur
2. 📧 E-posta doğrulama linki alır
3. ✅ Doğrulamadan da giriş yapabilir
4. 🔒 Bazı hassas işlemler için doğrulama gerekebilir

### Kod Tarafında Kontrol:

```typescript
// Kullanıcının e-postasının doğrulanıp doğrulanmadığını kontrol et
const { data: { user } } = await supabase.auth.getUser()

if (user && !user.email_confirmed_at) {
  // E-posta doğrulanmamış
  console.log('E-posta doğrulanmamış')
}
```

## E-posta Şablonlarını Özelleştirme

### Supabase Dashboard:
1. **Authentication** > **Email Templates**
2. Şablonları Türkçe'ye çevirin
3. Marka logonuzu ekleyin

### Örnek Şablon:

```html
<h2>Hoş Geldiniz!</h2>
<p>Efsane Baharat'a kayıt olduğunuz için teşekkür ederiz.</p>
<p>E-posta adresinizi doğrulamak için aşağıdaki linke tıklayın:</p>
<a href="{{ .ConfirmationURL }}">E-postamı Doğrula</a>
```

## Test Etme

### 1. Yeni Kullanıcı Kaydı:
```bash
# Tarayıcıda
http://localhost:5174/kayit

# Test e-postaları:
test1@example.com
test2@example.com
```

### 2. E-posta Doğrulama Kontrolü:
```sql
-- Supabase SQL Editor'de
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
```

## Sorun Giderme

### "User already registered" Hatası:
- ✅ Normal davranış
- Bu e-posta zaten kayıtlı
- Farklı bir e-posta kullanın veya giriş yapın

### E-posta Gelmiyor:
1. Spam klasörünü kontrol edin
2. Supabase Dashboard > Logs > Auth Logs kontrol edin
3. E-posta sağlayıcı ayarlarını kontrol edin

### E-posta Doğrulama Linki Çalışmıyor:
1. Link'in doğru redirect URL'e sahip olduğundan emin olun
2. Supabase Dashboard > Authentication > URL Configuration
3. **Site URL**: `http://localhost:5174` (development)
4. **Redirect URLs**: `http://localhost:5174/**` ekleyin

## Production Ayarları

Production'a geçerken:

1. **Site URL'i güncelleyin**: `https://yourdomain.com`
2. **Redirect URLs ekleyin**: `https://yourdomain.com/**`
3. **E-posta şablonlarını özelleştirin**
4. **SMTP ayarlarını yapılandırın** (opsiyonel, daha güvenilir e-posta için)

## Güvenlik Notları

⚠️ **Önemli:**
- E-posta doğrulama güvenlik katmanıdır
- Hassas işlemler için doğrulama zorunlu tutulabilir
- Rate limiting aktif tutun (spam önleme)
- Güçlü şifre politikası uygulayın

## Mevcut Ayarlar

Uygulamanızda:
- ✅ Her e-posta ile kayıt oluşturulabilir
- ✅ E-posta doğrulama linki gönderilir
- ✅ Doğrulamadan da giriş yapılabilir
- ✅ Kullanıcı bilgileri `musteriler` tablosuna kaydedilir
- ✅ Varsayılan fiyat grubu atanır

## İletişim

Sorun yaşarsanız:
1. Supabase Dashboard > Logs kontrol edin
2. Tarayıcı konsolunu kontrol edin (F12)
3. `auth.users` tablosunu SQL ile kontrol edin
