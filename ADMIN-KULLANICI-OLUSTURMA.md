# Admin Kullanıcı Oluşturma Kılavuzu

## Yöntem 1: HTML Form ile (Önerilen - En Kolay)

1. `create-admin.html` dosyasını tarayıcıda açın
2. E-posta ve şifre girin
3. "Admin Kullanıcı Oluştur" butonuna tıklayın
4. E-posta doğrulama linkini kontrol edin

**Avantajlar:**
- ✅ Tek tıkla admin oluşturma
- ✅ Otomatik admin_users tablosuna ekleme
- ✅ Kullanıcı dostu arayüz

## Yöntem 2: Supabase Dashboard (Önerilen - En Güvenli)

### Adım 1: Kullanıcı Oluştur
1. [Supabase Dashboard](https://app.supabase.com) > Projeniz > Authentication > Users
2. "Add User" butonuna tıklayın
3. E-posta ve şifre girin
4. "Auto Confirm User" seçeneğini işaretleyin
5. "Create User" butonuna tıklayın
6. Oluşturulan kullanıcının **User ID**'sini kopyalayın

### Adım 2: Admin Yetkisi Ver
1. Supabase Dashboard > SQL Editor
2. Aşağıdaki SQL'i çalıştırın:

```sql
INSERT INTO admin_users (user_id, email, aktif)
VALUES ('KOPYALADIGINIZ_USER_ID', 'admin@efsanebaharat.com', true);
```

## Yöntem 3: SQL Script ile

1. `create-admin.sql` dosyasını açın
2. E-posta ve şifre bilgilerini düzenleyin
3. Supabase Dashboard > SQL Editor'de çalıştırın

**Not:** Bu yöntem için önce Supabase Dashboard'dan kullanıcı oluşturmanız gerekir.

## Yöntem 4: Supabase CLI ile

```bash
# Supabase CLI kurulu olmalı
supabase functions deploy create-admin-user

# Fonksiyonu çağır
curl -X POST https://uvagzvevktzzfrzkvtsd.supabase.co/functions/v1/create-admin-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "email": "admin@efsanebaharat.com",
    "password": "GucluSifre123!"
  }'
```

## Admin Kullanıcılarını Kontrol Etme

### SQL ile:
```sql
SELECT 
    au.id,
    au.email,
    au.aktif,
    au.created_at,
    u.email as auth_email
FROM admin_users au
LEFT JOIN auth.users u ON au.user_id = u.id
ORDER BY au.created_at DESC;
```

### Uygulama ile:
1. Uygulamaya giriş yapın
2. `/admin` sayfasına gidin
3. Eğer admin değilseniz, erişim reddedilecektir

## Mevcut Admin Kullanıcıları

Veritabanınızda şu anda **2 admin kullanıcı** var (database analysis'e göre).

## Güvenlik Notları

⚠️ **Önemli:**
- Admin şifrelerini güçlü tutun (min. 8 karakter, büyük/küçük harf, rakam, özel karakter)
- Admin e-postalarını güvenli tutun
- Gereksiz admin hesaplarını silin
- Admin hesaplarını düzenli olarak kontrol edin

## Sorun Giderme

**"User already registered" hatası:**
- Bu e-posta zaten kayıtlı. Farklı bir e-posta deneyin veya mevcut kullanıcıya admin yetkisi verin.

**"Email not confirmed" hatası:**
- Supabase Dashboard'dan kullanıcıyı manuel olarak onaylayın
- Authentication > Users > Kullanıcı > "Confirm email"

**Admin paneline erişemiyorum:**
- `admin_users` tablosunda kaydınızın olduğundan emin olun
- `aktif` alanının `true` olduğunu kontrol edin
- Tarayıcı cache'ini temizleyin ve yeniden giriş yapın

## İletişim

Sorun yaşarsanız:
1. Tarayıcı konsolunu kontrol edin (F12)
2. Supabase logs'ları kontrol edin
3. `admin_users` tablosunu SQL ile kontrol edin
