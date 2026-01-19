-- Enable RLS on tournaments to be safe (if not already)
alter table tournaments enable row level security;

-- Policy: Allow public read access to all tournaments
-- This is required for the Home Page, Store Page, and Dashboard to list them.
create policy "Public tournaments are viewable by everyone" 
on tournaments for select 
using (true);
