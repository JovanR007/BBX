
const URL = "https://nealrjrvpkvvskfppfhc.supabase.co";
const SERVICE_KEY = "REDACTED";

const tournamentId = "6398cf97-3060-491a-916b-fb299c3e4332";

async function run() {
    console.log(`Diagnostic for tournament ${tournamentId}...`);

    try {
        // 1. Fetch Participants
        const pRes = await fetch(`${URL}/rest/v1/participants?tournament_id=eq.${tournamentId}&dropped=eq.false&participant_status=in.(approved,checked_in,active)`, {
            headers: { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}` }
        });
        const participants = await pRes.json();
        console.log(`Fetched ${participants.length} active participants.`);

        // 2. Fetch Matches
        const mRes = await fetch(`${URL}/rest/v1/matches?tournament_id=eq.${tournamentId}&stage=eq.swiss&status=eq.complete`, {
            headers: { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}` }
        });
        const matches = await mRes.json();
        console.log(`Fetched ${matches.length} completed swiss matches.`);

        // 3. Simulate calculateStandings logic
        const stats = {};
        participants.forEach(p => {
            stats[p.id] = { id: p.id, wins: 0, diff: 0, displayName: p.display_name };
        });

        matches.forEach(m => {
            if (m.winner_id) {
                const pA = m.participant_a_id;
                const pB = m.participant_b_id;
                if (pA && stats[pA]) {
                    stats[pA].diff += (m.score_a - m.score_b);
                    if (m.winner_id === pA) stats[pA].wins++;
                }
                if (pB && stats[pB]) {
                    stats[pB].diff += (m.score_b - m.score_a);
                    if (m.winner_id === pB) stats[pB].wins++;
                }
            }
        });

        const sortedStats = Object.values(stats).sort((a, b) => {
            if (a.wins !== b.wins) return b.wins - a.wins;
            if (a.diff !== b.diff) return b.diff - a.diff;
            return a.id.localeCompare(b.id);
        });

        console.log("Top 5 Standings (Simulated):");
        sortedStats.slice(0, 5).forEach((s, i) => console.log(`${i + 1}. ${s.displayName} - Wins:${s.wins}, Diff:${s.diff}`));

        const cutSize = 24;
        const qualifiedStats = sortedStats.slice(0, cutSize);
        const qualified = qualifiedStats.map(s => participants.find(p => p.id === s.id)).filter(Boolean);
        console.log(`Qualified players: ${qualified.length}`);

        if (qualified.length === 0) throw new Error("Qualified list is empty!");

        const bracketSize = Math.pow(2, Math.ceil(Math.log2(cutSize)));
        console.log(`Bracket Size: ${bracketSize}`);

        function getBalancedSeedingOrder(size) {
            let order = [1, 2];
            while (order.length < size) {
                let nextOrder = [];
                for (let i = 0; i < order.length; i++) {
                    nextOrder[i * 2] = order[i];
                    nextOrder[i * 2 + 1] = order.length * 2 + 1 - order[i];
                }
                order = nextOrder;
            }
            return order;
        }

        const seedingOrder = getBalancedSeedingOrder(bracketSize);
        const seeds = new Array(bracketSize).fill(null);
        for (let i = 0; i < qualified.length; i++) {
            const rank = i + 1;
            const seedIndex = seedingOrder.indexOf(rank);
            seeds[seedIndex] = qualified[i];
        }

        const matchesToInsert = [];
        for (let i = 0; i < bracketSize / 2; i++) {
            const topSeed = seeds[i * 2];
            const botSeed = seeds[i * 2 + 1];
            if (topSeed && !botSeed) {
                matchesToInsert.push({ num: i + 1, type: 'BYE', a: topSeed.display_name });
            } else if (topSeed && botSeed) {
                matchesToInsert.push({ num: i + 1, type: 'VS', a: topSeed.display_name, b: botSeed.display_name });
            }
        }

        console.log(`Proposed matches: ${matchesToInsert.length}`);
        console.log("First 4 proposed matches:");
        console.log(matchesToInsert.slice(0, 4));

        console.log("SUCCESS: Simulation complete.");

    } catch (err) {
        console.error("DIAGNOSTIC FAILED:", err);
    }
}

run();
