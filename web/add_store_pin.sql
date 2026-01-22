-- Add PIN column to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS pin text;

-- Generate random 4-digit PINs for existing stores (1000-9999)
UPDATE stores 
SET pin = (floor(random() * (9999-1000+1) + 1000))::text 
WHERE pin IS NULL;

-- Optional: set a robust default for new rows if needed, or handle in app logic
-- ALTER TABLE stores ALTER COLUMN pin SET DEFAULT (floor(random() * (9999-1000+1) + 1000))::text;
