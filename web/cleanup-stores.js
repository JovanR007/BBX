const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const SAFE_LIST = [
    'Southern Breeze Hobby and Games',
    'Cardoza Hobby Shop',
    'JK Hobby Shop PH',
    'Hobby Lords Takapuna',
    'Hanma Hobby Store',
    'Baki Hobby Store'
];

const KNOWN_SEED_SLUGS = [
    'akihabara-bey-shop', 'naniwa-battle-arena', 'london-spin-arena',
    'toronto-beyblade-club', 'sydney-burst-stadium',
    'beyblade-arena-la', 'nyc-blade-masters', 'berlin-blade-factory',
    'paris-spinning-elite', 'gangnam-battle-zone', 'sao-paulo-bey-champions',
    'arena-beyblade-cdmx', 'marina-bay-bladers', 'colosseum-spin-arena',
    'barcelona-bey-hub', 'manila-legends-arena', 'mumbai-burst-center',
    'bangkok-blade-district', 'kl-bey-masters', 'amsterdam-spin-lab'
];

const KNOWN_SEED_NAMES = [
    'Akihabara Bey Shop', 'Naniwa Battle Arena', 'London Spin Arena',
    'Toronto Beyblade Club', 'Sydney Burst Stadium'
];

async function cleanupStores() {
    console.log("🧹 Starting Store Cleanup...");
    console.log("🛡️  Safe List (Will NOT touch):", SAFE_LIST);

    // 1. Fetch all stores
    const { data: stores, error } = await supabaseAdmin
        .from('stores')
        .select('id, name, slug');

    if (error) {
        console.error("❌ Failed to fetch stores:", error.message);
        return;
    }

    console.log(`🔎 Found ${stores.length} total stores.`);

    const toDelete = [];

    for (const store of stores) {
        // SKIP if in Safe List
        if (SAFE_LIST.includes(store.name)) {
            console.log(`   ✅ KEEPING Safe Store: ${store.name}`);
            continue;
        }

        // DELETE if matches seed criteria
        if (KNOWN_SEED_SLUGS.includes(store.slug) || KNOWN_SEED_NAMES.includes(store.name)) {
            toDelete.push(store);
        }
    }

    if (toDelete.length === 0) {
        console.log("✨ No seed stores found to delete.");
        return;
    }

    console.log(`\n🗑️  Identified ${toDelete.length} stores to delete.`);

    const idsToDelete = toDelete.map(s => s.id);

    // 2. Delete related Tournaments FIRST (Foreign Key Constraint)
    console.log("   🔄 Deleting linked tournaments first...");
    const { error: tournamentError } = await supabaseAdmin
        .from('tournaments')
        .delete()
        .in('store_id', idsToDelete);

    if (tournamentError) {
        console.error("   ❌ Failed to delete tournaments:", tournamentError.message);
        // Continue anyway? Or stop? Stopping is safer, but if it partially failed, stores won't delete.
        // Let's try to proceed to stores only if this didn't critically fail (or maybe tournaments were already empty)
    } else {
        console.log("   ✅ Linked tournaments deleted.");
    }

    // 3. Perform Store Deletion
    const { error: deleteError } = await supabaseAdmin
        .from('stores')
        .delete()
        .in('id', idsToDelete);

    if (deleteError) {
        console.error("❌ Store Deletion failed:", deleteError.message);
    } else {
        console.log("\n✅ Successfully deleted seed stores!");
    }
}

cleanupStores();
