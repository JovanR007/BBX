
const URL = "https://nealrjrvpkvvskfppfhc.supabase.co";
const SERVICE_KEY = "REDACTED";

const tournamentId = "6398cf97-3060-491a-916b-fb299c3e4332";

async function run() {
    console.log(`Syncing tournament ${tournamentId}...`);

    // 1. Fetch completed matches
    const res = await fetch(`${URL}/rest/v1/matches?tournament_id=eq.${tournamentId}&stage=eq.top_cut&status=eq.complete`, {
        headers: {
            "apikey": SERVICE_KEY,
            "Authorization": `Bearer ${SERVICE_KEY}`
        }
    });

    const matches = await res.json();
    console.log(`Found ${matches.length} completed matches.`);

    for (const match of matches) {
        if (!match.winner_id || !match.bracket_round || !match.match_number) continue;

        const nextRound = match.bracket_round + 1;
        const nextMatchNum = Math.ceil(match.match_number / 2);
        const isPlayerA = (match.match_number % 2) === 1;

        console.log(`Processing Match ${match.bracket_round}-${match.match_number} (Winner: ${match.winner_id}) -> Target: ${nextRound}-${nextMatchNum} (${isPlayerA ? 'A' : 'B'})`);

        // Update target match
        const updateBody = {};
        if (isPlayerA) updateBody.participant_a_id = match.winner_id;
        else updateBody.participant_b_id = match.winner_id;

        const upRes = await fetch(`${URL}/rest/v1/matches?tournament_id=eq.${tournamentId}&stage=eq.top_cut&bracket_round=eq.${nextRound}&match_number=eq.${nextMatchNum}`, {
            method: "PATCH",
            headers: {
                "apikey": SERVICE_KEY,
                "Authorization": `Bearer ${SERVICE_KEY}`,
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            },
            body: JSON.stringify(updateBody)
        });

        if (upRes.ok) {
            const result = await upRes.json();
            if (result.length > 0) {
                console.log(`  Successfully updated next match.`);
            } else {
                console.log(`  Next match not found yet (Round ${nextRound} M${nextMatchNum}).`);
            }
        } else {
            console.error(`  Error updating: ${upRes.statusText}`);
        }
    }

    console.log("Sync complete!");
}

run();
