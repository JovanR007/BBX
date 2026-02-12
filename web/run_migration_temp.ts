
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

async function run() {
    console.log("Running migration...");

    // Read the SQL file
    const sqlPath = path.join(process.cwd(), "supabase", "migrations", "20260212030000_achievement_requirements.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    // Split commands by semicolon (basic splitting, might need refinement if complex SQL)
    // NOTE: supabase-js 'rpc' or direct query isn't great for bulk DDL.
    // BUT we can use the 'pg' library if we had connection string.
    // Since we only have HTTP client, we can't easily run arbitrary SQL DDL unless we have a 'exec_sql' RPC function.

    // CHECK IF we have an exec_sql function?
    const { error: rpcCheck } = await supabaseAdmin.rpc('exec_sql', { sql: 'SELECT 1' });

    if (rpcCheck && rpcCheck.message.includes('function "exec_sql" does not exist')) {
        console.error("CRITICAL: Cannot run DDL via JS client without 'exec_sql' RPC function.");
        console.log("Please copy the contents of 'supabase/migrations/20260212030000_achievement_requirements.sql' and run it in the Supabase Dashboard SQL Editor.");
        return;
    }

    // Try running it as one big block if we have exec_sql
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql });

    if (error) {
        console.error("Migration Failed:", error);
    } else {
        console.log("Migration Successful!");
    }
}

run();
