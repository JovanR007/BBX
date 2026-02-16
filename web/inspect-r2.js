
const URL = "https://nealrjrvpkvvskfppfhc.supabase.co";
const SERVICE_KEY = "REDACTED";

const tournamentId = "6398cf97-3060-491a-916b-fb299c3e4332";

async function run() {
    console.log(`Inspecting Round 2 for tournament ${tournamentId}...`);

    const res = await fetch(`${URL}/rest/v1/matches?tournament_id=eq.${tournamentId}&stage=eq.top_cut&bracket_round=eq.2`, {
        headers: {
            "apikey": SERVICE_KEY,
            "Authorization": `Bearer ${SERVICE_KEY}`
        }
    });

    const matches = await res.json();
    console.log(`Found ${matches.length} matches in Round 2.`);

    matches.sort((a, b) => Number(a.match_number) - Number(b.match_number));

    for (const m of matches) {
        console.log(`M${m.match_number}: A=${m.participant_a_id || 'null'}, B=${m.participant_b_id || 'null'}, Winner=${m.winner_id || 'null'}`);
    }
}

run();
