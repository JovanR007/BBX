-- ============================================
-- BeyBracket Test Stores - Ready to Execute!
-- ============================================
-- 5 test stores with REAL Stack Auth user IDs
-- ============================================

-- Step 1: Insert Profiles WITH Emails (required for username login)
INSERT INTO profiles (id, username, display_name, email, bio, created_at, updated_at) VALUES
('6b3babb1-520d-4c57-808b-6c0e662de24d', 'takeshi.yamamoto', 'Takeshi Yamamoto', 'takeshi.yamamoto@test.com', 'Store owner from Tokyo, Japan', NOW(), NOW()),
('cbf5de05-b2e3-4fc5-b93e-320afe2db785', 'yuki.tanaka', 'Yuki Tanaka', 'yuki.tanaka@test.com', 'Store owner from Osaka, Japan', NOW(), NOW()),
('356cfac9-251a-4430-a381-367b7656adf6', 'oliver.thompson', 'Oliver Thompson', 'oliver.thompson@test.com', 'Store owner from London, United Kingdom', NOW(), NOW()),
('af0bee65-5371-4391-8a18-59a2026fbd93', 'emma.wilson', 'Emma Wilson', 'emma.wilson@test.com', 'Store owner from Toronto, Canada', NOW(), NOW()),
('c608078c-e46b-4921-a6de-c5457c1728a0', 'liam.obrien', 'Liam O''Brien', 'liam.obrien@test.com', 'Store owner from Sydney, Australia', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  email = EXCLUDED.email,
  bio = EXCLUDED.bio,
  updated_at = NOW();

-- Step 2: Insert Stores with Auto-Generated PINs
-- PINs will be random 4-digit numbers (1000-9999)
INSERT INTO stores (owner_id, name, slug, contact_number, address, pin, city, country) VALUES
('6b3babb1-520d-4c57-808b-6c0e662de24d', 'Akihabara Bey Shop', 'akihabara-bey-shop', '+81-3-5555-1234', '3-15-1 Sotokanda, Chiyoda-ku, Tokyo 101-0021', (1000 + floor(random() * 9000))::text, 'Tokyo', 'Japan'),
('cbf5de05-b2e3-4fc5-b93e-320afe2db785', 'Naniwa Battle Arena', 'naniwa-battle-arena', '+81-6-5555-6789', '1-1-3 Namba, Chuo-ku, Osaka 542-0076', (1000 + floor(random() * 9000))::text, 'Osaka', 'Japan'),
('356cfac9-251a-4430-a381-367b7656adf6', 'London Spin Arena', 'london-spin-arena', '+44-20-5555-3344', '25 Oxford Street, London W1D 2DW', (1000 + floor(random() * 9000))::text, 'London', 'United Kingdom'),
('af0bee65-5371-4391-8a18-59a2026fbd93', 'Toronto Beyblade Club', 'toronto-beyblade-club', '+1-416-555-7890', '789 Yonge Street, Toronto, ON M4W 2G8', (1000 + floor(random() * 9000))::text, 'Toronto', 'Canada'),
('c608078c-e46b-4921-a6de-c5457c1728a0', 'Sydney Burst Stadium', 'sydney-burst-stadium', '+61-2-5555-4567', '123 George Street, Sydney NSW 2000', (1000 + floor(random() * 9000))::text, 'Sydney', 'Australia')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  contact_number = EXCLUDED.contact_number,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  country = EXCLUDED.country;

-- ============================================
-- Verification
-- ============================================

-- View all inserted data
SELECT 
  s.name AS store_name,
  s.slug,
  s.city,
  s.country,
  s.pin,
  p.display_name AS owner,
  p.username
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE s.slug IN ('akihabara-bey-shop', 'naniwa-battle-arena', 'london-spin-arena', 'toronto-beyblade-club', 'sydney-burst-stadium')
ORDER BY s.name;

-- ============================================
-- Store Credentials Quick Reference
-- ============================================
-- 
-- NOTE: PINs are auto-generated randomly (1000-9999)
-- Check the database after running to get actual PINs
-- 
-- Takeshi Yamamoto (Tokyo)
--   Email: takeshi.yamamoto@test.com
--   Password: TestPass123!
--   Store: akihabara-bey-shop
--
-- Yuki Tanaka (Osaka)
--   Email: yuki.tanaka@test.com
--   Password: TestPass123!
--   Store: naniwa-battle-arena
--
-- Oliver Thompson (London)
--   Email: oliver.thompson@test.com
--   Password: TestPass123!
--   Store: london-spin-arena
--
-- Emma Wilson (Toronto)
--   Email: emma.wilson@test.com
--   Password: TestPass123!
--   Store: toronto-beyblade-club
--
-- Liam O'Brien (Sydney)
--   Email: liam.obrien@test.com
--   Password: TestPass123!
--   Store: sydney-burst-stadium
--
-- Query to get PINs after insert:
-- SELECT name, pin FROM stores WHERE slug IN 
-- ('akihabara-bey-shop', 'naniwa-battle-arena', 'london-spin-arena', 
--  'toronto-beyblade-club', 'sydney-burst-stadium');
--
-- ============================================
