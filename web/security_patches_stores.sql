-- Enable security on stores just in case
alter table stores enable row level security;
-- Allow public read
create policy "Public can view stores" on stores for select using (true);
