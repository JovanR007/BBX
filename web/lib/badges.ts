import { supabaseAdmin } from "./supabase-admin";

/**
 * Core function to award a badge to a user if they don't already have it.
 */
export async function awardBadge(userId: string, badgeName: string, tournamentId?: string) {
    try {
        // 1. Get Badge ID
        const { data: badge, error: bErr } = await supabaseAdmin
            .from("badges")
            .select("id")
            .eq("name", badgeName)
            .single();

        if (bErr || !badge) {
            console.error(`Badge [${badgeName}] not found in database.`);
            return { success: false, error: "Badge not found" };
        }

        // 2. Check if user already has it
        const { data: existing } = await supabaseAdmin
            .from("user_badges")
            .select("id")
            .eq("user_id", userId)
            .eq("badge_id", badge.id)
            .maybeSingle();

        if (existing) {
            return { success: true, alreadyEarned: true };
        }

        // 3. Award Badge
        const { error: iErr } = await supabaseAdmin
            .from("user_badges")
            .insert({
                user_id: userId,
                badge_id: badge.id,
                tournament_id: tournamentId || null
            });

        if (iErr) {
            // Ignore unique constraint violations (safety race condition)
            if (iErr.code === '23505') return { success: true, alreadyEarned: true };
            throw iErr;
        }

        console.log(`Earned Badge: [${badgeName}] for user [${userId}]`);
        return { success: true, newlyEarned: true };
    } catch (e) {
        console.error("AwardBadge Error:", e);
        return { success: false, error: "Internal Error" };
    }
}

/**
 * Checks for badges related to a specific match result (e.g., Burst Artist, Comeback Kid).
 */
export async function checkMatchBadges(userId: string, matchId: string, tournamentId: string) {
    // 1. Fetch match and its events
    const { data: match } = await supabaseAdmin
        .from("matches")
        .select("*, match_events(*)")
        .eq("id", matchId)
        .single();

    if (!match || match.winner_id !== userId) return;

    // Badge: Comeback Kid (Win 4-3 from 0-3)
    // This requires tracking score history, which we don't have perfectly in match_events yet 
    // but we can infer if they won a match where they were down significantly?
    // For now, let's stick to total counts.

    // Increment Counts (In a real system, we might use a 'counters' table, but for now we query DB stats)

    // Badge: Burst Artist (Win 50 matches via Burst)
    const { count: burstWins } = await supabaseAdmin
        .from("match_events")
        .select("id", { count: 'exact', head: true })
        .eq("winner_participant_id", match.participant_a_id === userId ? match.participant_a_id : match.participant_b_id)
        .eq("finish", "burst");

    if ((burstWins || 0) >= 50) await awardBadge(userId, "Burst Artist", tournamentId);

    // Badge: Spin-Finish King (Win 50 matches via Spin)
    const { count: spinWins } = await supabaseAdmin
        .from("match_events")
        .select("id", { count: 'exact', head: true })
        .eq("winner_participant_id", match.participant_a_id === userId ? match.participant_a_id : match.participant_b_id)
        .eq("finish", "spin");

    if ((spinWins || 0) >= 50) await awardBadge(userId, "Spin-Finish King", tournamentId);

    // Badge: Master Blader (200 total match wins)
    const { count: totalWins } = await supabaseAdmin
        .from("matches")
        .select("id", { count: 'exact', head: true })
        .eq("winner_id", userId);

    if ((totalWins || 0) >= 200) await awardBadge(userId, "Master Blader", tournamentId);

    // Badge: Xtreme Legend (Win 20 matches via Xtreme)
    const { count: xtremeWins } = await supabaseAdmin
        .from("match_events")
        .select("id", { count: 'exact', head: true })
        .eq("winner_participant_id", match.participant_a_id === userId ? match.participant_a_id : match.participant_b_id)
        .eq("finish", "xtreme");

    if ((xtremeWins || 0) >= 20) await awardBadge(userId, "Xtreme Legend", tournamentId);
}

/**
 * Checks for badges related to tournament conclusions (e.g., Grand Champion, Unkillable Demon King).
 */
export async function checkTournamentBadges(tournamentId: string) {
    try {
        // 1. Find the Winner (Grand Champion)
        const { data: winnerMatch } = await supabaseAdmin
            .from("matches")
            .select("winner_id, participant_a_id, participant_b_id")
            .eq("tournament_id", tournamentId)
            .eq("stage", "top_cut")
            .order("bracket_round", { ascending: false })
            .order("match_number", { ascending: false })
            .limit(1)
            .single();

        if (!winnerMatch || !winnerMatch.winner_id) return;

        // Fetch user_id of the winner
        const { data: participant } = await supabaseAdmin
            .from("participants")
            .select("user_id")
            .eq("id", winnerMatch.winner_id)
            .single();

        if (!participant || !participant.user_id) return;

        const winnerUserId = participant.user_id;

        // 1. Award Grand Champion
        await awardBadge(winnerUserId, "Grand Champion", tournamentId);

        // 2. Check for "3-Peat" (Win 3 back-to-back tournaments)
        // Check the last 3 tournaments the user WON.
        // Wait, "back-to-back" usually means consecutive appearances? or just last 3 played?
        // Let's go with "The last 3 tournaments this user entered, they won".
        const { data: lastParticipations } = await supabaseAdmin
            .from("participants")
            .select("tournament_id, tournament:tournaments(status)")
            .eq("user_id", winnerUserId)
            .order("created_at", { ascending: false })
            .limit(3);

        if (lastParticipations && lastParticipations.length === 3) {
            // Find winners for those 3 tournaments
            let winCount = 0;
            for (const part of lastParticipations) {
                const { data: topMatch } = await supabaseAdmin
                    .from("matches")
                    .select("winner_id")
                    .eq("tournament_id", part.tournament_id)
                    .eq("stage", "top_cut")
                    .order("bracket_round", { ascending: false })
                    .limit(1)
                    .single();

                // Need to verify if the winner_id is actually the participant ID for this user in that tourney
                const { data: pInTourney } = await supabaseAdmin
                    .from("participants")
                    .select("id")
                    .eq("user_id", winnerUserId)
                    .eq("tournament_id", part.tournament_id)
                    .single();

                if (topMatch?.winner_id === pInTourney?.id) winCount++;
            }
            if (winCount === 3) await awardBadge(winnerUserId, "3-Peat", tournamentId);
        }

        // 3. Check for "Unkillable Demon King" (100% win rate in this tournament)
        // User must have played at least 1 match and won ALL of them.
        const { data: userMatches } = await supabaseAdmin
            .from("matches")
            .select("id, winner_id")
            .eq("tournament_id", tournamentId)
            .or(`participant_a_id.eq.${winnerMatch.winner_id},participant_b_id.eq.${winnerMatch.winner_id}`);

        if (userMatches && userMatches.length > 0) {
            const allWon = userMatches.every(m => m.winner_id === winnerMatch.winner_id);
            if (allWon) await awardBadge(winnerUserId, "Unkillable Demon King", tournamentId);
        }

        // 4. Check for "Living Legend" (10 total tournament wins)
        // (Similar logic, count times user was the winner of the final match in different tournaments)
        // ... (can be added later for performance optimization)

    } catch (e) {
        console.error("Tournament Badges Error:", e);
    }
}
