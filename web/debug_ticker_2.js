const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// 1. Read Env manually
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(url, key);

async function test() {
    console.log("Testing Query...");

    // Test JOIN
    const { data, error } = await supabase
        .from("matches")
        .select(`
          id,
          participant_a:participants!participant_a_id(display_name),
          participant_b:participants!participant_b_id(display_name)
        `)
        .limit(1);

    if (error) {
        console.error("Join Error:", error);
    } else {
        console.log("Join Success:", JSON.stringify(data, null, 2));
    }
}

test();
