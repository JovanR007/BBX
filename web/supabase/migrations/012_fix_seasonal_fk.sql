-- 1. Drop the constraint if it partially exists or failed
ALTER TABLE player_seasonal_stats DROP CONSTRAINT IF EXISTS player_seasonal_stats_user_id_fkey;

-- 2. Alter the user_id column to 'text' to match the profiles table
ALTER TABLE player_seasonal_stats
ALTER COLUMN user_id TYPE text;

-- 3. Add the Foreign Key reference now that types match (text matches text)
ALTER TABLE player_seasonal_stats
ADD CONSTRAINT player_seasonal_stats_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;
