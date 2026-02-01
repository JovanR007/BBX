const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const sql = fs.readFileSync(path.join(__dirname, 'drop_constraint.sql'), 'utf8');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }); // Assuming exec_sql RPC exists or using client if admin allows

    // Fallback if RPC doesn't exist (Supabase JS client can't run raw SQL typically without Supabase Admin Dashboard or Migration Tool)
    // Actually, we can't run DDL via JS client easily unless we have a specific function.
    // Let's print instructions or try via a known migration function if available.
    // Wait, the user has been running migrations. I should have asked user or used a migration file?
    // I see a 'manual_migration.sql' often used.

    console.log("Since I cannot run DDL directly via JS client without a specific RPC, please run the following SQL in your Supabase Dashboard SQL Editor:");
    console.log(sql);
}

run();
