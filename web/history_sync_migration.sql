-- Add history_synced column to profiles to prevent double-claiming
alter table profiles add column if not exists history_synced boolean default false;
