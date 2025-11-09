-- Admin Kullanıcı Oluşturma Script'i
-- Bu script'i Supabase SQL Editor'de çalıştırın

-- 1. ADIM: Kullanıcı bilgilerini ayarlayın
-- Aşağıdaki değerleri kendi bilgilerinizle değiştirin
DO $$
DECLARE
    admin_email TEXT := 'admin@efsanebaharat.com';  -- Buraya admin e-postasını yazın
    admin_password TEXT := 'Admin123!';              -- Buraya güçlü bir şifre yazın
    new_user_id UUID;
BEGIN
    -- 2. ADIM: Auth kullanıcısı oluştur
    -- Not: Bu işlem için Supabase Dashboard > Authentication > Users > Add User kullanmanız önerilir
    -- Çünkü auth.users tablosuna doğrudan insert yapmak karmaşıktır
    
    -- Eğer kullanıcı zaten varsa, user_id'yi al
    SELECT id INTO new_user_id
    FROM auth.users
    WHERE email = admin_email;
    
    -- Kullanıcı bulunamazsa hata ver
    IF new_user_id IS NULL THEN
        RAISE EXCEPTION 'Kullanıcı bulunamadı. Önce Supabase Dashboard''dan kullanıcı oluşturun: %', admin_email;
    END IF;
    
    -- 3. ADIM: Admin_users tablosuna ekle
    INSERT INTO admin_users (user_id, email, aktif)
    VALUES (new_user_id, admin_email, true)
    ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email,
        aktif = EXCLUDED.aktif,
        updated_at = NOW();
    
    RAISE NOTICE 'Admin kullanıcı başarıyla oluşturuldu: % (ID: %)', admin_email, new_user_id;
END $$;

-- VEYA: Eğer user_id'yi biliyorsanız, doğrudan ekleyin:
-- INSERT INTO admin_users (user_id, email, aktif)
-- VALUES ('USER_ID_BURAYA', 'admin@efsanebaharat.com', true);

-- Kontrol: Admin kullanıcıları listele
SELECT 
    au.id,
    au.user_id,
    au.email,
    au.aktif,
    au.created_at,
    u.email as auth_email,
    u.created_at as auth_created_at
FROM admin_users au
LEFT JOIN auth.users u ON au.user_id = u.id
ORDER BY au.created_at DESC;
