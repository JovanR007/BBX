const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load env from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function seedStores() {
    console.log("🌱 Starting store seed process...\n");

    // Load test data
    const testData = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, 'test-seed-data.json'), 'utf-8')
    );

    console.log(`📦 Found ${testData.test_users.length} test users to create\n`);

    for (const user of testData.test_users) {
        console.log(`\n👤 Processing: ${user.owner_name} (${user.city}, ${user.country})`);

        try {
            // Step 1: Create Stack Auth user (you would need to do this manually or via Stack API)
            // For now, we'll generate a fake user ID and you'll need to replace it
            const fakeUserId = `user_test_${user.email.split('@')[0]}`;

            console.log(`   ℹ️  You need to create Stack Auth user with email: ${user.email}`);
            console.log(`   ℹ️  Password: ${user.password}`);
            console.log(`   ℹ️  Then replace this ID: ${fakeUserId}`);

            // Step 2: Create profile
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .upsert({
                    id: fakeUserId,
                    username: user.email.split('@')[0],
                    display_name: user.owner_name,
                    bio: `Store owner from ${user.city}, ${user.country}`,
                }, { onConflict: 'id' });

            if (profileError) {
                console.log(`   ❌ Profile creation failed: ${profileError.message}`);
                continue;
            }

            console.log(`   ✅ Profile created`);

            // Step 3: Create store with random PIN
            const pin = Math.floor(Math.random() * (9999 - 1000 + 1) + 1000).toString();

            const { error: storeError } = await supabaseAdmin
                .from('stores')
                .insert({
                    owner_id: fakeUserId,
                    name: user.store_name,
                    slug: user.store_slug,
                    contact_number: user.contact,
                    address: user.address,
                    pin: pin,
                    city: user.city,
                    country: user.country
                });

            if (storeError) {
                if (storeError.code === '23505') {
                    console.log(`   ⚠️  Store already exists, skipping...`);
                } else {
                    console.log(`   ❌ Store creation failed: ${storeError.message}`);
                }
                continue;
            }

            console.log(`   ✅ Store created with PIN: ${pin}`);
            console.log(`   🔗 Store slug: ${user.store_slug}`);

        } catch (error) {
            console.error(`   ❌ Error processing ${user.owner_name}:`, error.message);
        }
    }

    console.log("\n\n✨ Seed process complete!");
    console.log("\n⚠️  IMPORTANT: You need to manually create Stack Auth users first!");
    console.log("Then update the script with real user IDs.");
}

seedStores();
