-- Create stores table
create table if not exists stores (
  id uuid default gen_random_uuid() primary key,
  stack_team_id text unique not null,
  name text not null,
  slug text unique not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add store_id to tournaments
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'tournaments' and column_name = 'store_id') then
    alter table tournaments add column store_id uuid references stores(id);
  end if; 
end $$;

-- Policies?
-- Since we use Server Actions with Service Role for writes (initially), we might not need RLS yet,
-- but good practice to enable it.
alter table stores enable row level security;

-- Policy: Allow read access to everyone (public profiles)
create policy "Public stores are viewable by everyone" on stores for select using (true);
