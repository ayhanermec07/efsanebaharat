-- Site ayarlarını saklamak için tablo
create table if not exists site_settings (
  id uuid default gen_random_uuid() primary key,
  setting_key text unique not null,
  setting_value jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Politikaları
alter table site_settings enable row level security;

-- Herkes okuyabilir (tema ayarları vb. için)
create policy "Site settings are viewable by everyone"
  on site_settings for select
  using (true);

-- Sadece adminler ekleyebilir/düzenleyebilir/silebilir
-- Not: admin_users tablosu zaten var olduğunu varsayıyoruz.
create policy "Site settings are modifiable by admins only"
  on site_settings for all
  using (
    exists (
      select 1 from admin_users
      where admin_users.user_id = auth.uid()
    )
  );

-- Varsayılan ayarları ekle (Eğer yoksa)
insert into site_settings (setting_key, setting_value)
values 
  ('theme', '{"primaryColor": "#ea580c", "secondaryColor": "#dc2626"}'::jsonb),
  ('logo', '{"url": null, "width": 120}'::jsonb)
on conflict (setting_key) do nothing;
