-- Bayi XML Feed Sistemi - Veritabanı Migration
-- Bu dosyayı Supabase SQL Editor'da çalıştırın

-- 1. urun_stoklari tablosuna xml_export kolonu ekleme
ALTER TABLE urun_stoklari 
ADD COLUMN IF NOT EXISTS xml_export BOOLEAN DEFAULT false;

-- 2. bayi_xml_settings tablosu oluşturma
CREATE TABLE IF NOT EXISTS bayi_xml_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  xml_token VARCHAR(64) NOT NULL UNIQUE,
  last_updated_at TIMESTAMPTZ,
  auto_update_enabled BOOLEAN DEFAULT false,
  update_interval_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS politikaları
ALTER TABLE bayi_xml_settings ENABLE ROW LEVEL SECURITY;

-- Sadece admin kullanıcılar görebilsin
CREATE POLICY "Admins can view xml settings" ON bayi_xml_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert xml settings" ON bayi_xml_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update xml settings" ON bayi_xml_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- İlk token'ı oluştur (admin panelinde değiştirilebilir)
INSERT INTO bayi_xml_settings (xml_token, auto_update_enabled, update_interval_minutes)
VALUES (
  encode(gen_random_bytes(32), 'hex'),
  false,
  15
) ON CONFLICT DO NOTHING;

-- Yorum: Bu migration'ı çalıştırdıktan sonra admin panelindeki XML Yönetimi sayfasını kullanabilirsiniz.
