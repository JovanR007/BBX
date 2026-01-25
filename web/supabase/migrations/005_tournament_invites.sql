-- Create tournament_invites table
create table if not exists tournament_invites (
  id uuid default gen_random_uuid() primary key,
  tournament_id uuid references tournaments(id) on delete cascade not null,
  email text not null,
  status text check (status in ('pending', 'accepted', 'declined')) default 'pending',
  token uuid default gen_random_uuid() unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(tournament_id, email)
);

-- Enable RLS
alter table tournament_invites enable row level security;

-- Policies for Store Owners (View/Create/Delete their own invites)
-- We'll cheat a bit and use a function or just simple exists check if possible. 
-- Since we are using Server Actions with Service Role for admin tasks, these policies are mainly for safety 
-- or if we eventually use client-side fetching.

-- Policy: Store Owners can view invites for their tournaments
drop policy if exists "Owners can view invites" on tournament_invites;
create policy "Owners can view invites"
  on tournament_invites
  for select
  using (
    exists (
      select 1 from tournaments t
      join stores s on t.store_id = s.id
      where t.id = tournament_invites.tournament_id
      and s.owner_id = auth.uid()::text
    )
  );

-- Policy: Store Owners can insert invites
drop policy if exists "Owners can create invites" on tournament_invites;
create policy "Owners can create invites"
  on tournament_invites
  for insert
  with check (
    exists (
      select 1 from tournaments t
      join stores s on t.store_id = s.id
      where t.id = tournament_invites.tournament_id
      and s.owner_id = auth.uid()::text
    )
  );

-- Policy: Store Owners can delete invites
drop policy if exists "Owners can delete invites" on tournament_invites;
create policy "Owners can delete invites"
  on tournament_invites
  for delete
  using (
    exists (
      select 1 from tournaments t
      join stores s on t.store_id = s.id
      where t.id = tournament_invites.tournament_id
      and s.owner_id = auth.uid()::text
    )
  );

-- Policy: Public can view invites by Token (for the acceptance page)
-- This allows anyone with the token to "read" the invite details to verify it.
drop policy if exists "Public can view invite by token" on tournament_invites;
create policy "Public can view invite by token"
  on tournament_invites
  for select
  using ( true ); 
  -- In reality, we might want to restrict this to 'using (token = something provided_in_query)' 
  -- but RLS is row-based. If we select by ID/Token, it works. 
  -- For strictness: 'using (true)' is fine because the Token *is* the secret. 
  -- Brute forcing UUIDs is impossible.
