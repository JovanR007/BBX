-- Create Parts Table
CREATE TABLE IF NOT EXISTS parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('blade', 'ratchet', 'bit', 'lock_chip', 'assist_blade', 'integrated')), -- Expanded for CX + Integrated
    series TEXT NOT NULL CHECK (series IN ('BX', 'UX', 'CX')), -- Basic, Unique, Custom
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Update constraints for existing tables (in case table was created by previous partial run or old migration)
DO $$ 
BEGIN
    -- Update Type Constraint
    ALTER TABLE parts DROP CONSTRAINT IF EXISTS parts_type_check;
    ALTER TABLE parts ADD CONSTRAINT parts_type_check CHECK (type IN ('blade', 'ratchet', 'bit', 'lock_chip', 'assist_blade', 'integrated'));
    
    -- Update Series Constraint
    ALTER TABLE parts DROP CONSTRAINT IF EXISTS parts_series_check;
    ALTER TABLE parts ADD CONSTRAINT parts_series_check CHECK (series IN ('BX', 'UX', 'CX'));
EXCEPTION
    WHEN others THEN NULL; -- Ignore if constraints don't exist or other naming issues (safeguard)
END $$;

-- RLS Policies for Parts
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'parts' AND policyname = 'Parts are viewable by everyone'
    ) THEN
        CREATE POLICY "Parts are viewable by everyone" ON parts FOR SELECT USING (true);
    END IF;
END $$;


-- Create Decks Table
CREATE TABLE IF NOT EXISTS decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT, -- "Squad Photo"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies for Decks
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'decks' AND policyname = 'Users can view their own decks'
    ) THEN
        CREATE POLICY "Users can view their own decks" ON decks FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'decks' AND policyname = 'Users can create their own decks'
    ) THEN
        CREATE POLICY "Users can create their own decks" ON decks FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'decks' AND policyname = 'Users can update their own decks'
    ) THEN
        CREATE POLICY "Users can update their own decks" ON decks FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'decks' AND policyname = 'Users can delete their own decks'
    ) THEN
        CREATE POLICY "Users can delete their own decks" ON decks FOR DELETE USING (auth.uid() = user_id);
    END IF;
    
    -- Public read access for tournament display (optional, based on need)
     IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'decks' AND policyname = 'Decks are viewable by everyone'
    ) THEN
        CREATE POLICY "Decks are viewable by everyone" ON decks FOR SELECT USING (true);
    END IF;
END $$;


-- Create Deck_Beys Table (The 3 Beys in a deck)
CREATE TABLE IF NOT EXISTS deck_beys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID REFERENCES decks(id) ON DELETE CASCADE,
    slot_number INTEGER NOT NULL CHECK (slot_number IN (1, 2, 3)),
    
    -- Main Parts
    blade_id UUID REFERENCES parts(id),
    ratchet_id UUID REFERENCES parts(id),
    bit_id UUID REFERENCES parts(id),
    
    -- Optional CX Parts
    lock_chip_id UUID REFERENCES parts(id),
    assist_blade_id UUID REFERENCES parts(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure Parts are distinct within a single bey? (Not strictly enforced by DB constraint typically, but app logic)
    -- Ensure 3 Beys per deck? (App logic)
    UNIQUE(deck_id, slot_number)
);

-- RLS Policies for Deck Beys
ALTER TABLE deck_beys ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'deck_beys' AND policyname = 'Users can view their own deck beys'
    ) THEN
        CREATE POLICY "Users can view their own deck beys" ON deck_beys 
        FOR SELECT USING (
            EXISTS (SELECT 1 FROM decks WHERE id = deck_beys.deck_id AND user_id = auth.uid())
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'deck_beys' AND policyname = 'Users can insert beys into their own decks'
    ) THEN
        CREATE POLICY "Users can insert beys into their own decks" ON deck_beys 
        FOR INSERT WITH CHECK (
            EXISTS (SELECT 1 FROM decks WHERE id = deck_beys.deck_id AND user_id = auth.uid())
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'deck_beys' AND policyname = 'Users can update beys in their own decks'
    ) THEN
        CREATE POLICY "Users can update beys in their own decks" ON deck_beys 
        FOR UPDATE USING (
            EXISTS (SELECT 1 FROM decks WHERE id = deck_beys.deck_id AND user_id = auth.uid())
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'deck_beys' AND policyname = 'Users can delete beys from their own decks'
    ) THEN
        CREATE POLICY "Users can delete beys from their own decks" ON deck_beys 
        FOR DELETE USING (
            EXISTS (SELECT 1 FROM decks WHERE id = deck_beys.deck_id AND user_id = auth.uid())
        );
    END IF;
    
     -- Public read check
     IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'deck_beys' AND policyname = 'Deck beys viewable by everyone'
    ) THEN
        CREATE POLICY "Deck beys viewable by everyone" ON deck_beys FOR SELECT USING (true);
    END IF;
END $$;


-- Add deck_id to participants
ALTER TABLE participants ADD COLUMN IF NOT EXISTS deck_id UUID REFERENCES decks(id) ON DELETE SET NULL;


-- SEED DATA (A starter pack of parts)
-- This uses DO block to avoid duplicates if run multiple times
DO $$
DECLARE
    -- Helper to insert if not exists
BEGIN
    -- BX BLADES
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'DranSword') THEN
        INSERT INTO parts (name, type, series) VALUES ('DranSword', 'blade', 'BX');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'HellsScythe') THEN
        INSERT INTO parts (name, type, series) VALUES ('HellsScythe', 'blade', 'BX');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'WizardArrow') THEN
        INSERT INTO parts (name, type, series) VALUES ('WizardArrow', 'blade', 'BX');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'KnightShield') THEN
        INSERT INTO parts (name, type, series) VALUES ('KnightShield', 'blade', 'BX');
    END IF;

    -- UX BLADES
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'DranBuster') THEN
        INSERT INTO parts (name, type, series) VALUES ('DranBuster', 'blade', 'UX');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'HellsHammer') THEN
        INSERT INTO parts (name, type, series) VALUES ('HellsHammer', 'blade', 'UX');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'WizardRod') THEN
        INSERT INTO parts (name, type, series) VALUES ('WizardRod', 'blade', 'UX');
    END IF;

    -- RATCHETS
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '3-60') THEN
        INSERT INTO parts (name, type, series) VALUES ('3-60', 'ratchet', 'BX');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '4-60') THEN
        INSERT INTO parts (name, type, series) VALUES ('4-60', 'ratchet', 'BX');
    END IF;
     IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '5-60') THEN
        INSERT INTO parts (name, type, series) VALUES ('5-60', 'ratchet', 'BX');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '3-80') THEN
        INSERT INTO parts (name, type, series) VALUES ('3-80', 'ratchet', 'BX');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '4-80') THEN
        INSERT INTO parts (name, type, series) VALUES ('4-80', 'ratchet', 'BX');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '5-80') THEN
        INSERT INTO parts (name, type, series) VALUES ('5-80', 'ratchet', 'BX');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '1-60') THEN
        INSERT INTO parts (name, type, series) VALUES ('1-60', 'ratchet', 'UX');
    END IF;

    -- BITS
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Flat') THEN
        INSERT INTO parts (name, type, series) VALUES ('Flat', 'bit', 'BX');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Taper') THEN
        INSERT INTO parts (name, type, series) VALUES ('Taper', 'bit', 'BX');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Ball') THEN
        INSERT INTO parts (name, type, series) VALUES ('Ball', 'bit', 'BX');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Needle') THEN
        INSERT INTO parts (name, type, series) VALUES ('Needle', 'bit', 'BX');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'High Needle') THEN
        INSERT INTO parts (name, type, series) VALUES ('High Needle', 'bit', 'BX');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Rush') THEN
        INSERT INTO parts (name, type, series) VALUES ('Rush', 'bit', 'BX');
    END IF;
     IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Point') THEN
        INSERT INTO parts (name, type, series) VALUES ('Point', 'bit', 'BX');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Gear Flat') THEN
        INSERT INTO parts (name, type, series) VALUES ('Gear Flat', 'bit', 'UX');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Hexa') THEN
        INSERT INTO parts (name, type, series) VALUES ('Hexa', 'bit', 'UX');
    END IF;
     IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Disc Ball') THEN
        INSERT INTO parts (name, type, series) VALUES ('Disc Ball', 'bit', 'UX');
    END IF;

    -- CX LOCK CHIPS (Avatars)
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Cerberus' AND type = 'lock_chip') THEN INSERT INTO parts (name, type, series) VALUES ('Cerberus', 'lock_chip', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Dran' AND type = 'lock_chip') THEN INSERT INTO parts (name, type, series) VALUES ('Dran', 'lock_chip', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Fox' AND type = 'lock_chip') THEN INSERT INTO parts (name, type, series) VALUES ('Fox', 'lock_chip', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Hells' AND type = 'lock_chip') THEN INSERT INTO parts (name, type, series) VALUES ('Hells', 'lock_chip', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Hornet' AND type = 'lock_chip') THEN INSERT INTO parts (name, type, series) VALUES ('Hornet', 'lock_chip', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Kraken' AND type = 'lock_chip') THEN INSERT INTO parts (name, type, series) VALUES ('Kraken', 'lock_chip', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Leon' AND type = 'lock_chip') THEN INSERT INTO parts (name, type, series) VALUES ('Leon', 'lock_chip', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Emperor' AND type = 'lock_chip') THEN INSERT INTO parts (name, type, series) VALUES ('Emperor', 'lock_chip', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Pegasus' AND type = 'lock_chip') THEN INSERT INTO parts (name, type, series) VALUES ('Pegasus', 'lock_chip', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Perseus' AND type = 'lock_chip') THEN INSERT INTO parts (name, type, series) VALUES ('Perseus', 'lock_chip', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Phoenix' AND type = 'lock_chip') THEN INSERT INTO parts (name, type, series) VALUES ('Phoenix', 'lock_chip', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Rhino' AND type = 'lock_chip') THEN INSERT INTO parts (name, type, series) VALUES ('Rhino', 'lock_chip', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Sol' AND type = 'lock_chip') THEN INSERT INTO parts (name, type, series) VALUES ('Sol', 'lock_chip', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Stag' AND type = 'lock_chip') THEN INSERT INTO parts (name, type, series) VALUES ('Stag', 'lock_chip', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Valkyrie' AND type = 'lock_chip') THEN INSERT INTO parts (name, type, series) VALUES ('Valkyrie', 'lock_chip', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Whale' AND type = 'lock_chip') THEN INSERT INTO parts (name, type, series) VALUES ('Whale', 'lock_chip', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Wolf' AND type = 'lock_chip') THEN INSERT INTO parts (name, type, series) VALUES ('Wolf', 'lock_chip', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Wizard' AND type = 'lock_chip') THEN INSERT INTO parts (name, type, series) VALUES ('Wizard', 'lock_chip', 'CX'); END IF;

    -- CX MAIN BLADES (Stored as 'blade' type with series 'CX')
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Arc' AND type = 'blade' AND series = 'CX') THEN INSERT INTO parts (name, type, series) VALUES ('Arc', 'blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Blast' AND type = 'blade' AND series = 'CX') THEN INSERT INTO parts (name, type, series) VALUES ('Blast', 'blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Brave' AND type = 'blade' AND series = 'CX') THEN INSERT INTO parts (name, type, series) VALUES ('Brave', 'blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Brush' AND type = 'blade' AND series = 'CX') THEN INSERT INTO parts (name, type, series) VALUES ('Brush', 'blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Dark' AND type = 'blade' AND series = 'CX') THEN INSERT INTO parts (name, type, series) VALUES ('Dark', 'blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Eclipse' AND type = 'blade' AND series = 'CX') THEN INSERT INTO parts (name, type, series) VALUES ('Eclipse', 'blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Fang' AND type = 'blade' AND series = 'CX') THEN INSERT INTO parts (name, type, series) VALUES ('Fang', 'blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Flame' AND type = 'blade' AND series = 'CX') THEN INSERT INTO parts (name, type, series) VALUES ('Flame', 'blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Flare' AND type = 'blade' AND series = 'CX') THEN INSERT INTO parts (name, type, series) VALUES ('Flare', 'blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Fort' AND type = 'blade' AND series = 'CX') THEN INSERT INTO parts (name, type, series) VALUES ('Fort', 'blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Hunt' AND type = 'blade' AND series = 'CX') THEN INSERT INTO parts (name, type, series) VALUES ('Hunt', 'blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Might' AND type = 'blade' AND series = 'CX') THEN INSERT INTO parts (name, type, series) VALUES ('Might', 'blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Reaper' AND type = 'blade' AND series = 'CX') THEN INSERT INTO parts (name, type, series) VALUES ('Reaper', 'blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Volt' AND type = 'blade' AND series = 'CX') THEN INSERT INTO parts (name, type, series) VALUES ('Volt', 'blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Wriggle' AND type = 'blade' AND series = 'CX') THEN INSERT INTO parts (name, type, series) VALUES ('Wriggle', 'blade', 'CX'); END IF;

    -- CX ASSIST BLADES
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Assault' AND type = 'assist_blade') THEN INSERT INTO parts (name, type, series) VALUES ('Assault', 'assist_blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Bumper' AND type = 'assist_blade') THEN INSERT INTO parts (name, type, series) VALUES ('Bumper', 'assist_blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Charge' AND type = 'assist_blade') THEN INSERT INTO parts (name, type, series) VALUES ('Charge', 'assist_blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Dual' AND type = 'assist_blade') THEN INSERT INTO parts (name, type, series) VALUES ('Dual', 'assist_blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Free' AND type = 'assist_blade') THEN INSERT INTO parts (name, type, series) VALUES ('Free', 'assist_blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Heavy' AND type = 'assist_blade') THEN INSERT INTO parts (name, type, series) VALUES ('Heavy', 'assist_blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Jaggy' AND type = 'assist_blade') THEN INSERT INTO parts (name, type, series) VALUES ('Jaggy', 'assist_blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Massive' AND type = 'assist_blade') THEN INSERT INTO parts (name, type, series) VALUES ('Massive', 'assist_blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Round' AND type = 'assist_blade') THEN INSERT INTO parts (name, type, series) VALUES ('Round', 'assist_blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Slash' AND type = 'assist_blade') THEN INSERT INTO parts (name, type, series) VALUES ('Slash', 'assist_blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Turn' AND type = 'assist_blade') THEN INSERT INTO parts (name, type, series) VALUES ('Turn', 'assist_blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Wheel' AND type = 'assist_blade') THEN INSERT INTO parts (name, type, series) VALUES ('Wheel', 'assist_blade', 'CX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Zillion' AND type = 'assist_blade') THEN INSERT INTO parts (name, type, series) VALUES ('Zillion', 'assist_blade', 'CX'); END IF;

    -- NEW RATCHETS
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '0-60') THEN INSERT INTO parts (name, type, series) VALUES ('0-60', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '4-55') THEN INSERT INTO parts (name, type, series) VALUES ('4-55', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '6-60') THEN INSERT INTO parts (name, type, series) VALUES ('6-60', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '6-80') THEN INSERT INTO parts (name, type, series) VALUES ('6-80', 'ratchet', 'BX'); END IF;

    -- NEW BITS
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Gear Rush') THEN INSERT INTO parts (name, type, series) VALUES ('Gear Rush', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Kick') THEN INSERT INTO parts (name, type, series) VALUES ('Kick', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Low Orb') THEN INSERT INTO parts (name, type, series) VALUES ('Low Orb', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Trans Kick') THEN INSERT INTO parts (name, type, series) VALUES ('Trans Kick', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Vortex') THEN INSERT INTO parts (name, type, series) VALUES ('Vortex', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Wall Ball') THEN INSERT INTO parts (name, type, series) VALUES ('Wall Ball', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Wall Wedge') THEN INSERT INTO parts (name, type, series) VALUES ('Wall Wedge', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Wedge') THEN INSERT INTO parts (name, type, series) VALUES ('Wedge', 'bit', 'BX'); END IF;

    -- INTEGRATED BITS (Ratchet + Bit)
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Operate') THEN INSERT INTO parts (name, type, series) VALUES ('Operate', 'integrated', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Turbo') THEN INSERT INTO parts (name, type, series) VALUES ('Turbo', 'integrated', 'BX'); END IF;

    -- LATEST RATCHETS
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '1-70') THEN INSERT INTO parts (name, type, series) VALUES ('1-70', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '2-60') THEN INSERT INTO parts (name, type, series) VALUES ('2-60', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '2-80') THEN INSERT INTO parts (name, type, series) VALUES ('2-80', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '4-70') THEN INSERT INTO parts (name, type, series) VALUES ('4-70', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '6-70') THEN INSERT INTO parts (name, type, series) VALUES ('6-70', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '7-80') THEN INSERT INTO parts (name, type, series) VALUES ('7-80', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '9-60') THEN INSERT INTO parts (name, type, series) VALUES ('9-60', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '9-80') THEN INSERT INTO parts (name, type, series) VALUES ('9-80', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'M-85') THEN INSERT INTO parts (name, type, series) VALUES ('M-85', 'ratchet', 'BX'); END IF;

    -- LATEST BITS
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Cyclone') THEN INSERT INTO parts (name, type, series) VALUES ('Cyclone', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Dot') THEN INSERT INTO parts (name, type, series) VALUES ('Dot', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Elevate') THEN INSERT INTO parts (name, type, series) VALUES ('Elevate', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Gear Ball') THEN INSERT INTO parts (name, type, series) VALUES ('Gear Ball', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Gear Needle') THEN INSERT INTO parts (name, type, series) VALUES ('Gear Needle', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Gear Point') THEN INSERT INTO parts (name, type, series) VALUES ('Gear Point', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'High Taper') THEN INSERT INTO parts (name, type, series) VALUES ('High Taper', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Low Flat') THEN INSERT INTO parts (name, type, series) VALUES ('Low Flat', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Merge') THEN INSERT INTO parts (name, type, series) VALUES ('Merge', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Orb') THEN INSERT INTO parts (name, type, series) VALUES ('Orb', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Quake') THEN INSERT INTO parts (name, type, series) VALUES ('Quake', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Spike') THEN INSERT INTO parts (name, type, series) VALUES ('Spike', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Trans Point') THEN INSERT INTO parts (name, type, series) VALUES ('Trans Point', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Unite') THEN INSERT INTO parts (name, type, series) VALUES ('Unite', 'bit', 'BX'); END IF;

    -- UNIQUE LINE BLADES
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'AeroPegasus') THEN INSERT INTO parts (name, type, series) VALUES ('AeroPegasus', 'blade', 'UX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'ClockMirage') THEN INSERT INTO parts (name, type, series) VALUES ('ClockMirage', 'blade', 'UX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'DranBuster') THEN INSERT INTO parts (name, type, series) VALUES ('DranBuster', 'blade', 'UX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'GhostCircle') THEN INSERT INTO parts (name, type, series) VALUES ('GhostCircle', 'blade', 'UX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'GolemRock') THEN INSERT INTO parts (name, type, series) VALUES ('GolemRock', 'blade', 'UX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'HellsHammer') THEN INSERT INTO parts (name, type, series) VALUES ('HellsHammer', 'blade', 'UX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'ImpactDrake') THEN INSERT INTO parts (name, type, series) VALUES ('ImpactDrake', 'blade', 'UX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'KnightMail') THEN INSERT INTO parts (name, type, series) VALUES ('KnightMail', 'blade', 'UX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'LeonCrest') THEN INSERT INTO parts (name, type, series) VALUES ('LeonCrest', 'blade', 'UX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'MeteorDragoon') THEN INSERT INTO parts (name, type, series) VALUES ('MeteorDragoon', 'blade', 'UX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'MummyCurse') THEN INSERT INTO parts (name, type, series) VALUES ('MummyCurse', 'blade', 'UX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'OrochiCluster') THEN INSERT INTO parts (name, type, series) VALUES ('OrochiCluster', 'blade', 'UX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'PhoenixRudder') THEN INSERT INTO parts (name, type, series) VALUES ('PhoenixRudder', 'blade', 'UX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'SamuraiSaber') THEN INSERT INTO parts (name, type, series) VALUES ('SamuraiSaber', 'blade', 'UX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'ScorpioSpear') THEN INSERT INTO parts (name, type, series) VALUES ('ScorpioSpear', 'blade', 'UX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'SharkScale') THEN INSERT INTO parts (name, type, series) VALUES ('SharkScale', 'blade', 'UX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'ShinobiShadow') THEN INSERT INTO parts (name, type, series) VALUES ('ShinobiShadow', 'blade', 'UX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'SilverWolf') THEN INSERT INTO parts (name, type, series) VALUES ('SilverWolf', 'blade', 'UX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'WizardRod') THEN INSERT INTO parts (name, type, series) VALUES ('WizardRod', 'blade', 'UX'); END IF;

    -- HASBRO DEBUTS / EXCLUSIVES (Additional)
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Hack Viking') THEN INSERT INTO parts (name, type, series) VALUES ('Hack Viking', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'WyvernHover') THEN INSERT INTO parts (name, type, series) VALUES ('WyvernHover', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Stun Medusa') THEN INSERT INTO parts (name, type, series) VALUES ('Stun Medusa', 'blade', 'BX'); END IF;

    -- ADDITIONAL RATCHETS
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '0-70') THEN INSERT INTO parts (name, type, series) VALUES ('0-70', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '0-80') THEN INSERT INTO parts (name, type, series) VALUES ('0-80', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '1-60') THEN INSERT INTO parts (name, type, series) VALUES ('1-60', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '1-80') THEN INSERT INTO parts (name, type, series) VALUES ('1-80', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '2-70') THEN INSERT INTO parts (name, type, series) VALUES ('2-70', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '3-70') THEN INSERT INTO parts (name, type, series) VALUES ('3-70', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '3-85') THEN INSERT INTO parts (name, type, series) VALUES ('3-85', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '4-50') THEN INSERT INTO parts (name, type, series) VALUES ('4-50', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '5-70') THEN INSERT INTO parts (name, type, series) VALUES ('5-70', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '7-55') THEN INSERT INTO parts (name, type, series) VALUES ('7-55', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '7-60') THEN INSERT INTO parts (name, type, series) VALUES ('7-60', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '7-70') THEN INSERT INTO parts (name, type, series) VALUES ('7-70', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '9-65') THEN INSERT INTO parts (name, type, series) VALUES ('9-65', 'ratchet', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = '9-70') THEN INSERT INTO parts (name, type, series) VALUES ('9-70', 'ratchet', 'BX'); END IF;

    -- ADDITIONAL BITS
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Accel') THEN INSERT INTO parts (name, type, series) VALUES ('Accel', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Bound Spike') THEN INSERT INTO parts (name, type, series) VALUES ('Bound Spike', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Disk Ball') THEN INSERT INTO parts (name, type, series) VALUES ('Disk Ball', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Free Ball') THEN INSERT INTO parts (name, type, series) VALUES ('Free Ball', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Glide') THEN INSERT INTO parts (name, type, series) VALUES ('Glide', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Hexa') THEN INSERT INTO parts (name, type, series) VALUES ('Hexa', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Jolt') THEN INSERT INTO parts (name, type, series) VALUES ('Jolt', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Level') THEN INSERT INTO parts (name, type, series) VALUES ('Level', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Low Rush') THEN INSERT INTO parts (name, type, series) VALUES ('Low Rush', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Metal Needle') THEN INSERT INTO parts (name, type, series) VALUES ('Metal Needle', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Rubber Accel') THEN INSERT INTO parts (name, type, series) VALUES ('Rubber Accel', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Under Flat') THEN INSERT INTO parts (name, type, series) VALUES ('Under Flat', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Under Needle') THEN INSERT INTO parts (name, type, series) VALUES ('Under Needle', 'bit', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Zap') THEN INSERT INTO parts (name, type, series) VALUES ('Zap', 'bit', 'BX'); END IF;

    -- STANDARD BLADES (BX/UX Mixed - treating as BX for simplicity unless clearly UX)
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'BlackShell') THEN INSERT INTO parts (name, type, series) VALUES ('BlackShell', 'blade', 'UX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'CobaltDragoon') THEN INSERT INTO parts (name, type, series) VALUES ('CobaltDragoon', 'blade', 'UX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'CobaltDrake') THEN INSERT INTO parts (name, type, series) VALUES ('CobaltDrake', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'CrimsonGaruda') THEN INSERT INTO parts (name, type, series) VALUES ('CrimsonGaruda', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'DranDagger') THEN INSERT INTO parts (name, type, series) VALUES ('DranDagger', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'HellsChain') THEN INSERT INTO parts (name, type, series) VALUES ('HellsChain', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'KnightLance') THEN INSERT INTO parts (name, type, series) VALUES ('KnightLance', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'LeonClaw') THEN INSERT INTO parts (name, type, series) VALUES ('LeonClaw', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'PhoenixFeather') THEN INSERT INTO parts (name, type, series) VALUES ('PhoenixFeather', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'PhoenixWing') THEN INSERT INTO parts (name, type, series) VALUES ('PhoenixWing', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'RhinoHorn') THEN INSERT INTO parts (name, type, series) VALUES ('RhinoHorn', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'SamuraiCalibur') THEN INSERT INTO parts (name, type, series) VALUES ('SamuraiCalibur', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'SharkEdge') THEN INSERT INTO parts (name, type, series) VALUES ('SharkEdge', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'ShelterDrake') THEN INSERT INTO parts (name, type, series) VALUES ('ShelterDrake', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'SphinxCowl') THEN INSERT INTO parts (name, type, series) VALUES ('SphinxCowl', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'TriceraPress') THEN INSERT INTO parts (name, type, series) VALUES ('TriceraPress', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'TyrannoBeat') THEN INSERT INTO parts (name, type, series) VALUES ('TyrannoBeat', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'UnicornSting') THEN INSERT INTO parts (name, type, series) VALUES ('UnicornSting', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'ViperTail') THEN INSERT INTO parts (name, type, series) VALUES ('ViperTail', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'WeissTiger') THEN INSERT INTO parts (name, type, series) VALUES ('WeissTiger', 'blade', 'UX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'WhaleWave') THEN INSERT INTO parts (name, type, series) VALUES ('WhaleWave', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'WyvernGale') THEN INSERT INTO parts (name, type, series) VALUES ('WyvernGale', 'blade', 'BX'); END IF;

    -- HASBRO EXCLUSIVES
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'CrocCrunch') THEN INSERT INTO parts (name, type, series) VALUES ('CrocCrunch', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'SharkGill') THEN INSERT INTO parts (name, type, series) VALUES ('SharkGill', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'ShinobiKnife') THEN INSERT INTO parts (name, type, series) VALUES ('ShinobiKnife', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'TriceraSpiky') THEN INSERT INTO parts (name, type, series) VALUES ('TriceraSpiky', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'TyrannoRoar') THEN INSERT INTO parts (name, type, series) VALUES ('TyrannoRoar', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'BearScratch') THEN INSERT INTO parts (name, type, series) VALUES ('BearScratch', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'SamuraiSteel') THEN INSERT INTO parts (name, type, series) VALUES ('SamuraiSteel', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'GoatTackle') THEN INSERT INTO parts (name, type, series) VALUES ('GoatTackle', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'PteraSwing') THEN INSERT INTO parts (name, type, series) VALUES ('PteraSwing', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'MammothTusk') THEN INSERT INTO parts (name, type, series) VALUES ('MammothTusk', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'KongYell') THEN INSERT INTO parts (name, type, series) VALUES ('KongYell', 'blade', 'BX'); END IF;

    -- X-OVER PROJECT
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'DragoonStorm') THEN INSERT INTO parts (name, type, series) VALUES ('DragoonStorm', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'DranzerSpiral') THEN INSERT INTO parts (name, type, series) VALUES ('DranzerSpiral', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'DrigerSlash') THEN INSERT INTO parts (name, type, series) VALUES ('DrigerSlash', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'DracielShield') THEN INSERT INTO parts (name, type, series) VALUES ('DracielShield', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Lightning L-Drago (Rapid-Hit Type)') THEN INSERT INTO parts (name, type, series) VALUES ('Lightning L-Drago (Rapid-Hit Type)', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Lightning L-Drago (Upper Type)') THEN INSERT INTO parts (name, type, series) VALUES ('Lightning L-Drago (Upper Type)', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Rock Leone') THEN INSERT INTO parts (name, type, series) VALUES ('Rock Leone', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'StormPegasis') THEN INSERT INTO parts (name, type, series) VALUES ('StormPegasis', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Trypio') THEN INSERT INTO parts (name, type, series) VALUES ('Trypio', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'VictoryValkyrie') THEN INSERT INTO parts (name, type, series) VALUES ('VictoryValkyrie', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'XenoXcalibur') THEN INSERT INTO parts (name, type, series) VALUES ('XenoXcalibur', 'blade', 'BX'); END IF;

    -- COLLABS (Jurassic World)
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Mosasaurus') THEN INSERT INTO parts (name, type, series) VALUES ('Mosasaurus', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Quetzalcoatlus') THEN INSERT INTO parts (name, type, series) VALUES ('Quetzalcoatlus', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Spinosaurus') THEN INSERT INTO parts (name, type, series) VALUES ('Spinosaurus', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'T. Rex') THEN INSERT INTO parts (name, type, series) VALUES ('T. Rex', 'blade', 'BX'); END IF;

    -- COLLABS (Marvel)
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Captain America') THEN INSERT INTO parts (name, type, series) VALUES ('Captain America', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Green Goblin') THEN INSERT INTO parts (name, type, series) VALUES ('Green Goblin', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Iron Man') THEN INSERT INTO parts (name, type, series) VALUES ('Iron Man', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Miles Morales') THEN INSERT INTO parts (name, type, series) VALUES ('Miles Morales', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Red Hulk') THEN INSERT INTO parts (name, type, series) VALUES ('Red Hulk', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Spider-Man') THEN INSERT INTO parts (name, type, series) VALUES ('Spider-Man', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Thanos') THEN INSERT INTO parts (name, type, series) VALUES ('Thanos', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Venom') THEN INSERT INTO parts (name, type, series) VALUES ('Venom', 'blade', 'BX'); END IF;

    -- COLLABS (Star Wars)
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Chewbacca') THEN INSERT INTO parts (name, type, series) VALUES ('Chewbacca', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Darth Vader') THEN INSERT INTO parts (name, type, series) VALUES ('Darth Vader', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'General Grievous') THEN INSERT INTO parts (name, type, series) VALUES ('General Grievous', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Luke Skywalker') THEN INSERT INTO parts (name, type, series) VALUES ('Luke Skywalker', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Moff Gideon') THEN INSERT INTO parts (name, type, series) VALUES ('Moff Gideon', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Obi-Wan Kenobi') THEN INSERT INTO parts (name, type, series) VALUES ('Obi-Wan Kenobi', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Stormtrooper') THEN INSERT INTO parts (name, type, series) VALUES ('Stormtrooper', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'The Mandalorian') THEN INSERT INTO parts (name, type, series) VALUES ('The Mandalorian', 'blade', 'BX'); END IF;

    -- COLLABS (Transformers)
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Bumblebee') THEN INSERT INTO parts (name, type, series) VALUES ('Bumblebee', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Megatron') THEN INSERT INTO parts (name, type, series) VALUES ('Megatron', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Optimus Primal') THEN INSERT INTO parts (name, type, series) VALUES ('Optimus Primal', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Optimus Prime') THEN INSERT INTO parts (name, type, series) VALUES ('Optimus Prime', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Shockwave') THEN INSERT INTO parts (name, type, series) VALUES ('Shockwave', 'blade', 'BX'); END IF;
    IF NOT EXISTS (SELECT 1 FROM parts WHERE name = 'Starscream') THEN INSERT INTO parts (name, type, series) VALUES ('Starscream', 'blade', 'BX'); END IF;

END $$;
