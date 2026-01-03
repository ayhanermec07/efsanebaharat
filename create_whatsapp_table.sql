-- Create whatsapp_numbers table
create table if not exists whatsapp_numbers (
  id uuid default gen_random_uuid() primary key,
  phone_number text not null,
  name text,
  is_active boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table whatsapp_numbers enable row level security;

create policy "Whatsapp numbers are viewable by everyone"
  on whatsapp_numbers for select
  using (true);

create policy "Whatsapp numbers are editable by admins only"
  on whatsapp_numbers for all
  using (
    exists (
      select 1 from admin_users
      where admin_users.user_id = auth.uid()
    )
  );

-- Function to ensure only one active number
create or replace function maintain_single_active_whatsapp()
returns trigger as $$
begin
  if new.is_active = true then
    update whatsapp_numbers
    set is_active = false
    where id <> new.id and is_active = true;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger set_single_active_whatsapp
  before insert or update of is_active on whatsapp_numbers
  for each row
  execute function maintain_single_active_whatsapp();
