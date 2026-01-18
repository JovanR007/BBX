import "dotenv/config";
import { generateTopCut } from "./lib/top_cut.js";

const TOURNAMENT_ID = process.env.TEST_TOURNAMENT_ID;
const cutSizeArg = process.argv[2]; // Optional

async function run() {
    if (!TOURNAMENT_ID) throw new Error("Missing TEST_TOURNAMENT_ID in .env");

    const cutSize = cutSizeArg ? Number(cutSizeArg) : undefined;

    console.log(`Generating Top Cut for Tournament ${TOURNAMENT_ID}...`);

    const matches = await generateTopCut(TOURNAMENT_ID, cutSize);

    console.log(`Success! Generated ${matches.length} matches.`);
    matches.forEach(m => {
        const type = m.is_bye ? "BYE" : "VS";
        const status = m.status === "complete" ? "(Auto-Complete)" : "(Pending)";
        console.log(`Match ${m.match_number}: ${m.participant_a_id} ${type} ${m.participant_b_id || ""} ${status}`);
    });
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
