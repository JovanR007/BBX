"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { advanceBracket } from "@/lib/bracket-logic";
import { generateSwissRound } from "@/lib/swiss_round";
import { generateTopCut } from "@/lib/top_cut";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function addParticipantAction(formData) {
    const name = formData.get("name");
    const tournamentId = formData.get("tournament_id");

    if (!name || !tournamentId) return { success: false, error: "Name and Tournament ID required" };

    // 1. Check Tournament Status FIRST (to enforce PIN before DB writes)
    const { data: tourney } = await supabase
        .from("tournaments")
        .select("status")
        .eq("id", tournamentId)
        .single();

    if (tourney?.status === "started") {
        // Enforce Admin PIN for Late Entry
        const pin = formData.get("admin_pin");
        if (pin !== "1234") { // Default PIN
            return { success: false, error: "Invalid Admin PIN" };
        }
    }

    // 2. Insert Participant
    const { data: newPart, error } = await supabase
        .from("participants")
        .insert({ display_name: name, tournament_id: tournamentId })
        .select()
        .single();

    if (error) return { success: false, error: error.message };

    // 3. Round Logic (if started)
    if (tourney?.status === "started") {
        // Check if we are past Round 1

        // Check if we are past Round 1
        const { count: roundTwoCount } = await supabase
            .from("matches")
            .select("id", { count: 'exact', head: true })
            .eq("tournament_id", tournamentId)
            .gt("swiss_round_number", 1);

        const isRoundOne = (roundTwoCount || 0) === 0;

        if (isRoundOne) {
            // Logic: Find if there's an existing BYE match (participant_b_id is null)
            const { data: byeMatch } = await supabase
                .from("matches")
                .select("id")
                .eq("tournament_id", tournamentId)
                .eq("swiss_round_number", 1)
                .is("participant_b_id", null)
                .single();

            if (byeMatch) {
                // Determine target points (default 4)
                const result = await supabase
                    .from("matches")
                    .update({
                        participant_b_id: newPart.id,
                        status: 'pending',
                        score_a: 0,
                        score_b: 0,
                        winner_id: null,
                        is_bye: false // No longer a bye match
                    })
                    .eq("id", byeMatch.id);

                if (result.error) return { success: false, error: "Error updating Bye: " + result.error.message };
            } else {
                // No Bye match available. Create a new pairing P_new vs BYE.
                // We need to know the next match number?
                const { count: matchCount } = await supabase
                    .from("matches")
                    .select("id", { count: 'exact', head: true })
                    .eq("tournament_id", tournamentId)
                    .eq("swiss_round_number", 1);

                // Fetch Swiss Round ID to satisfy DB constraints
                const { data: roundData } = await supabase
                    .from("swiss_rounds")
                    .select("id")
                    .eq("tournament_id", tournamentId)
                    .eq("round_number", 1)
                    .single();

                if (!roundData) return { success: false, error: "Could not find Swiss Round 1" };

                const err = await supabase
                    .from("matches")
                    .insert({
                        tournament_id: tournamentId,
                        stage: 'swiss',
                        swiss_round_id: roundData.id,
                        swiss_round_number: 1,
                        match_number: (matchCount || 0) + 1,
                        participant_a_id: newPart.id,
                        participant_b_id: null, // BYE

                        // New Bye Match -> Auto Win 4-3
                        status: 'complete',
                        score_a: 4,
                        score_b: 3,
                        winner_id: newPart.id,
                        is_bye: true,

                        target_points: 4
                    });

                if (err.error) return { success: false, error: "Error creating match: " + err.error.message };
            }
        }
    }

    revalidatePath(`/t/${tournamentId}/admin`);
    revalidatePath(`/t/${tournamentId}/bracket`);
    return { success: true };
}

export async function deleteParticipantAction(formData) {
    const participantId = formData.get("participant_id");
    const tournamentId = formData.get("tournament_id");

    if (!participantId) return { success: false, error: "Participant ID required" };

    const { error } = await supabase
        .from("participants")
        .delete()
        .eq("id", participantId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/t/${tournamentId}/admin`);
    return { success: true };
}

export async function updateParticipantAction(formData) {
    const participantId = formData.get("participant_id");
    const tournamentId = formData.get("tournament_id");
    const name = formData.get("name");

    if (!participantId || !name) return { success: false, error: "ID and Name required" };

    const { error } = await supabase
        .from("participants")
        .update({ display_name: name })
        .eq("id", participantId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/t/${tournamentId}/admin`);
    return { success: true };
}

export async function toggleRegistrationAction(formData) {
    const tournamentId = formData.get("tournament_id");
    const isOpen = formData.get("is_open") === "true"; // current state

    // If currently open (draft), we are locking (pending).
    // If currently locked (pending), we are opening (draft).
    const newStatus = isOpen ? "pending" : "draft";

    const { error } = await supabase
        .from("tournaments")
        .update({ status: newStatus })
        .eq("id", tournamentId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/t/${tournamentId}/admin`);
    return { success: true };
}

export async function startTournamentAction(formData) {
    const tournamentId = formData.get("tournament_id");
    const cutSize = Number(formData.get("cut_size"));

    if (!tournamentId || !cutSize) return { success: false, error: "Missing ID or Cut Size" };

    try {
        // 1. Update tournament settings & status
        const { error } = await supabase
            .from("tournaments")
            .update({
                cut_size: cutSize,
                status: "started" // Transition to active Swiss stage
            })
            .eq("id", tournamentId);

        if (error) throw error;

        // 2. Generate Swiss Round 1
        await generateSwissRound(tournamentId, 1);

        revalidatePath(`/t/${tournamentId}/admin`);
        revalidatePath(`/t/${tournamentId}`);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

export async function createTournamentAction(formData) {
    const name = formData.get("name");
    const cutSize = Number(formData.get("cut_size"));
    let slug = formData.get("slug");

    if (!name) return { success: false, error: "Name required" };

    // Slug validation and normalization
    if (slug) {
        slug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
        if (slug.length < 3) return { success: false, error: "Slug must be at least 3 characters" };
    } else {
        slug = null; // Ensure null if empty
    }

    const { data, error } = await supabase
        .from("tournaments")
        .insert({ name, cut_size: cutSize || 16, status: "draft", slug })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') { // Unique constraint violation (likely on slug)
            return { success: false, error: "URL Slug is already taken. Please choose another." };
        }
        return { success: false, error: error.message };
    }

    // Redirect to slug if available, else ID
    redirect(`/t/${data.slug || data.id}`);
}

export async function seedTournamentAction(tournamentId, count = 16) {
    if (!tournamentId) return { success: false, error: "Tournament ID required" };

    // 1. Verify Draft Mode
    const { data: tourney } = await supabase.from("tournaments").select("status").eq("id", tournamentId).single();
    if (tourney?.status !== "draft") return { success: false, error: "Can only seed in Draft mode." };

    // 2. Generate Players
    const players = [];
    for (let i = 1; i <= count; i++) {
        players.push({
            tournament_id: tournamentId,
            display_name: `Test Player ${i}`
        });
    }

    // 3. Bulk Insert
    const { error } = await supabase.from("participants").insert(players);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/t/${tournamentId}/admin`);
    return { success: true };
}

export async function proceedToTopCutAction(tournamentId) {
    if (!tournamentId) return { success: false, error: "Missing Tournament ID" };

    try {
        await generateTopCut(tournamentId); // This uses the cut_size from DB
        revalidatePath(`/t/${tournamentId}/admin`);
        revalidatePath(`/t/${tournamentId}/bracket`);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

export async function advanceBracketAction(tournamentId) {
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
            // No matches? Maybe start round 1 logic if not started? 
            // But startTournamentAction does round 1.
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

            // 2. Mark current round as complete in swiss_rounds table
            // This is critical because generateSwissRound checks this status
            await supabase
                .from("swiss_rounds")
                .update({ status: "complete" })
                .eq("tournament_id", tournamentId)
                .eq("round_number", currentRound);

            const nextRound = (currentRound || 0) + 1;
            await generateSwissRound(tournamentId, nextRound);
        } else {
            // Top Cut
            await advanceBracket(supabase, tournamentId);
        }

        revalidatePath(`/t/${tournamentId}/admin`);
        revalidatePath(`/t/${tournamentId}/bracket`);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

export async function reportMatchAction(formData) {
    const matchId = formData.get("match_id");
    const scoreA = Number(formData.get("score_a"));
    const scoreB = Number(formData.get("score_b"));
    const finishType = formData.get("finish_type");
    const pA = formData.get("p_a");
    const pB = formData.get("p_b");

    // Validation
    let winnerId = null;
    if (scoreA > scoreB) winnerId = pA;
    else if (scoreB > scoreA) winnerId = pB;

    // Finish Points
    const FINISH_POINTS = { spin: 1, over: 2, burst: 2, xtreme: 3 };
    const points = FINISH_POINTS[finishType] || 0;

    // 1. Insert Event
    const { error: evErr } = await supabase.from("match_events").insert({
        match_id: matchId,
        winner_participant_id: winnerId,
        finish: finishType,
        points_awarded: points
    });

    if (evErr) return { success: false, error: evErr.message };

    // 2. Update Match
    const { error: mErr } = await supabase.from("matches").update({
        score_a: scoreA,
        score_b: scoreB,
        winner_id: winnerId,
        status: "complete"
    }).eq("id", matchId);

    if (mErr) return { success: false, error: mErr.message };

    revalidatePath("/", "layout");
    return { success: true };
}

export async function autoScoreRoundAction(tournamentId) {
    if (!tournamentId) return { success: false, error: "Missing Tournament ID" };

    try {
        // 1. Get all pending matches
        const { data: matches, error: fetchErr } = await supabase
            .from("matches")
            .select("*")
            .eq("tournament_id", tournamentId)
            .eq("status", "pending");

        if (fetchErr) throw fetchErr;
        if (!matches || matches.length === 0) return { success: false, error: "No pending matches to score." };

        const updates = [];
        const events = [];

        for (const m of matches) {
            // Randomly decide winner (0 or 1)
            const winA = Math.random() > 0.5;
            const scoreA = winA ? 4 : Math.floor(Math.random() * 3);
            const scoreB = winA ? Math.floor(Math.random() * 3) : 4;
            const winnerId = winA ? m.participant_a_id : m.participant_b_id;

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
                points_awarded: 4 // Just a dummy value
            });
        }

        // Perform Updates
        // Supabase doesn't support bulk update with different values easily in one query without RPC.
        // So we'll loop parallel promises.
        await Promise.all(updates.map(u =>
            supabase.from("matches").update({
                score_a: u.score_a,
                score_b: u.score_b,
                winner_id: u.winner_id,
                status: "complete"
            }).eq("id", u.matchId)
        ));

        // Insert Events (bulk insert is fine)
        if (events.length > 0) {
            await supabase.from("match_events").insert(events);
        }

        revalidatePath(`/t/${tournamentId}/bracket`);
        revalidatePath(`/t/${tournamentId}/admin`);
        return { success: true, count: matches.length };
    } catch (e) {
        return { success: false, error: e.message };
    }
}


export async function resetRoundAction(tournamentId) {
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
        const { error: dErr } = await supabase
            .from('matches')
            .delete()
            .eq('tournament_id', tournamentId)
            .eq('stage', 'top_cut')
            .eq('bracket_round', maxRound);

        if (dErr) throw dErr;

        revalidatePath(`/t/${tournamentId}/bracket`);
        revalidatePath(`/t/${tournamentId}/admin`);
        return { success: true, message: `Reset Round ${maxRound}` };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

export async function forceUpdateMatchScoreAction(formData) {
    const matchId = formData.get("match_id");
    const scoreA = Number(formData.get("score_a"));
    const scoreB = Number(formData.get("score_b"));
    const pin = formData.get("admin_pin");

    if (!matchId) return { success: false, error: "Match ID required" };
    if (pin !== "1234") return { success: false, error: "Invalid Admin PIN" };

    // 1. Fetch Match & Tournament Info
    const { data: match, error: mErr } = await supabase
        .from("matches")
        .select("*, tournament_id")
        .eq("id", matchId)
        .single();

    if (mErr || !match) return { success: false, error: "Match not found" };

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
    const { error: upErr } = await supabase
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

export async function endTournamentAction(formData) {
    const tournamentId = formData.get("tournament_id");
    const pin = formData.get("admin_pin");

    if (!tournamentId) return { success: false, error: "Tournament ID required" };
    if (pin !== "1234") return { success: false, error: "Invalid Admin PIN" };

    const { error } = await supabase
        .from("tournaments")
        .update({ status: "completed" })
        .eq("id", tournamentId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/t/${tournamentId}/admin`);
    revalidatePath(`/`);
    return { success: true };
}

export async function updateLiveScoreAction(matchId, scoreA, scoreB) {
    if (!matchId) return { success: false, error: "Match ID required" };

    const { error } = await supabase
        .from("matches")
        .update({
            score_a: scoreA,
            score_b: scoreB
        })
        .eq("id", matchId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}
