import "dotenv/config";
import { supabase } from "./lib/supabase.js";

const TOURNAMENT_ID = process.env.TEST_TOURNAMENT_ID;

const names = [
    "Player 1",
    "Player 2",
    "Player 3",
    "Player 4",
    "Player 5",
    "Player 6",
    "Player 7",
];

async function run() {
    const rows = names.map((n) => ({
        tournament_id: TOURNAMENT_ID,
        display_name: n,
        status: "approved",
    }));

    const { data, error } = await supabase.from("participants").insert(rows).select();
    if (error) throw error;

    console.log("Inserted participants:", data.length);
}

run().catch(console.error);
