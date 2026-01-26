-- Add checked_in column to participants
alter table participants add column if not exists checked_in boolean default false;

-- Index for performance
create index if not exists idx_participants_checked_in on participants(checked_in);
