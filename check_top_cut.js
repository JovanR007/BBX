const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTopCut() {
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
    console.log(`Tournament: ${t.name} (Cut Size: ${t.cut_size})`);

    // 2. Get Top Cut Matches
    const { data: matches, error: mErr } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', t.id)
        .eq('stage', 'top_cut')
        .order('match_number');

    if (mErr) {
        console.error(mErr);
        return;
    }

    console.log(`Found ${matches.length} Top Cut matches.`);
    matches.forEach(m => {
        console.log(`M${m.match_number} (Round ${m.bracket_round}): ${m.status} [${m.score_a}-${m.score_b}]`);
    });

    const pending = matches.filter(m => m.status !== 'complete');
    if (pending.length > 0) {
        console.log("PENDING MATCHES EXIST:", pending.map(m => `M${m.match_number}`));
    } else {
        console.log("All matches complete. System should allow advancement.");
    }
}

checkTopCut();
