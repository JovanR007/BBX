import "dotenv/config";
import { advanceBracket } from "./lib/advance_bracket.js";

const TOURNAMENT_ID = process.env.TEST_TOURNAMENT_ID;

async function run() {
    if (!TOURNAMENT_ID) throw new Error("Missing TEST_TOURNAMENT_ID in .env");

    const newMatches = await advanceBracket(TOURNAMENT_ID);

    if (newMatches.length === 0) {
        console.log("No matches created (Tournament complete?)");
    } else {
        console.log(`Created ${newMatches.length} matches for the next round.`);
        newMatches.forEach(m => {
            const target = m.target_points;
            console.log(`Match ${m.match_number}: ${m.participant_a_id} vs ${m.participant_b_id} (Target: ${target})`);
        });
    }
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
