import "dotenv/config";
import { supabaseAdmin } from "./lib/supabase-admin.js";

const userId = "259e1c68-4eb0-4589-926d-29559886a309"; // MrClucker

async function awardBadges() {
    console.log("Awarding badges to MrClucker...");

    // 1. Get badge IDs
    const badgeNames = ["First Strike", "Spin-Finish King", "Unkillable Demon King", "World Class"];
    const { data: badges } = await supabaseAdmin
        .from("badges")
        .select("id, name")
        .in("name", badgeNames);

    if (!badges || badges.length === 0) {
        console.error("No badges found!");
        return;
    }

    console.log(`Found ${badges.length} badges to award.`);

    // 2. Award badges
    for (const badge of badges) {
        const { error } = await supabaseAdmin
            .from("user_badges")
            .upsert({
                user_id: userId,
                badge_id: badge.id,
                earned_at: new Date().toISOString()
            }, { onConflict: 'user_id,badge_id' });

        if (error) {
            console.error(`Error awarding "${badge.name}":`, error);
        } else {
            console.log(`Successfully awarded "${badge.name}"`);
        }
    }
}

awardBadges();
