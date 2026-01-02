
create table if not exists kampanya_kodlari (
  id uuid default gen_random_uuid() primary key,
  kampanya_id uuid references kampanyalar(id) on delete cascade not null,
  kod text not null unique,
  kullanildi boolean default false,
  kullanici_id uuid references auth.users(id),
  kullanilma_tarihi timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table kampanya_kodlari enable row level security;

-- Admin can do everything
create policy "Admin can do everything on kampanya_kodlari"
  on kampanya_kodlari
  for all
  using (
    exists (
      select 1 from admin_users
      where user_id = auth.uid()
    )
  );

-- Users can read their own used codes or unused codes (if we want them to check validity, but usually we check via function or admin api, but for now let's allow public read for validity check if needed, or restrict)
-- Actually, for `KampanyaUygula` to check, we might need read access.
-- But we don't want users to list all codes.
-- So maybe only allow reading specific code? RLS doesn't easily support "read if you know the ID/Code".
-- We can use a secure function to check code validity, or allow reading but not listing?
-- Supabase RLS: "using (true)" allows listing.
-- We probably want to restrict listing.
-- Let's allow read for authenticated users for now, but maybe restrict to only checking existence?
-- Better approach: Create a function `check_campaign_code(code text)` that returns campaign details if valid.
-- But for now, to keep it simple and consistent with existing `kampanyalar` (which is public read), we might need to allow read.
-- However, `kampanya_kodlari` contains sensitive generated codes. We shouldn't expose the list.
-- So, I will NOT add a public read policy. I will use `supabase.rpc` or a secure query if possible.
-- Wait, `KampanyaUygula` uses `supabase.from('kampanyalar').select('*').eq('kod', ...)`
-- If I want to do `supabase.from('kampanya_kodlari').select('*').eq('kod', ...)` I need read policy.
-- If I add a policy `using (true)`, anyone can list all codes. Bad.
-- If I add a policy `using (kod = current_setting('my.app.current_code', true))`, that's complex.
-- I'll create a database function `validate_campaign_code` to securely check the code.

create or replace function validate_campaign_code(p_kod text)
returns table (
  kampanya_id uuid,
  kod text,
  kullanildi boolean,
  kampanya_data jsonb
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    kk.kampanya_id,
    kk.kod,
    kk.kullanildi,
    to_jsonb(k.*) as kampanya_data
  from kampanya_kodlari kk
  join kampanyalar k on k.id = kk.kampanya_id
  where kk.kod = p_kod;
end;
$$;
