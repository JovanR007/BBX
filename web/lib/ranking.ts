import { supabaseAdmin } from "./supabase-admin";

export const RANK_TIERS = [
    { name: "Newbie", min: 0 },
    { name: "Trainee", min: 51 },
    { name: "Blader", min: 151 },
    { name: "Elite Blader", min: 301 },
    { name: "Master", min: 501 },
    { name: "Legend", min: 1000 }
];

export function getTierName(points: number) {
    // Find the highest tier where points >= min
    const tier = [...RANK_TIERS].reverse().find(t => points >= t.min);
    return tier ? tier.name : "Newbie";
}

/**
 * Recalculates and updates a player's total ranking points.
 * Formula:
 * - Match Win: 3 pts
 * - Match Draw: 1 pt (If we had draws, currently 0/0 logic)
 * - Match Loss: 0 pts
 * - Tournament Win: +20 pts (Top Cut Winner)
 * - Top Cut Appearance: +10 pts (Matches in stage 'top_cut')
 */
export async function updatePlayerPoints(userId: string) {
    if (!userId) return;

    try {
        // 0. Fetch Active Season
        const { data: activeSeason } = await supabaseAdmin
            .from("seasons")
            .select("id, start_date, name")
            .eq("is_active", true)
            .single();

        if (!activeSeason) {
            console.log("[Ranking] No active season found. Skipping update.");
            return;
        }

        const seasonStart = new Date(activeSeason.start_date).toISOString();

        // 1. Fetch all completed matches for this user WITHIN the active season
        // We need to find matches where user was participant_a or participant_b
        // AND the match created_at is after the season start.

        // Helper: Get Participant IDs for this user
        const { data: parts } = await supabaseAdmin
            .from("participants")
            .select("id, tournament_id")
            .eq("user_id", userId);

        if (!parts || parts.length === 0) {
            // User has no participants left (e.g. all deleted). Reset to 0.
            await supabaseAdmin.from("profiles").update({ ranking_points: 0, tier: "Newbie" }).eq("id", userId);
            console.log(`[Ranking] Reset ${userId} to 0 points.`);
            return;
        }

        const partIds = parts.map(p => p.id);
        const tourneyIds = parts.map(p => p.tournament_id);

        // Fetch matches correctly now, filtering by Season Start Date
        // AND exclude matches from unranked tournaments
        const { data: userMatches } = await supabaseAdmin
            .from("matches")
            .select("*, tournament:tournaments(is_ranked)")
            .or(`participant_a_id.in.(${partIds.join(',')}),participant_b_id.in.(${partIds.join(',')})`)
            .eq("status", "complete")
            .gte("created_at", seasonStart); // ONLY count matches after season start

        // Filter out matches from unranked tournaments
        const rankedMatches = userMatches?.filter((m: any) => m.tournament?.is_ranked !== false) || [];

        let points = 0;

        // Calc Match Points
        if (rankedMatches) {
            for (const m of rankedMatches) {
                if (m.winner_id && partIds.includes(m.winner_id)) {
                    points += 3; // Win
                } else if (m.score_a === m.score_b) {
                    points += 1; // Draw (Theoretical)
                }

                // Top Cut Bonus (Participation in Top Cut match gives bonus? Or just winning?)
                // Let's say: WINNING a match in Top Cut gives extra +2? 
                // Plan said: "Top Cut (+10)". Maybe "Reaching Top Cut".
                // Let's stick to Plan: Tournament Win (+20).
            }
        }

        // Calc Tournament Bonuses
        // Check for "Grand Champion" badges or check logic manually?
        // Let's re-use the badge logic or just check wins.
        // If they WON the tournament (winner of final match).

        for (const tourneyId of new Set(rankedMatches.map(m => m.tournament_id))) {
            // Check if this user won the tournament
            const { data: winnerMatch } = await supabaseAdmin
                .from("matches")
                .select("winner_id")
                .eq("tournament_id", tourneyId)
                .eq("stage", "top_cut")
                .order("bracket_round", { ascending: false })
                .limit(1)
                .single();

            if (winnerMatch && partIds.includes(winnerMatch.winner_id)) {
                points += 20; // Tournament Win Bonus
            }

            // Check Top Cut Appearance (Any match in top_cut)
            const topCutMatches = rankedMatches?.filter(m => m.tournament_id === tourneyId && m.stage === 'top_cut');
            if (topCutMatches && topCutMatches.length > 0) {
                points += 10; // Made it to Top Cut
            } else {
                // FALLBACK: If no top_cut matches exist for this tournament, check if User is the Swiss Winner
                // (Only if the tournament has NO top cut at all)
                const { count } = await supabaseAdmin
                    .from("matches")
                    .select("id", { count: 'exact', head: true })
                    .eq("tournament_id", tourneyId)
                    .eq("stage", "top_cut");

                if (count === 0) {
                    console.log(`[Ranking] No Top Cut for ${tourneyId}, checking Swiss winner...`);
                    // No top cut exists. Calculate Swiss Ranking.
                    // fetch ALL matches for this tournament to determine winner
                    const { data: allTourneyMatches } = await supabaseAdmin
                        .from("matches")
                        .select("winner_id, score_a, score_b, participant_a_id, participant_b_id")
                        .eq("tournament_id", tourneyId)
                        .eq("status", "complete");

                    console.log(`[Ranking] Found ${allTourneyMatches?.length} complete matches.`);

                    if (allTourneyMatches) {
                        const scores: Record<string, number> = {};
                        for (const m of allTourneyMatches) {
                            if (m.winner_id) {
                                scores[m.winner_id] = (scores[m.winner_id] || 0) + 3;
                            } else if (m.score_a === m.score_b) {
                                if (m.participant_a_id) scores[m.participant_a_id] = (scores[m.participant_a_id] || 0) + 1;
                                if (m.participant_b_id) scores[m.participant_b_id] = (scores[m.participant_b_id] || 0) + 1;
                            }
                        }

                        // Debug scores
                        // console.log("Scores:", scores);

                        // Find Max Score
                        let maxScore = -1;
                        let winners: string[] = [];
                        for (const [pid, score] of Object.entries(scores)) {
                            if (score > maxScore) {
                                maxScore = score;
                                winners = [pid];
                            } else if (score === maxScore) {
                                winners.push(pid);
                            }
                        }

                        console.log(`[Ranking] MaxScore: ${maxScore}, Winners: ${winners.length}`);

                        // Award bonus if user is ONE of the winners (Ties get bonus too for now)
                        if (partIds.some(pid => winners.includes(pid))) {
                            console.log(`[Ranking] User ${userId} is a Swiss Winner! (+20)`);
                            points += 20; // Swiss Tournament Win Bonus
                        }
                    }
                }
            }
        }

        const newTier = getTierName(points);

        // Update Profile
        await supabaseAdmin
            .from("profiles")
            .update({
                ranking_points: points,
                tier: newTier
            })
            .eq("id", userId);

        console.log(`Updated points for ${userId}: ${points} (${newTier})`);

    } catch (e) {
        console.error("Error updating ranking points:", e);
    }
}

export async function getLeaderboard(scope: 'global' | 'country' | 'city' = 'global', location?: string, seasonId?: string) {
    if (seasonId) {
        // Fetch Historical Data from player_seasonal_stats
        // We need to join with profiles to get display info
        let query = supabaseAdmin
            .from("player_seasonal_stats")
            .select(`
                final_points,
                final_tier,
                user:profiles (
                    id, username, display_name, avatar_url, country, city
                )
            `)
            .eq("season_id", seasonId)
            .gt("final_points", 0)
            .order("final_points", { ascending: false })
            .limit(100);

        // Note: Filtering by country/city on historical data is tricky because locations might change.
        // For now, we'll filter via the joined relation if possible or post-filter.
        // Supabase join filtering: !inner join required for filtering parent based on child, but here we filter child based on parent's location?
        // Actually, we are selecting FROM stats.
        // If we want to filter by country, we need: .eq('user.country', location) which supabase supports via JSON path or specialized filter string if embedded?
        // Simpler for now: Fetch top 100 then filter? No, pagination issues.
        // Let's rely on client-side filtering or assume global scope for history for now, due to complexity.
        // OR: use !inner to force the join and filter.

        if (scope !== 'global' && location) {
            // For simplicity in this phase, let's just warn or handle global only for history, 
            // OR try the !inner trick:
            // user:profiles!inner(...)
        }

        try {
            const { data, error } = await query;
            if (error) throw error;

            // Map structure to match expected output
            return data.map((entry: any) => ({
                id: entry.user.id,
                username: entry.user.username,
                display_name: entry.user.display_name,
                avatar_url: entry.user.avatar_url,
                ranking_points: entry.final_points,
                tier: entry.final_tier,
                country: entry.user.country,
                city: entry.user.city
            }));
        } catch (e) {
            console.error("[Ranking] JSON Fetch Error:", e);
            return [];
        }
    } else {
        // Fetch Live Data from profiles
        let query = supabaseAdmin
            .from("profiles")
            .select("id, username, display_name, avatar_url, ranking_points, tier, country, city")
            .gt("ranking_points", 0)
            .order("ranking_points", { ascending: false })
            .limit(100);

        if (scope === 'country' && location) {
            query = query.ilike("country", location);
        } else if (scope === 'city' && location) {
            query = query.ilike("city", `%${location}%`);
        }

        try {
            const { data, error } = await query;
            if (error) throw error;
            return data;
        } catch (e) {
            console.error("[Ranking] Live Fetch Error:", e);
            return [];
        }
    }
}
