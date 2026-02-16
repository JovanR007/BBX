-- Update cut_size constraint to allow 12, 24, 48
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_cut_size_check;
ALTER TABLE tournaments ADD CONSTRAINT tournaments_cut_size_check CHECK (cut_size IN (4, 8, 12, 16, 24, 32, 48, 64));
