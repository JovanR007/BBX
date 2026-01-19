-- Redefine stores table for Owner-based (Superadmin) provisioning
drop table if exists stores cascade;

create table stores (
  id uuid default gen_random_uuid() primary key,
  owner_id text unique not null, -- Stack Auth User ID
  name text not null,
  slug text unique not null,
  description text,
  contact_number text,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure tournaments has store_id
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'tournaments' and column_name = 'store_id') then
    alter table tournaments add column store_id uuid references stores(id);
  end if; 
end $$;

-- RLS Policies
alter table stores enable row level security;

-- Public read access
create policy "Public stores are viewable by everyone" on stores for select using (true);

-- Only Service Role (Server Actions) can insert/update for now.
-- We will handle "Owner" permission checks in the Server Action code itself 
-- for maximum flexibility with Stack Auth.
