import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log(`=== Finding Store Owner IDs ===\n`);
    const { data: stores } = await supabaseAdmin
        .from('stores')
        .select('id, name, slug, owner_id')
        .or('name.ilike.%Hanma%,name.ilike.%Hobby Stronghold%');

    if (stores) {
        stores.forEach(s => console.log(`${s.name}: ${s.id} (Owner: ${s.owner_id})`));
    } else {
        console.log('No stores found.');
    }
}

main();
