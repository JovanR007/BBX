import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Service Role key would be better but attempting with Anon for now or User provided.
// Ideally should use service role if possible, but let's check if we have permission.
// Actually, check_columns.js used anon key and worked for reading. Updates might fail with RLS.
// Let's assume we can update or the user runs this with sufficient privileges locally.

// UPDATE: Since we are running locally, we might need the SERVICE_ROLE_KEY from .env if RLS blocks updates.
// Checking .env for service role key... actually I don't have access to list .env content for security usually, 
// but I can try to use the one from process.env if available, or just rely on Anon and hope RLS allows it (unlikely for broad updates).
// Wait, actions.ts uses `supabaseAdmin` created with `SUPABASE_SERVICE_ROLE_KEY`. 
// I should try to load that if possible.

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function backfillTournaments() {
    console.log("Starting backfill...");

    // 1. Get tournaments with missing location or start_time
    const { data: tournaments, error } = await supabase
        .from("tournaments")
        .select("id, name, created_at, location, start_time")
        .or('location.is.null,start_time.is.null');

    if (error) {
        console.error("Error fetching tournaments:", error);
        return;
    }

    console.log(`Found ${tournaments.length} tournaments to backfill.`);

    for (const t of tournaments) {
        const dummyLocation = "TBA Location";
        // Default to created_at + 1 week if no start time, or just created_at for simplicity
        const dummyStartTime = t.start_time || t.created_at;

        // Update
        const { error: updateError } = await supabase
            .from("tournaments")
            .update({
                location: t.location || dummyLocation,
                start_time: dummyStartTime
            })
            .eq("id", t.id);

        if (updateError) {
            console.error(`Failed to update ${t.name}:`, updateError.message);
        } else {
            console.log(`Updated ${t.name}: Loc=${t.location || dummyLocation}, Time=${dummyStartTime}`);
        }
    }
    console.log("Backfill complete.");
}

backfillTournaments();
