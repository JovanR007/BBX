-- Enable RLS on core tables
alter table tournaments enable row level security;
alter table participants enable row level security;
alter table matches enable row level security;
alter table match_events enable row level security;

-- Policies for Tournaments
-- Public can view
create policy "Public can view tournaments" on tournaments for select using (true);
-- Only the Store Owner (linked via user_id) can insert/update/delete
-- Assuming 'stores' table links owner_id to auth.uid() or similar logic. 
-- For now, we rely on the server-side checks in actions.js, but these DB policies reflect defense-in-depth where possible.

-- Policies for Participants
create policy "Public can view participants" on participants for select using (true);

-- Policies for Matches
create policy "Public can view matches" on matches for select using (true);
