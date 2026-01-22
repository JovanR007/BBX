-- Diagnostic: Check if everything is linked correctly for the 'baki' store

-- 1. Check the baki store details
SELECT id, name, slug, plan, subscription_tier 
FROM stores 
WHERE slug = 'baki';

-- 2. Check the tournament's link to the store
-- Replace 'YOUR_TOURNAMENT_ID' with the ID from your URL
SELECT id, name, store_id 
FROM tournaments 
WHERE id = 'PASTE_TOURNAMENT_ID_HERE';

-- 3. Verify if the tournament's store_id actually points to the baki store
SELECT t.name as tournament_name, s.name as store_name, s.plan
FROM tournaments t
JOIN stores s ON t.store_id = s.id
WHERE t.id = 'PASTE_TOURNAMENT_ID_HERE';
