const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteLatestTopCutRound() {
    // 1. Get started tournament
    const { data: tournaments, error: tErr } = await supabase
        .from('tournaments')
        .select('*')
        .eq('status', 'started')
        .limit(1);

    if (tErr || !tournaments.length) {
        console.log("No started tournament found.");
        return;
    }

    const t = tournaments[0];
    console.log(`Tournament: ${t.name} (ID: ${t.id})`);

    // 2. Find Max Bracket Round
    const { data: rounds, error: rErr } = await supabase
        .from('matches')
        .select('bracket_round')
        .eq('tournament_id', t.id)
        .eq('stage', 'top_cut')
        .order('bracket_round', { ascending: false });

    if (rErr) {
        console.error(rErr);
        return;
    }

    if (!rounds || rounds.length === 0) {
        console.log("No Top Cut rounds found.");
        return;
    }

    const maxRound = rounds[0].bracket_round; // Correctly get the max round from sorted list
    console.log(`Latest Bracket Round is: ${maxRound}`);

    if (maxRound < 2) {
        console.log("Round 1 should ideally not be deleted unless restarting Top Cut. Proceed with caution? (Auto-Action: Deleting anyway as requested).");
    }

    // 3. Delete Matches in Max Round
    const { count, error: dErr } = await supabase
        .from('matches')
        .delete({ count: 'exact' })
        .eq('tournament_id', t.id)
        .eq('stage', 'top_cut')
        .eq('bracket_round', maxRound);

    if (dErr) {
        console.error("Deletion failed:", dErr);
    } else {
        console.log(`Successfully deleted Top Cut Round ${maxRound}. Match count: ${count || 'Unknown'}`);
    }
}

deleteLatestTopCutRound();
