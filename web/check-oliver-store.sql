-- Diagnostic: Check if Oliver has a store and profile properly set up

-- 1. Check Oliver's profile
SELECT id, username, email, display_name 
FROM profiles 
WHERE username = 'oliver.thompson';

-- 2. Check if Oliver owns a store
SELECT s.id, s.name, s.slug, s.owner_id, p.username
FROM stores s
LEFT JOIN profiles p ON s.owner_id = p.id
WHERE p.username = 'oliver.thompson';

-- 3. Check all test users' stores
SELECT 
  p.username,
  p.email,
  s.name AS store_name,
  s.slug
FROM profiles p
LEFT JOIN stores s ON s.owner_id = p.id
WHERE p.username IN ('oliver.thompson', 'takeshi.yamamoto', 'yuki.tanaka', 'emma.wilson', 'liam.obrien')
ORDER BY p.username;
