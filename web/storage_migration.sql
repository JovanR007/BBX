-- 1. Create a storage bucket for avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Enable RLS
alter table storage.objects enable row level security;

-- 3. Policy: Public can view avatars
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- 4. Policy: Authenticated users can upload avatars
create policy "Authenticated Upload"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

-- 5. Policy: Users can update their own avatars (optional, depends on file path strategy)
-- Assuming file path is "userId/filename" or similar
create policy "User Update Own"
  on storage.objects for update
  using ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );

-- 6. Policy: Users can delete their own avatars
create policy "User Delete Own"
  on storage.objects for delete
  using ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );
