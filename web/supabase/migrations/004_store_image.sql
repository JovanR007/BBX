
-- Add image_url to stores table
alter table stores add column if not exists image_url text;
