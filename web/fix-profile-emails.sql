-- Quick fix: Update Oliver's email in the database
-- Run this if you already ran the profiles INSERT without email

UPDATE profiles 
SET email = 'oliver.thompson@test.com' 
WHERE username = 'oliver.thompson';

UPDATE profiles 
SET email = 'takeshi.yamamoto@test.com' 
WHERE username = 'takeshi.yamamoto';

UPDATE profiles 
SET email = 'yuki.tanaka@test.com' 
WHERE username = 'yuki.tanaka';

UPDATE profiles 
SET email = 'emma.wilson@test.com' 
WHERE username = 'emma.wilson';

UPDATE profiles 
SET email = 'liam.obrien@test.com' 
WHERE username = 'liam.obrien';

-- Verify the update
SELECT id, username, email FROM profiles 
WHERE username IN ('oliver.thompson', 'takeshi.yamamoto', 'yuki.tanaka', 'emma.wilson', 'liam.obrien');
