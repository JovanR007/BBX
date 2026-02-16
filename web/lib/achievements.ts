
import { supabaseAdmin } from "./supabase-admin";

export async function calculateUserStats(userId: string) {
    if (!userId) return {};

    const stats: Record<string, number> = {};

    try {
        // 1. Tournaments Joined
        // Count distinct tournament_ids in participants table for this user
        const { count: tournamentsJoined } = await supabaseAdmin
            .from("participants")
            .select("tournament_id", { count: 'exact', head: true })
            .eq("user_id", userId);

        stats['tournaments_joined'] = tournamentsJoined || 0;

        // 2. Matches Played & Won
        // Fetch all matches where user was a participant
        // Warning: This can be heavy for power users. Optimization: Create a user_stats table later.
        // For now, let's just count wins which is easier if we query by winner_id
        const { count: matchesWon } = await supabaseAdmin
            .from("matches")
            .select("id", { count: 'exact', head: true })
            .eq("winner_id", userId);

        stats['matches_won'] = matchesWon || 0;

        // 3. Matches Played (Approximate for now, or distinct match IDs where pA or pB is user)
        // Let's do a direct count
        const { count: matchesPlayed } = await supabaseAdmin
            .from("matches")
            .select("id", { count: 'exact', head: true })
            .or(`participant_a_id.eq.${userId},participant_b_id.eq.${userId}`) // This might fail if using participant IDs not user IDs.
        // WAIT: matches use participant_ids, not user_ids for pA/pB. winner_id IS a participant_id usually?
        // Actually in `matches` table:
        // winner_id is UUID (references ???). 
        // In `reportMatchAction`, we set winnerId = pA (participant ID).
        // BUT `checkMatchBadges` expects `winner_id` to be compared with `userId`?
        // Let's check `checkMatchBadges` implementation in `lib/badges.ts`.

        // Checking badges.ts... 
        /*
        export async function checkMatchBadges(userId: string, matchId: string, tournamentId: string) {
           const { data: match } = ...
           if (!match || match.winner_id !== userId) return; 
        */

        // If `winner_id` is a participant ID, then `match.winner_id !== userId` will always be true (unless lucky UUID collision).
        // This means `badges.ts` might be buggy OR `matches.winner_id` stores USER ID.
        // Let's checking `app/actions/match.ts`.
        /*
         if (scoreA > scoreB) winnerId = pA; // pA is participant ID.
         ...
         .update({ winner_id: winnerId })
        */

        // So `matches.winner_id` is PARTICIPANT ID.
        // `badges.ts` compares it to `userId`. This IS A BUG in existing code.
        // I need to fix `badges.ts` logic too, but first let's get stats correctly.

        // To get stats for a User, we must find all their Participant IDs.
    } catch (e) {
        console.error("Error calculating user stats:", e);
    }

    // Retry with correct logic
    try {
        // Get all participant IDs for this user
        const { data: participations } = await supabaseAdmin
            .from("participants")
            .select("id")
            .eq("user_id", userId);

        const participantIds = participations?.map(p => p.id) || [];

        if (participantIds.length > 0) {
            // Matches Won
            const { count: wins } = await supabaseAdmin
                .from("matches")
                .select("id", { count: 'exact', head: true })
                .in("winner_id", participantIds);
            stats['matches_won'] = wins || 0;

            // Matches Played
            const { count: played } = await supabaseAdmin
                .from("matches")
                .select("id", { count: 'exact', head: true })
                .or(`participant_a_id.in.(${participantIds.join(',')}),participant_b_id.in.(${participantIds.join(',')})`);
            stats['matches_played'] = played || 0;

            // Burst/Spin/Xtreme Finishes
            // We need to join match_events
            // "For each match won by this user, check the finish type"
            // This is hard to do with simple counts in Supabase API without complex joins or RPC.
            // Simplified approach: Query match_events where winner_participant_id matches

            const { count: bursts } = await supabaseAdmin
                .from("match_events")
                .select("id", { count: 'exact', head: true })
                .in("winner_participant_id", participantIds)
                .eq("finish", "burst");
            stats['burst_finishes'] = bursts || 0;

            const { count: spins } = await supabaseAdmin
                .from("match_events")
                .select("id", { count: 'exact', head: true })
                .in("winner_participant_id", participantIds)
                .eq("finish", "spin");
            stats['spin_finishes'] = spins || 0;

            const { count: xtremes } = await supabaseAdmin
                .from("match_events")
                .select("id", { count: 'exact', head: true })
                .in("winner_participant_id", participantIds)
                .eq("finish", "xtreme");
            stats['xtreme_finishes'] = xtremes || 0;
        } else {
            stats['matches_won'] = 0;
            stats['matches_played'] = 0;
            stats['burst_finishes'] = 0;
            stats['spin_finishes'] = 0;
            stats['xtreme_finishes'] = 0;
        }

        // Account Age (Days)
        // We can check `auth.users` via `supabaseAdmin`? No, usually restricted.
        // Check `profiles.created_at` or similar. Assuming `profiles` table has it.
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("created_at, country, city, avatar_url") // also useful for profile completeness
            .eq("id", userId)
            .single();

        if (profile?.created_at) {
            const created = new Date(profile.created_at);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - created.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            stats['account_age_days'] = diffDays;
        }

        // Profile Completeness
        // Check if avatar, banner, bio etc are set.
        let isProfileComplete = 0;
        if (profile && (profile.avatar_url || profile.country)) {
            isProfileComplete = 1; // Simplified check
        }
        stats['profile_complete'] = isProfileComplete;

    } catch (e) {
        console.error("Error calculating complex stats:", e);
    }

    return stats;
}
