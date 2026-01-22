const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// 1. Read Env manually
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(url, key);

async function test() {
    console.log("Testing FULL Ticker Query...");

    // This matches the updated component query exactly
    const { data, error } = await supabase
        .from("matches")
        .select(`
          id,
          score_a,
          score_b,
          status,
          participant_a:participants!participant_a_id(display_name),
          participant_b:participants!participant_b_id(display_name),
          tournaments (
            stores (name)
          )
        `)
        .order("updated_at", { ascending: false })
        .limit(5);

    if (error) {
        console.error("Query FAILED:", JSON.stringify(error, null, 2));
    } else {
        console.log("Query SUCCESS. Count:", data?.length);
        if (data?.length > 0) {
            console.log("Row 0:", JSON.stringify(data[0], null, 2));
        } else {
            console.log("Returned 0 rows. Checking if matches exist at all...");
            const { count } = await supabase.from('matches').select('*', { count: 'exact', head: true });
            console.log("Total Matches in DB:", count);
        }
    }
}

test();
