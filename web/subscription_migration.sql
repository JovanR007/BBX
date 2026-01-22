-- Migration: Add plan column to stores table
-- Default to 'free' for all existing and new stores

ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro'));

-- OPTIONAL: Set a specific store to pro if needed
-- UPDATE stores SET plan = 'pro' WHERE slug = 'some-store-slug';
