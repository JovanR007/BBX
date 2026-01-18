import "dotenv/config";
import { supabase } from "./lib/supabase.js";

const TOURNAMENT_ID = process.env.TEST_TOURNAMENT_ID;

async function run() {
    if (!TOURNAMENT_ID) throw new Error("Missing TEST_TOURNAMENT_ID is .env");

    console.log(`fetching Top Cut results for tournament: ${TOURNAMENT_ID}\n`);

    // Fetch all Top Cut matches
    const { data: matches, error } = await supabase
        .from("matches")
        .select(`
            match_number, bracket_round, 
            participant_a_id, participant_b_id, 
            score_a, score_b, 
            winner_id, status
        `)
        .eq("tournament_id", TOURNAMENT_ID)
        .eq("stage", "top_cut")
        .order("bracket_round", { ascending: true })
        .order("match_number", { ascending: true });

    if (error) throw error;

    if (!matches || matches.length === 0) {
        console.log("No Top Cut matches found.");
        return;
    }

    // Sort by Round
    const rounds = {};
    matches.forEach(m => {
        if (!rounds[m.bracket_round]) rounds[m.bracket_round] = [];
        rounds[m.bracket_round].push(m);
    });

    // Display
    const roundNums = Object.keys(rounds).map(Number).sort((a, b) => a - b);
    let potentialChampion = null;

    for (const r of roundNums) {
        console.log(`=== Round ${r} ===`);
        for (const m of rounds[r]) {
            const pA = m.participant_a_id || "BYE";
            const pB = m.participant_b_id || "BYE";
            let result = "";

            if (m.status === 'complete') {
                if (m.winner_id) {
                    const winner = (m.winner_id === m.participant_a_id) ? pA : pB;
                    result = `Winner: ${winner} (${m.score_a}-${m.score_b})`;
                    // The winner of the very last match viewed is potentially the champion
                    potentialChampion = m.winner_id;
                } else {
                    result = "Draw/Error";
                }
            } else {
                result = "Pending";
            }

            console.log(`Match ${m.match_number}: ${pA} vs ${pB} -> ${result}`);
        }
        console.log("");
    }

    // Identify Champion (Winner of the highest match number in the highest round)
    // Actually, simply: The winner of the single match in the highest round?
    // What about 3rd place? 3rd place is usually Match 2 in the final round.
    // Champion is match_number 1 of the last round.

    const finalRound = rounds[roundNums[roundNums.length - 1]];
    const championMatch = finalRound.find(m => m.match_number === 1);

    if (championMatch && championMatch.status === 'complete' && championMatch.winner_id) {
        console.log(`\n🏆 CHAMPION: ${championMatch.winner_id} 🏆`);
    } else {
        console.log("\nChampion not yet determined.");
    }
}

run().catch(console.error);
