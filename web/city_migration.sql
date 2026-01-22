-- Add city and country columns to stores table
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS country text DEFAULT 'Philippines';

-- Create an index for faster searching by city
CREATE INDEX IF NOT EXISTS idx_stores_city ON stores(city);
