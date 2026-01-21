-- 1. Create Profiles Table (Linked to Stack Auth ID)
create table if not exists profiles (
  id text primary key not null, -- Matches Stack Auth User ID
  username text unique, -- Public Handle (e.g. "JovanR007")
  display_name text, -- Friendly Name
  bio text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Link Participants to Profiles
alter table participants add column if not exists user_id text references profiles(id) on delete set null;

-- 3. RLS Policies
alter table profiles enable row level security;

-- Public can read profiles
create policy "Public can view profiles" on profiles for select using (true);

-- Users can update their own profile
-- Note: You need a way to check current_user in Supabase if using custom auth, 
-- but since we use Stack + Supabase Admin for writes, this policy is mostly for future-proofing or direct client access.
-- If using Supabase Auth, it would be: using ( auth.uid()::text = id );
-- For now, allow public select, and we restrict writes via Server Actions.

-- 4. Indexes
create index if not exists idx_participants_user_id on participants(user_id);
create index if not exists idx_profiles_username on profiles(username);
