-- Update existing stores with dummy data
UPDATE stores
SET 
  name = CASE id
    WHEN (SELECT id FROM stores ORDER BY created_at DESC LIMIT 1 OFFSET 0) THEN 'Galaxy Hobby Arena'
    WHEN (SELECT id FROM stores ORDER BY created_at DESC LIMIT 1 OFFSET 1) THEN 'Battle City Central'
    WHEN (SELECT id FROM stores ORDER BY created_at DESC LIMIT 1 OFFSET 2) THEN 'Neon Nexus Games'
    ELSE 'Hobby Stronghold ' || SUBSTRING(id::text, 1, 4)
  END,
  address = '123 Beyblade Lane, Battle City, BC 90210',
  contact_number = '(555) 0199-8877',
  description = 'The premier destination for all your blading needs. Join our weekly tournaments and rise to the top!'
WHERE id IS NOT NULL;
