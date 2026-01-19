
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log("--- Checking Recent Tournaments ---");
    const { data: tournaments } = await supabaseAdmin
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (!tournaments || tournaments.length === 0) {
        console.log("No tournaments found.");
        return;
    }

    const t = tournaments[0];
    console.log(`Tournament: ${t.name} (ID: ${t.id})`);
    console.log(`Status: ${t.status}`);
    console.log(`Cut Size: ${t.cut_size}`);

    console.log("\n--- Checking Matches ---");
    const { data: matches } = await supabaseAdmin
        .from('matches')
        .select('*')
        .eq('tournament_id', t.id)
        .order('created_at', { ascending: true });

    if (!matches || matches.length === 0) {
        console.log("No matches found.");
    } else {
        console.log(`Found ${matches.length} matches.`);
        matches.forEach(m => {
            console.log(`[${m.stage}] R${m.stage === 'swiss' ? m.swiss_round_number : m.bracket_round} M${m.match_number}: ${m.participant_a_id?.substr(0, 4)} vs ${m.participant_b_id?.substr(0, 4)} (${m.status})`);
        });
    }

    console.log("\n--- Checking Participants ---");
    const { data: parts } = await supabaseAdmin
        .from('participants')
        .select('*')
        .eq('tournament_id', t.id);
    console.log(`Found ${parts?.length} participants.`);
}

run();
