import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTournamentsStructure() {
    const { data: records, error } = await supabase
        .from("tournaments")
        .select("*")
        .limit(1);

    if (error) {
        console.error(error);
        return;
    }

    if (records && records.length > 0) {
        console.log("Columns found:", Object.keys(records[0]));
        console.log("Sample Data:", records[0]);
    } else {
        console.log("No data found in tournaments. Attempting to get columns via empty insert/error if possible or assume default.");
    }
}

checkTournamentsStructure();
