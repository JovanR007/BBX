-- Enable Realtime for 'matches' table safely
BEGIN;
  DO $$
  BEGIN
    -- Check if publication exists
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime FOR TABLE matches;
    ELSE
      -- Check if table is already in publication
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'matches'
      ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE matches;
      END IF;
    END IF;
  END $$;
  -- Enable Identical Replica Identity for metadata updates?
  -- Default (Primary Key) is fine for UPDATE payload if metadata is updated directly
  ALTER TABLE matches REPLICA IDENTITY FULL; 
  -- FULL ensures the entire row is sent on UPDATE, which is useful for debugging but also ensures metadata is included
COMMIT;
