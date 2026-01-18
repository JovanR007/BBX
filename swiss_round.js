import "dotenv/config";
import { generateSwissRound } from "./lib/swiss_round.js";

const TOURNAMENT_ID = process.env.TEST_TOURNAMENT_ID;
const roundNumber = Number(process.argv[2]);

async function run() {
    if (!TOURNAMENT_ID) throw new Error("Missing TEST_TOURNAMENT_ID in .env");
    if (!roundNumber) throw new Error("Usage: node swiss_round.js <roundNumber>");

    const result = await generateSwissRound(TOURNAMENT_ID, roundNumber);
    console.log(`Swiss Round ${roundNumber} created:`);
    console.dir(result, { depth: null });
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
