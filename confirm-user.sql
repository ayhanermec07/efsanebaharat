-- Kullanıcıyı Manuel Onaylama Script'i
-- Bu script'i Supabase SQL Editor'de çalıştırın

-- Tüm onaylanmamış kullanıcıları listele
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users
WHERE email_confirmed_at IS NULL
ORDER BY created_at DESC;

-- Belirli bir kullanıcıyı onayla (e-posta ile)
UPDATE auth.users
SET 
    email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email = 'BURAYA_EMAIL_YAZIN'  -- Örnek: 'test@example.com'
AND email_confirmed_at IS NULL;

-- VEYA: Tüm kullanıcıları toplu onayla (TEST İÇİN)
UPDATE auth.users
SET 
    email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Kontrol: Onaylanan kullanıcıları listele
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
