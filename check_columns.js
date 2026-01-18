const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStandingsStructure() {
    const { data: stds, error } = await supabase
        .from("swiss_standings")
        .select("*")
        .limit(1);

    if (error) {
        console.error(error);
        return;
    }

    if (stds && stds.length > 0) {
        console.log("Columns found:", Object.keys(stds[0]));
        console.log("Sample Data:", stds[0]);
    } else {
        console.log("No data found in swiss_standings");
    }
}

checkStandingsStructure();
