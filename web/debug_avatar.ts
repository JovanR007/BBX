
import fs from 'fs';
import path from 'path';

// Manual .env.local loading
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        console.log("Loading .env.local...");
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
    } else {
        console.warn(".env.local not found!");
    }
} catch (e) {
    console.error("Error loading .env.local:", e);
}

async function debugAvatar() {
    console.log("--- Debugging Avatar Upload ---");

    // Dynamic Import to allow Env Vars to load first
    const { supabaseAdmin } = await import("./lib/supabase-admin");

    // 1. Find User by Username 'AluBean2'
    const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("username", "AluBean2")
        .single();

    if (profileError) {
        console.error("Error finding profile:", profileError);
        return;
    }

    if (!profile) {
        console.error("Profile 'AluBean2' not found.");
        return;
    }

    console.log("Profile Found:", {
        id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url
    });

    // 2. Check Storage Bucket
    const { data: files, error: storageError } = await supabaseAdmin
        .storage
        .from('avatars')
        .list(); // List root files

    if (storageError) {
        console.error("Storage List Error:", storageError);
    } else {
        console.log(`Found ${files?.length || 0} files in 'avatars' bucket.`);
        if (files && files.length > 0) {
            console.log("Recent files:", files.slice(0, 5).map(f => f.name));

            // Check if user has a file
            const userFile = files.find(f => f.name.startsWith(profile.id));
            if (userFile) {
                console.log("✅ User has a file in storage:", userFile.name);

                // Get Public URL manually to verify
                const { data } = supabaseAdmin.storage
                    .from('avatars')
                    .getPublicUrl(userFile.name);
                console.log("   Test Public URL:", data.publicUrl);

                if (profile.avatar_url !== data.publicUrl) {
                    console.warn("⚠️ Mismatch! Profile URL:", profile.avatar_url, " vs Generated:", data.publicUrl);
                } else {
                    console.log("✅ Profile URL matches generated URL.");
                }
            } else {
                console.log("❌ No file found in storage starting with user ID.");
            }
        }
    }
}

debugAvatar().catch(console.error);
