-- Add email column to profiles to allow username->email lookup during login
alter table profiles add column if not exists email text unique;
