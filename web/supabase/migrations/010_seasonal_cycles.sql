-- Create seasons table
create table if not exists seasons (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone,
  is_active boolean default false,
  created_at timestamp with time zone default now()
);

-- Create player_seasonal_stats table to archive past season performance
create table if not exists player_seasonal_stats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  season_id uuid references seasons(id) on delete cascade not null,
  final_points integer not null default 0,
  final_tier text,
  matches_played integer default 0,
  tournaments_won integer default 0,
  created_at timestamp with time zone default now(),
  unique(user_id, season_id)
);

-- Enable RLS
alter table seasons enable row level security;
alter table player_seasonal_stats enable row level security;

-- Policies for seasons (Public read, Admin write)
create policy "Seasons are viewable by everyone"
  on seasons for select
  using (true);

-- Policies for seasonal stats (Public read)
create policy "Seasonal stats are viewable by everyone"
  on player_seasonal_stats for select
  using (true);

-- Insert the first "Pre-Season" or "Season 1"
-- We will assume everything before today was "Pre-Season" or just start "Season 1" now.
-- Let's create "Season 1: Age of Champions" starting now.
insert into seasons (name, start_date, is_active)
values ('Season 1: Age of Champions', now(), true);
