-- Find the slug for Hanma Hobby Store
SELECT id, name, slug, plan, subscription_tier 
FROM stores 
WHERE name ILIKE '%Hanma%' OR slug ILIKE '%baki%';
