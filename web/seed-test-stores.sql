-- ============================================
-- BeyBracket Test Stores Seed Data
-- ============================================
-- 
-- IMPORTANT: You MUST replace the placeholder user IDs with real Stack Auth IDs
-- 
-- HOW TO GET USER IDs:
-- 1. Have each test user sign up at /sign-up
-- 2. Check Stack Auth Dashboard for their user IDs
-- 3. Find & Replace 'USER_ID_XX' with actual IDs below
--
-- OR: Use this SQL to see existing profiles:
-- SELECT id, username, display_name FROM profiles;
--
-- ============================================

-- Step 1: Insert Profiles (links Stack Auth users to our system)
-- These IDs must match Stack Auth user IDs

INSERT INTO profiles (id, username, display_name, bio, created_at, updated_at) VALUES
('USER_ID_01', 'marcus.rodriguez', 'Marcus Rodriguez', 'Store owner from Los Angeles, United States', NOW(), NOW()),
('USER_ID_02', 'sarah.chen', 'Sarah Chen', 'Store owner from New York, United States', NOW(), NOW()),
('USER_ID_03', 'takeshi.yamamoto', 'Takeshi Yamamoto', 'Store owner from Tokyo, Japan', NOW(), NOW()),
('USER_ID_04', 'yuki.tanaka', 'Yuki Tanaka', 'Store owner from Osaka, Japan', NOW(), NOW()),
('USER_ID_05', 'oliver.thompson', 'Oliver Thompson', 'Store owner from London, United Kingdom', NOW(), NOW()),
('USER_ID_06', 'emma.wilson', 'Emma Wilson', 'Store owner from Toronto, Canada', NOW(), NOW()),
('USER_ID_07', 'liam.obrien', 'Liam O''Brien', 'Store owner from Sydney, Australia', NOW(), NOW()),
('USER_ID_08', 'hans.mueller', 'Hans Mueller', 'Store owner from Berlin, Germany', NOW(), NOW()),
('USER_ID_09', 'sophie.dubois', 'Sophie Dubois', 'Store owner from Paris, France', NOW(), NOW()),
('USER_ID_10', 'minjun.kim', 'Min-jun Kim', 'Store owner from Seoul, South Korea', NOW(), NOW()),
('USER_ID_11', 'carlos.silva', 'Carlos Silva', 'Store owner from São Paulo, Brazil', NOW(), NOW()),
('USER_ID_12', 'diego.martinez', 'Diego Martinez', 'Store owner from Mexico City, Mexico', NOW(), NOW()),
('USER_ID_13', 'wei.zhang', 'Wei Zhang', 'Store owner from Singapore, Singapore', NOW(), NOW()),
('USER_ID_14', 'marco.rossi', 'Marco Rossi', 'Store owner from Rome, Italy', NOW(), NOW()),
('USER_ID_15', 'isabel.garcia', 'Isabel Garcia', 'Store owner from Barcelona, Spain', NOW(), NOW()),
('USER_ID_16', 'josh.santos', 'Josh Santos', 'Store owner from Manila, Philippines', NOW(), NOW()),
('USER_ID_17', 'arjun.patel', 'Arjun Patel', 'Store owner from Mumbai, India', NOW(), NOW()),
('USER_ID_18', 'somchai.wong', 'Somchai Wong', 'Store owner from Bangkok, Thailand', NOW(), NOW()),
('USER_ID_19', 'ahmad.hassan', 'Ahmad Hassan', 'Store owner from Kuala Lumpur, Malaysia', NOW(), NOW()),
('USER_ID_20', 'lars.vandijk', 'Lars van Dijk', 'Store owner from Amsterdam, Netherlands', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  bio = EXCLUDED.bio,
  updated_at = NOW();

-- Step 2: Insert Stores
-- Each store gets a random 4-digit PIN

INSERT INTO stores (owner_id, name, slug, contact_number, address, pin, city, country, created_at, updated_at) VALUES
('USER_ID_01', 'Beyblade Arena LA', 'beyblade-arena-la', '+1-310-555-0142', '1250 Spring St, Los Angeles, CA 90012', '1234', 'Los Angeles', 'United States', NOW(), NOW()),
('USER_ID_02', 'NYC Blade Masters', 'nyc-blade-masters', '+1-212-555-0198', '456 Broadway, New York, NY 10013', '1567', 'New York', 'United States', NOW(), NOW()),
('USER_ID_03', 'Akihabara Bey Shop', 'akihabara-bey-shop', '+81-3-5555-1234', '3-15-1 Sotokanda, Chiyoda-ku, Tokyo 101-0021', '2345', 'Tokyo', 'Japan', NOW(), NOW()),
('USER_ID_04', 'Naniwa Battle Arena', 'naniwa-battle-arena', '+81-6-5555-6789', '1-1-3 Namba, Chuo-ku, Osaka 542-0076', '3456', 'Osaka', 'Japan', NOW(), NOW()),
('USER_ID_05', 'London Spin Arena', 'london-spin-arena', '+44-20-5555-3344', '25 Oxford Street, London W1D 2DW', '4567', 'London', 'United Kingdom', NOW(), NOW()),
('USER_ID_06', 'Toronto Beyblade Club', 'toronto-beyblade-club', '+1-416-555-7890', '789 Yonge Street, Toronto, ON M4W 2G8', '5678', 'Toronto', 'Canada', NOW(), NOW()),
('USER_ID_07', 'Sydney Burst Stadium', 'sydney-burst-stadium', '+61-2-5555-4567', '123 George Street, Sydney NSW 2000', '6789', 'Sydney', 'Australia', NOW(), NOW()),
('USER_ID_08', 'Berlin Blade Factory', 'berlin-blade-factory', '+49-30-5555-8901', 'Alexanderplatz 1, 10178 Berlin', '7890', 'Berlin', 'Germany', NOW(), NOW()),
('USER_ID_09', 'Paris Spinning Elite', 'paris-spinning-elite', '+33-1-5555-2345', '15 Rue de Rivoli, 75001 Paris', '8901', 'Paris', 'France', NOW(), NOW()),
('USER_ID_10', 'Gangnam Battle Zone', 'gangnam-battle-zone', '+82-2-5555-6789', '456 Gangnam-daero, Gangnam-gu, Seoul 06000', '9012', 'Seoul', 'South Korea', NOW(), NOW()),
('USER_ID_11', 'São Paulo Bey Champions', 'sao-paulo-bey-champions', '+55-11-5555-3456', 'Rua Augusta 1234, São Paulo, SP 01304-001', '1123', 'São Paulo', 'Brazil', NOW(), NOW()),
('USER_ID_12', 'Arena Beyblade CDMX', 'arena-beyblade-cdmx', '+52-55-5555-7890', 'Av. Paseo de la Reforma 222, CDMX 06600', '2234', 'Mexico City', 'Mexico', NOW(), NOW()),
('USER_ID_13', 'Marina Bay Bladers', 'marina-bay-bladers', '+65-6555-1234', '10 Bayfront Avenue, Singapore 018956', '3345', 'Singapore', 'Singapore', NOW(), NOW()),
('USER_ID_14', 'Colosseum Spin Arena', 'colosseum-spin-arena', '+39-06-5555-4321', 'Via dei Fori Imperiali 1, 00186 Roma', '4456', 'Rome', 'Italy', NOW(), NOW()),
('USER_ID_15', 'Barcelona Bey Hub', 'barcelona-bey-hub', '+34-93-555-6789', 'La Rambla 45, 08002 Barcelona', '5567', 'Barcelona', 'Spain', NOW(), NOW()),
('USER_ID_16', 'Manila Legends Arena', 'manila-legends-arena', '+63-2-555-8901', 'EDSA corner Ortigas Ave, Mandaluyong, Metro Manila', '6678', 'Manila', 'Philippines', NOW(), NOW()),
('USER_ID_17', 'Mumbai Burst Center', 'mumbai-burst-center', '+91-22-5555-2345', 'Marine Drive, Mumbai, Maharashtra 400020', '7789', 'Mumbai', 'India', NOW(), NOW()),
('USER_ID_18', 'Bangkok Blade District', 'bangkok-blade-district', '+66-2-555-6789', 'Sukhumvit Road, Khlong Toei, Bangkok 10110', '8890', 'Bangkok', 'Thailand', NOW(), NOW()),
('USER_ID_19', 'KL Bey Masters', 'kl-bey-masters', '+60-3-555-4567', 'Jalan Ampang, 50450 Kuala Lumpur', '9901', 'Kuala Lumpur', 'Malaysia', NOW(), NOW()),
('USER_ID_20', 'Amsterdam Spin Lab', 'amsterdam-spin-lab', '+31-20-555-7890', 'Damrak 95, 1012 LP Amsterdam', '1012', 'Amsterdam', 'Netherlands', NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  contact_number = EXCLUDED.contact_number,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  country = EXCLUDED.country,
  updated_at = NOW();

-- ============================================
-- Verification Queries
-- ============================================

-- Check inserted profiles
-- SELECT id, username, display_name, bio FROM profiles ORDER BY username;

-- Check inserted stores
-- SELECT owner_id, name, slug, city, country, pin FROM stores ORDER BY name;

-- Check for any issues
-- SELECT s.name, s.slug, p.display_name 
-- FROM stores s 
-- LEFT JOIN profiles p ON s.owner_id = p.id 
-- ORDER BY s.name;
