DO $$ 
BEGIN
    -- 1. Drop Policies on deck_beys (dependencies first)
    -- Standard naming
    DROP POLICY IF EXISTS "Users can view their own deck beys" ON deck_beys;
    DROP POLICY IF EXISTS "Users can insert beys into their own decks" ON deck_beys;
    DROP POLICY IF EXISTS "Users can update beys in their own decks" ON deck_beys;
    DROP POLICY IF EXISTS "Users can delete beys from their own decks" ON deck_beys;
    
    -- Alternative naming (found via error logs)
    DROP POLICY IF EXISTS "Deck contents viewable by deck owner" ON deck_beys;
    DROP POLICY IF EXISTS "Deck contents insertable by deck owner" ON deck_beys;
    DROP POLICY IF EXISTS "Deck contents editable by deck owner" ON deck_beys;
    DROP POLICY IF EXISTS "Deck contents deletable by deck owner" ON deck_beys;

    -- 2. Drop Policies on decks
    DROP POLICY IF EXISTS "Users can view their own decks" ON decks;
    DROP POLICY IF EXISTS "Users can create their own decks" ON decks;
    DROP POLICY IF EXISTS "Users can insert their own decks" ON decks;
    DROP POLICY IF EXISTS "Users can update their own decks" ON decks;
    DROP POLICY IF EXISTS "Users can delete their own decks" ON decks;

    -- 3. Drop the Foreign Key Constraint
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'decks_user_id_fkey') THEN
        ALTER TABLE decks DROP CONSTRAINT decks_user_id_fkey;
    END IF;

    -- 4. Alter the column type to TEXT
    ALTER TABLE decks ALTER COLUMN user_id TYPE TEXT;
END $$;
