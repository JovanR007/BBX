"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from "next/cache";
import { advanceBracket } from "@/lib/bracket-logic";
import { generateSwissRound } from "@/lib/swiss_round";
import { generateTopCut } from "@/lib/top_cut";
import { stackServerApp } from "@/lib/stack";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkMatchBadges } from "@/lib/badges";
import { updatePlayerPoints } from "@/lib/ranking";
import { verifyTournamentOwner, verifyStorePin, ActionResult } from "./utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function advanceBracketAction(tournamentId: string) {
    if (!tournamentId) return { success: false, error: "Missing Tournament ID" };

    try {
        // Determine current stage based on latest matches
        const { data: latestMatches } = await supabase
            .from("matches")
            .select("stage, swiss_round_number, bracket_round")
            .eq("tournament_id", tournamentId)
            .order("created_at", { ascending: false })
            .limit(1);

        const lastMatch = latestMatches?.[0];

        if (!lastMatch) {
            return { success: false, error: "No existing matches found to advance from." };
        }

        if (lastMatch.stage === 'swiss') {
            const currentRound = lastMatch.swiss_round_number;

            // 1. Verify all matches in current round are complete
            const { data: incompleteMatches } = await supabase
                .from("matches")
                .select("id")
                .eq("tournament_id", tournamentId)
                .eq("swiss_round_number", currentRound)
                .neq("status", "complete");

            if (incompleteMatches && incompleteMatches.length > 0) {
                return { success: false, error: "Not all matches in the current round are complete." };
            }

            // 2. Mark current round as complete
            await supabaseAdmin
                .from("swiss_rounds")
                .update({ status: "complete" })
                .eq("tournament_id", tournamentId)
                .eq("round_number", currentRound);

            const nextRound = (currentRound || 0) + 1;
            const res = await generateSwissRound(tournamentId, nextRound);
            // DO NOT call advanceBracket here.
        } else if (lastMatch.stage === 'top_cut') {
            // Handle Top Cut Advancement
            await advanceBracket(tournamentId);
        } else {
            return { success: false, error: "Unknown tournament stage." };
        }

        revalidatePath(`/t/${tournamentId}/admin`);
        revalidatePath(`/t/${tournamentId}/bracket`);
        return { success: true };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown Error";
        return { success: false, error: msg };
    }
}

export async function reportMatchAction(formData: FormData) {
    const user = await stackServerApp.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const matchId = formData.get("match_id") as string;
    const scoreA = Number(formData.get("score_a"));
    const scoreB = Number(formData.get("score_b"));
    const finishType = formData.get("finish_type") as string;
    const pA = formData.get("p_a") as string;
    const pB = formData.get("p_b") as string;

    // 1. Permission Check (Owner or Judge)
    // Fetch match to get tournament_id
    const { data: match, error: fetchErr } = await supabaseAdmin
        .from("matches")
        .select("tournament_id")
        .eq("id", matchId)
        .single();

    if (fetchErr) return { success: false, error: "DB Error (Match): " + fetchErr.message };
    if (!match) return { success: false, error: "Match not found" };

    // Check if user is owner (store owner OR casual tournament organizer)
    const ownerUser = await verifyTournamentOwner(match.tournament_id);
    let isAuthorized = !!ownerUser;

    if (!isAuthorized) {
        // Check Judge
        const { data: judge } = await supabaseAdmin
            .from("tournament_judges")
            .select("user_id")
            .eq("tournament_id", match.tournament_id)
            .eq("user_id", user.id)
            .maybeSingle();

        if (judge) isAuthorized = true;
    }

    if (!isAuthorized) return { success: false, error: "Unauthorized: You are not a judge or owner." };

    // Validation
    let winnerId = null;
    if (scoreA > scoreB) winnerId = pA;
    else if (scoreB > scoreA) winnerId = pB;

    // Finish Points
    const FINISH_POINTS: Record<string, number> = { spin: 1, over: 2, burst: 2, xtreme: 3 };
    const points = FINISH_POINTS[finishType] || 0;

    // 1. Insert Event
    const { error: evErr } = await supabaseAdmin.from("match_events").insert({
        match_id: matchId,
        winner_participant_id: winnerId,
        finish: finishType,
        points_awarded: points
    });

    if (evErr) return { success: false, error: evErr.message };

    // 2. Update Match
    const { error: mErr } = await supabaseAdmin.from("matches").update({
        score_a: scoreA,
        score_b: scoreB,
        winner_id: winnerId,
        status: "complete"
    }).eq("id", matchId);

    if (mErr) return { success: false, error: mErr.message };

    revalidatePath("/", "layout");

    // Trigger Match-based Badges
    if (winnerId) {
        // Find if this winnerId (participant ID) belongs to a registered user
        const { data: part } = await supabaseAdmin.from("participants").select("user_id").eq("id", winnerId).single();
        if (part?.user_id) {
            await checkMatchBadges(part.user_id, matchId, match.tournament_id);
            // Recalculate Points for Winner
            await updatePlayerPoints(part.user_id);
        }
    }

    // Also Recalculate Points for Loser (for games played / loss stats / potential participation pts)
    const loserId = winnerId === pA ? pB : pA;
    if (loserId) {
        const { data: partL } = await supabaseAdmin.from("participants").select("user_id").eq("id", loserId).single();
        if (partL?.user_id) await updatePlayerPoints(partL.user_id);
    }

    return { success: true };
}

export async function autoScoreRoundAction(tournamentId: string) {
    if (!tournamentId) return { success: false, error: "Missing Tournament ID" };

    try {
        // 1. Get all pending matches
        const { data: matches, error: fetchErr } = await supabaseAdmin
            .from("matches")
            .select("*")
            .eq("tournament_id", tournamentId)
            .eq("status", "pending");

        if (fetchErr) throw fetchErr;
        if (!matches || matches.length === 0) return { success: false, error: "No pending matches to score." };

        const updates: any[] = [];
        const events: any[] = [];

        for (const m of matches) {
            // Randomly decide winner (0 or 1), UNLESS it's a Bye Match (Deferred)
            let winA = Math.random() > 0.5;
            let scoreA = 0;
            let scoreB = 0;
            let winnerId = null;

            const target = m.target_points || 4;
            const loserScore = Math.floor(Math.random() * (target - 1));

            if (!m.participant_b_id) {
                // Deferred Bye found during auto-score -> Force Loss
                scoreA = target - 1;
                scoreB = target;
                winnerId = null;
            } else {
                // Normal Match
                scoreA = winA ? target : loserScore;
                scoreB = winA ? loserScore : target;
                winnerId = winA ? m.participant_a_id : m.participant_b_id;
            }

            // Update Match Object
            updates.push({
                matchId: m.id,
                score_a: scoreA,
                score_b: scoreB,
                winner_id: winnerId,
                status: "complete"
            });

            // Create Event Object (Simulate a "Burst Finish" or something for the win)
            events.push({
                match_id: m.id,
                winner_participant_id: winnerId,
                finish: "auto-debug",
                points_awarded: target // Just a dummy value
            });
        }

        // Perform Updates
        // Supabase doesn't support bulk update with different values easily in one query without RPC.
        // So we'll loop parallel promises.
        await Promise.all(updates.map(u =>
            supabaseAdmin.from("matches").update({
                score_a: u.score_a,
                score_b: u.score_b,
                winner_id: u.winner_id,
                status: "complete"
            }).eq("id", u.matchId)
        ));

        // Insert Events (bulk insert is fine)
        if (events.length > 0) {
            await supabaseAdmin.from("match_events").insert(events);
        }

        revalidatePath(`/t/${tournamentId}/bracket`);
        revalidatePath(`/t/${tournamentId}/admin`);
        return { success: true, count: matches.length };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown Error";
        return { success: false, error: msg };
    }
}

export async function resetRoundAction(tournamentId: string) {
    if (!tournamentId) return { success: false, error: "Missing Tournament ID" };

    try {
        // 1. Find the latest Top Cut round
        const { data: rounds, error: rErr } = await supabase
            .from('matches')
            .select('bracket_round')
            .eq('tournament_id', tournamentId)
            .eq('stage', 'top_cut')
            .order('bracket_round', { ascending: false })
            .limit(1);

        if (rErr) throw rErr;
        if (!rounds || rounds.length === 0) return { success: false, error: "No Top Cut rounds found to reset." };

        const maxRound = rounds[0].bracket_round;

        // 2. Delete matches in that round
        const { error: dErr } = await supabaseAdmin
            .from('matches')
            .delete()
            .eq('tournament_id', tournamentId)
            .eq('stage', 'top_cut')
            .eq('bracket_round', maxRound);

        if (dErr) throw dErr;

        revalidatePath(`/t/${tournamentId}/bracket`);
        revalidatePath(`/t/${tournamentId}/admin`);
        return { success: true, message: `Reset Round ${maxRound}` };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown Error";
        return { success: false, error: msg };
    }
}

export async function forceUpdateMatchScoreAction(formData: FormData) {
    const matchId = formData.get("match_id") as string;
    const scoreA = Number(formData.get("score_a"));
    const scoreB = Number(formData.get("score_b"));

    if (!matchId) return { success: false, error: "Match ID required" };

    // 1. Fetch Match & Tournament Info
    const { data: match, error: mErr } = await supabase
        .from("matches")
        .select("*, tournament_id")
        .eq("id", matchId)
        .single();

    if (mErr || !match) return { success: false, error: "Match not found" };

    // SECURE: Check PIN
    const providedPin = formData.get("admin_pin") as string;
    if (!await verifyStorePin(match.tournament_id, providedPin)) return { success: false, error: "Invalid Store PIN" };

    // 2. Verify it's the CURRENT round (Top Cut or Swiss)
    // For Swiss, check if it's the latest round.
    if (match.stage === 'swiss') {
        const { data: latestRound } = await supabase
            .from("swiss_rounds")
            .select("round_number")
            .eq("tournament_id", match.tournament_id)
            .order("round_number", { ascending: false })
            .limit(1)
            .single();

        if (latestRound && match.swiss_round_number !== latestRound.round_number) {
            return { success: false, error: "Can only edit matches in the current active round." };
        }
    }

    // 3. Determine Winner
    const pA = match.participant_a_id;
    const pB = match.participant_b_id;
    let winnerId = null;
    let status = 'complete';

    if (scoreA > scoreB) winnerId = pA;
    else if (scoreB > scoreA) winnerId = pB;
    else status = 'draw';

    // 4. Update
    const { error: upErr } = await supabaseAdmin
        .from("matches")
        .update({
            score_a: scoreA,
            score_b: scoreB,
            winner_id: winnerId,
            status: status
        })
        .eq("id", matchId);

    if (upErr) return { success: false, error: upErr.message };

    revalidatePath(`/t/${match.tournament_id}/bracket`);
    revalidatePath(`/t/${match.tournament_id}/standings`);
    return { success: true };
}

export async function updateLiveScoreAction(matchId: string, scoreA: number, scoreB: number) {
    if (!matchId) return { success: false, error: "Match ID required" };

    const { error } = await supabaseAdmin
        .from("matches")
        .update({
            score_a: scoreA,
            score_b: scoreB
        })
        .eq("id", matchId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function syncMatchStateAction(matchId: string, scoreA: number, scoreB: number, metadata: any) {
    if (!matchId) return { success: false, error: "Match ID required" };

    const { error } = await supabaseAdmin
        .from("matches")
        .update({
            score_a: scoreA,
            score_b: scoreB,
            metadata: metadata
        })
        .eq("id", matchId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}
