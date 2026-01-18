import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDebug() {
    // 1. Get the latest tournament
    const { data: tourneys } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false }).limit(1);
    const t = tourneys[0];
    console.log("Tournament:", t.id, t.name, t.status);

    // 2. Counts
    const { count: r2 } = await supabase.from('matches').select('*', { count: 'exact', head: true }).eq('tournament_id', t.id).gt('swiss_round_number', 1);
    console.log("Matches > Round 1:", r2);

    // 3. Participants
    const { data: parts } = await supabase.from('participants').select('*').eq('tournament_id', t.id).order('created_at', { ascending: false });
    console.log("Latest Participant:", parts[0]);

    // 4. Matches in Round 1
    const { data: m1 } = await supabase.from('matches').select('*').eq('tournament_id', t.id).eq('swiss_round_number', 1);
    console.log("Round 1 Matches Count:", m1.length);
    console.log("Matches Details:", m1.map(m => `[${m.id}] ${m.participant_a_id} vs ${m.participant_b_id} (Status: ${m.status})`));
}

checkDebug();
