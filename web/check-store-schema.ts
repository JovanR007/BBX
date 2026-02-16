import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log(`=== Checking Store Schema ===\n`);
    const { data: store } = await supabaseAdmin
        .from('stores')
        .select('*')
        .limit(1)
        .single();

    if (store) {
        console.log('Fields:', Object.keys(store));
        console.log('Sample:', store);
    } else {
        console.log('No stores found.');
    }
}

main();
