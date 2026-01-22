-- Add 'dropped' column to participants
alter table participants add column if not exists dropped boolean default false;

-- Index for faster filtering (since we will query active players often)
create index if not exists idx_participants_dropped on participants(dropped);
