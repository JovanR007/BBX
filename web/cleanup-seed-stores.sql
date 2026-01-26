-- ============================================
-- CLEANUP SCRIPT: Delete Seed Data
-- ============================================

-- Safely delete stores that are NOT in the "Keep List"
-- AND match the known dummy slugs/names.

DELETE FROM stores
WHERE 
    -- 1. NOT in the Safe List (Official Stores)
    name NOT IN (
        'Southern Breeze Hobby and Games',
        'Cardoza Hobby Shop',
        'JK Hobby Shop PH',
        'Hobby Lords Takapuna',
        'Hanma Hobby Store',
        'Baki Hobby Store'
    )
    AND 
    -- 2. Matches known dummy slugs or names
    (
        slug IN (
            'akihabara-bey-shop', 'naniwa-battle-arena', 'london-spin-arena', 
            'toronto-beyblade-club', 'sydney-burst-stadium', 
            'beyblade-arena-la', 'nyc-blade-masters', 'berlin-blade-factory',
            'paris-spinning-elite', 'gangnam-battle-zone', 'sao-paulo-bey-champions',
            'arena-beyblade-cdmx', 'marina-bay-bladers', 'colosseum-spin-arena',
            'barcelona-bey-hub', 'manila-legends-arena', 'mumbai-burst-center',
            'bangkok-blade-district', 'kl-bey-masters', 'amsterdam-spin-lab'
        )
        OR 
        name IN ('Akihabara Bey Shop', 'Naniwa Battle Arena', 'London Spin Arena', 'Toronto Beyblade Club', 'Sydney Burst Stadium')
    );

-- Verify deletion
SELECT name, slug, city, country FROM stores;
