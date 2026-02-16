
import { supabaseAdmin } from "./lib/supabase-admin";
import { promoteWinnerToNextRound } from "./lib/bracket-logic";

async function main() {
    const tournamentId = "6398cf97-3060-491a-916b-fb299c3e4332";
    console.log(`Force syncing matches for tournament ${tournamentId}...`);

    const { data: matches, error } = await supabaseAdmin
        .from("matches")
        .select("id, bracket_round, match_number, winner_id, status")
        .eq("tournament_id", tournamentId)
        .eq("stage", "top_cut")
        .eq("status", "complete");

    if (error) {
        console.error("Error fetching matches:", error);
        return;
    }

    if (!matches || matches.length === 0) {
        console.log("No completed top_cut matches found.");
        return;
    }

    console.log(`Found ${matches.length} completed matches. Propagating winners...`);

    for (const match of matches) {
        if (match.winner_id) {
            console.log(`Syncing match ${match.id} (R${match.bracket_round} M${match.match_number}) -> Winner: ${match.winner_id}`);
            await promoteWinnerToNextRound(match.id);
        }
    }

    console.log("Done!");
}

main();
