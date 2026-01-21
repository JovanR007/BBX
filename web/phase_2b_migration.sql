-- Add display_name_updated_at to profiles
alter table profiles add column if not exists display_name_updated_at timestamp with time zone;

-- Create avatars bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Create store-logos bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('store-logos', 'store-logos', true)
on conflict (id) do nothing;

-- RLS is typically enabled by default on storage.objects.
-- Skipping 'alter table storage.objects enable row level security;' to avoid permission errors.

-- Policies for store-logos
-- Drop first to allow re-running
drop policy if exists "Public Access Store Logos" on storage.objects;
-- Policies for avatars (ensure these exist too)
drop policy if exists "Public Access Avatars" on storage.objects;
create policy "Public Access Avatars"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

drop policy if exists "Public Upload Avatars" on storage.objects;
create policy "Public Upload Avatars"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' );

-- Policies for store-logos
drop policy if exists "Public Access Store Logos" on storage.objects;
create policy "Public Access Store Logos"
  on storage.objects for select
  using ( bucket_id = 'store-logos' );

drop policy if exists "Public Upload Store Logos" on storage.objects;
create policy "Public Upload Store Logos"
  on storage.objects for insert
  with check ( bucket_id = 'store-logos' );

-- Users can update/delete their own uploads (matching folder/user pattern if used, 
-- or just allow authenticated for simplicity if we don't strictly separate folders yet. 
-- For safety, we can stick to authenticated inserts and public reads for now).
