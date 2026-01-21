require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testQuery() {
    console.log("Testing Ticker Query...");

    // 1. Simple Fetch
    const { data: simple, error: sErr } = await supabase.from('matches').select('id, tournament_id').limit(1);
    if (sErr) console.error("Simple Fetch Error:", sErr);
    else console.log("Simple Match Found:", simple?.length > 0);

    // 2. Complex Join (The one used in Ticker)
    const { data, error } = await supabase
        .from("matches")
        .select(`
          id,
          score_a,
          score_b,
          status,
          participant_a:participants!participant_a_id(display_name),
          participant_b:participants!participant_b_id(display_name),
          tournaments!inner(
            stores!inner(name)
          )
        `)
        .order("updated_at", { ascending: false })
        .limit(5);

    if (error) {
        console.error("Complex Query Error:", error);
    } else {
        console.log("Joined Data Rows:", data?.length);
        if (data?.length > 0) console.log("Sample Row:", JSON.stringify(data[0], null, 2));
    }
}

testQuery();
