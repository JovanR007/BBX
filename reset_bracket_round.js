import "dotenv/config";
import { supabase } from "./lib/supabase.js";

const TOURNAMENT_ID = process.env.TEST_TOURNAMENT_ID;

async function run() {
    if (!TOURNAMENT_ID) throw new Error("Missing TEST_TOURNAMENT_ID");

    const roundArg = process.argv[2];
    if (!roundArg) {
        console.log("Usage: node reset_bracket_round.js <round_number>");
        console.log("Ex: node reset_bracket_round.js 3 (Deletes Round 3 and resets Round 2 status?)");
        console.log("Actually: Strategy -> Revert completion of Round X?");
        console.log("Strategy chosen: Reset matches in Round X to pending, and DELETE rounds > X.");
        process.exit(1);
    }

    const roundNum = Number(roundArg);

    console.log(`RESETTING Tournament to state AT pending Round ${roundNum} ...`);

    // 1. Delete Future Rounds (Recursively invalid)
    const { error: delErr } = await supabase
        .from("matches")
        .delete()
        .eq("tournament_id", TOURNAMENT_ID)
        .eq("stage", "top_cut")
        .gt("bracket_round", roundNum);

    if (delErr) throw delErr;
    console.log(`Deleted Rounds > ${roundNum}.`);

    // 2. Reset matches in THIS round to "pending" (Clear scores/winners)
    // Also delete their match_events?
    const { error: updErr } = await supabase
        .from("matches")
        .update({
            status: "pending",
            score_a: 0,
            score_b: 0,
            winner_id: null
        })
        .eq("tournament_id", TOURNAMENT_ID)
        .eq("stage", "top_cut")
        .eq("bracket_round", roundNum)
        .eq("is_bye", false); // Don't reset BYEs (they are auto-complete)

    if (updErr) throw updErr;
    console.log(`Reset Round ${roundNum} to PENDING.`);

    // 3. Clear match_events for this round
    // Need match IDs first? Or join query.
    // Supabase JS doesn't support easy delete-join.
    // Fetch IDs first.
    const { data: matches } = await supabase
        .from("matches")
        .select("id")
        .eq("tournament_id", TOURNAMENT_ID)
        .eq("stage", "top_cut")
        .eq("bracket_round", roundNum);

    if (matches && matches.length > 0) {
        const ids = matches.map(m => m.id);
        const { error: evErr } = await supabase
            .from("match_events")
            .delete()
            .in("match_id", ids);
        if (evErr) console.warn("Event clear warning:", evErr.message);
    }

    console.log("Success. Round is ready to be re-played.");
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
