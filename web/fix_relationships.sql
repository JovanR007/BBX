-- 1. Ensure the Relationship Exists
DO $$ 
BEGIN 
  -- Check if foreign key exists, if not, add it
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournaments_store_id_fkey') THEN 
    ALTER TABLE "tournaments" 
    ADD CONSTRAINT "tournaments_store_id_fkey" 
    FOREIGN KEY ("store_id") REFERENCES "stores" ("id"); 
  END IF; 
END $$;

-- 2. Force Supabase API (PostgREST) to refresh its schema cache
-- This makes it 'see' the new Foreign Key
NOTIFY pgrst, 'reload config';
