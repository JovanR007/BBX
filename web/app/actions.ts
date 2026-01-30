"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { advanceBracket } from "@/lib/bracket-logic";
import { generateSwissRound } from "@/lib/swiss_round";
import { generateTopCut } from "@/lib/top_cut";
import { stackServerApp } from "@/lib/stack";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Store } from "@/types";
import { awardBadge, checkMatchBadges, checkTournamentBadges } from "@/lib/badges";
import { updatePlayerPoints } from "@/lib/ranking";

type ActionResult<T> = Promise<{ success: boolean; data?: T; error?: string; count?: number; page?: number; pageSize?: number; }>;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- HELPER: Verify Ownership ---
async function verifyTournamentOwner(tournamentId: string) {
    const user = await stackServerApp.getUser();
    if (!user) return null;

    const { data: tourney } = await supabaseAdmin
        .from("tournaments")
        .select("store_id, organizer_id")
        .eq("id", tournamentId)
        .single();

    if (!tourney) return null;

    // Check if user is the organizer (for casual tournaments)
    if (tourney.organizer_id && tourney.organizer_id === user.id) {
        return user;
    }

    // Check if user owns the store (for ranked tournaments)
    if (tourney.store_id) {
        const { data: store } = await supabaseAdmin
            .from("stores")
            .select("owner_id")
            .eq("id", tourney.store_id)
            .single();

        return store && store.owner_id === user.id ? user : null;
    }

    return null;
}

// --- HELPER: Check Superadmin ---
async function isSuperAdmin(user: any) {
    if (!user) return false;
    // 1. Hardcoded Master Email
    if (user.primaryEmail === 'shearjovan7@gmail.com') return true;

    // 2. Check DB Role
    const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    return profile?.role === 'superadmin';
}

// --- HELPER: Verify PIN ---
// For casual tournaments (no store_id), PIN is not required
// For ranked tournaments (with store_id), PIN is required unless user is owner
async function verifyStorePin(tournamentId: string, providedPin: string) {
    // Fetch tournament to check if it's casual or ranked
    const { data: tourney } = await supabaseAdmin
        .from("tournaments")
        .select("store_id, organizer_id")
        .eq("id", tournamentId)
        .single();

    if (!tourney) return false;

    // Casual tournament (no store): No PIN required, rely on owner check in calling function
    if (!tourney.store_id) return true;

    // Ranked tournament (has store): Verify PIN
    if (!providedPin) return false;

    // Master Override
    if (process.env.ADMIN_PIN && providedPin === process.env.ADMIN_PIN) return true;

    const { data: store } = await supabaseAdmin
        .from("stores")
        .select("pin")
        .eq("id", tourney.store_id)
        .single();

    return store?.pin === providedPin;
}

export async function getTournamentDataAction(tournamentId: string) {
    if (!tournamentId) return { success: false, error: "No ID provided" };

    try {
        const results = await Promise.all([
            supabaseAdmin.from("tournaments").select("id, created_at, store_id, organizer_id, name, status, cut_size, slug, judge_code, match_target_points, swiss_rounds, stores(name, primary_color, secondary_color, plan)").eq("id", tournamentId).single(),
            supabaseAdmin.from("matches").select("id, created_at, tournament_id, stage, swiss_round_id, swiss_round_number, bracket_round, match_number, participant_a_id, participant_b_id, score_a, score_b, winner_id, status, is_bye, target_points").eq("tournament_id", tournamentId).order("match_number", { ascending: true }),
            supabaseAdmin.from("participants").select("id, created_at, tournament_id, user_id, display_name, dropped, checked_in").eq("tournament_id", tournamentId),
            supabaseAdmin.from("tournament_judges").select("user_id, created_at").eq("tournament_id", tournamentId)
        ]);
        const args = results; // Alias for minimal change to getRes or just use results directly

        if (results[0].error) throw results[0].error;
        if (results[1].error) throw results[1].error;
        if (results[2].error) throw results[2].error;
        // jRes error might be ignored if we want to be robust, but strict is fine.

        return {
            success: true,
            tournament: results[0].data,
            matches: results[0].data ? results[1].data || [] : [], // Only return matches if tournament found
            participants: results[2].data || [],
            judges: (results[3].data) || [] // Safe access if promise array logic differs
        };

        function getRes(idx: number) { return args[idx] || { data: [], error: null } }
        // Actually, let's fix the destructuring above

    } catch (e: unknown) {
        console.error("Fetch Error:", e);
        const msg = e instanceof Error ? e.message : "Unknown Error";
        return { success: false, error: msg };
    }
}

export async function addParticipantAction(formData: FormData) {
    const name = formData.get("name") as string;
    const tournamentId = formData.get("tournament_id") as string;

    if (!name || !tournamentId) return { success: false, error: "Name and Tournament ID required" };

    // 1. Check Tournament Status FIRST (to enforce PIN before DB writes)
    const { data: tourney } = await supabase
        .from("tournaments")
        .select("status")
        .eq("id", tournamentId)
        .single();

    // Context: Who is adding?
    const ownerUser = await verifyTournamentOwner(tournamentId);

    if (tourney?.status === "started") {
        // Late Entry: strictly Requires Admin PIN or Owner
        if (!ownerUser) {
            const providedPin = formData.get("admin_pin") as string;
            if (!await verifyStorePin(tournamentId, providedPin)) {
                return { success: false, error: "Late entry requires Valid Store PIN or Owner permission." };
            }
        }
    } else {
        // Draft/Pending:
        // If we want to allow PUBLIC registration, we can leave it open.
        // But if we want to restrict to owner?
        // Current requirement: "Anyone can spam".
        // FIX: If it's a "Local" tournament app, usually valid. 
        // But to be safe, let's require Owner OR a "registration_open" flag (not yet implemented).
        // For now, we'll allow public add in Draft, but secure Delete.
    }

    // 2. Check limits based on Tournament Type & Plan
    const { data: tourneyData } = await supabaseAdmin
        .from("tournaments")
        .select("store_id, is_ranked")
        .eq("id", tournamentId)
        .single();

    let maxPlayers = 32; // Default limit for Casual

    if (tourneyData?.is_ranked) {
        // Ranked Tournament Logic
        let plan = 'free';
        if (tourneyData.store_id) {
            const { data: store } = await supabaseAdmin
                .from("stores")
                .select("plan, subscription_tier")
                .eq("id", tourneyData.store_id)
                .single();

            plan = (store?.plan === 'pro' || (store as any)?.subscription_tier === 'pro') ? 'pro' : 'free';
        }

        maxPlayers = plan === 'pro' ? 999 : 64;
    }

    const isSuper = await isSuperAdmin(ownerUser);
    if (isSuper) maxPlayers = 999;

    // Safety check just in case
    if (!maxPlayers) maxPlayers = 32;

    // Count existing participants
    const { count: currentCount } = await supabaseAdmin
        .from("participants")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", tournamentId)
        .eq("dropped", false);

    if ((currentCount || 0) >= maxPlayers) {
        return {
            success: false,
            error: `Player limit reached (${maxPlayers}). Upgrade to Pro for unlimited players.`,
            upgradeRequired: true
        };
    }

    // 2. Insert Participant
    let userId = formData.get("user_id"); // Optional User Link

    // Auto-Link: If no userId provided, check if 'name' matches a registered username
    if (!userId) {
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .ilike("username", name) // Case-insensitive match
            .single();

        if (profile) userId = profile.id;
    }


    const { data: newPart, error } = await supabaseAdmin
        .from("participants")
        .insert({
            display_name: name,
            tournament_id: tournamentId,
            user_id: userId || null,
            checked_in: true // Manual walk-ins are auto checked-in
        })
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
            // CHECK 1: Pending Bye (Unlikely with new logic, but good safety)
            const { data: pendingBye } = await supabase
                .from("matches")
                .select("id")
                .eq("tournament_id", tournamentId)
                .eq("swiss_round_number", 1)
                .is("participant_b_id", null)
                .eq("status", "pending")
                .single();

            // CHECK 2: Completed Bye (The "Instant Penalty" match we want to resurrect)
            const { data: completedBye } = await supabase
                .from("matches")
                .select("id")
                .eq("tournament_id", tournamentId)
                .eq("swiss_round_number", 1)
                .is("participant_b_id", null)
                .eq("status", "complete")
                .eq("is_bye", true)
                .single();

            const targetMatch = pendingBye || completedBye;

            if (targetMatch) {
                // Determine target points (default 4)
                const result = await supabaseAdmin
                    .from("matches")
                    .update({
                        participant_b_id: newPart.id,
                        status: 'pending',     // RESURRECT to Pending
                        score_a: 0,            // Reset Score
                        score_b: 0,            // Reset Score
                        winner_id: null,       // Clear Winner
                        is_bye: false          // No longer a bye match
                    })
                    .eq("id", targetMatch.id);

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

                const err = await supabaseAdmin
                    .from("matches")
                    .insert({
                        tournament_id: tournamentId,
                        stage: 'swiss',
                        swiss_round_id: roundData.id,
                        swiss_round_number: 1,
                        match_number: (matchCount || 0) + 1,
                        participant_a_id: newPart.id,
                        participant_b_id: null, // BYE

                        // New Bye Match -> INSTANT LOSS (3-4)
                        // But kept available for "Resurrection" if another player joins
                        status: 'complete',
                        score_a: 3,
                        score_b: 4,
                        winner_id: null,
                        is_bye: true,

                        target_points: 4
                    });

                if (err.error) return { success: false, error: "Error creating match: " + err.error.message };
            }
        }
    }

    revalidatePath(`/t/${tournamentId}/admin`);
    revalidatePath(`/t/${tournamentId}/bracket`);

    // Award Badge: First Strike
    if (userId) {
        await awardBadge(userId as string, "First Strike", tournamentId);
    }

    return { success: true };
}

export async function deleteParticipantAction(formData: FormData) {
    const participantId = formData.get("participant_id") as string;
    const tournamentId = formData.get("tournament_id") as string;

    if (!participantId) return { success: false, error: "Participant ID required" };

    // SECURE: Only Owner can delete
    const isOwner = await verifyTournamentOwner(tournamentId);
    const user = await stackServerApp.getUser();
    const superAdmin = await isSuperAdmin(user);

    if (!isOwner && !superAdmin) return { success: false, error: "Unauthorized: Only tournament owner can delete participants." };

    const { error } = await supabaseAdmin
        .from("participants")
        .delete()
        .eq("id", participantId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/t/${tournamentId}/admin`);
    return { success: true };
}

export async function updateParticipantAction(formData: FormData) {
    const participantId = formData.get("participant_id") as string;
    const tournamentId = formData.get("tournament_id") as string;
    const name = formData.get("name") as string;

    if (!participantId || !name) return { success: false, error: "ID and Name required" };

    // SECURE: Only Owner can update
    const isOwner = await verifyTournamentOwner(tournamentId);
    const user = await stackServerApp.getUser();
    const superAdmin = await isSuperAdmin(user);

    if (!isOwner && !superAdmin) return { success: false, error: "Unauthorized" };

    // Block updates for pre-registered users (linked to an account)
    const { data: part } = await supabaseAdmin.from("participants").select("user_id").eq("id", participantId).single();
    if (part?.user_id) return { success: false, error: "Pre-registered player names are locked to their accounts." };

    const { error } = await supabaseAdmin
        .from("participants")
        .update({ display_name: name })
        .eq("id", participantId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/t/${tournamentId}/admin`);
    return { success: true };
}

export async function toggleRegistrationAction(formData: FormData) {
    const tournamentId = formData.get("tournament_id") as string;
    const isOpen = formData.get("is_open") === "true"; // current state

    // If currently open (draft), we are locking (pending).
    // If currently locked (pending), we are opening (draft).
    const newStatus = isOpen ? "pending" : "draft";

    const { error } = await supabaseAdmin
        .from("tournaments")
        .update({ status: newStatus })
        .eq("id", tournamentId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/t/${tournamentId}/admin`);
    return { success: true };
}

export async function startTournamentAction(formData: FormData) {
    const tournamentId = formData.get("tournament_id") as string;
    const cutSize = Number(formData.get("cut_size"));

    if (!tournamentId || !cutSize) return { success: false, error: "Missing ID or Cut Size" };

    try {
        // 1. Remove unchecked-in participants (Per user request)
        // We delete anyone who is NOT checked_in.
        // NOTE: If 'checked_in' is null, we treat as false.
        const { error: delError } = await supabaseAdmin
            .from("participants")
            .delete()
            .eq("tournament_id", tournamentId)
            .eq("checked_in", false);

        if (delError) {
            console.error("Error cleaning up unchecked players:", delError);
            // Proceed? Or fail? Let's fail to be safe.
            return { success: false, error: "Failed to remove unchecked players: " + delError.message };
        }

        // 2. Update tournament settings & status
        const { error } = await supabaseAdmin
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
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown Error";
        return { success: false, error: msg };
    }
}

export async function createTournamentAction(formData: FormData) {
    const user = await stackServerApp.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // 1. Get Store ID (if any)
    const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .single();

    // Determine Status
    const isStoreOwner = !!store;
    const isRanked = isStoreOwner; // Only store owners creating tournaments are ranked by default

    const name = formData.get("name") as string;
    const location = formData.get("location") as string;
    const startTimeRaw = formData.get("start_time") as string;

    // Ensure startTime is an ISO string if present
    const startTime = startTimeRaw ? new Date(startTimeRaw).toISOString() : null;

    const cutSize = Number(formData.get("cut_size"));

    if (!name) return { success: false, error: "Name required" };
    if (!location) return { success: false, error: "Location required" };
    if (!startTime) return { success: false, error: "Start Time required" };

    // Auto-Generate Slug: name-date (e.g. week-1-local-2024-12-25)
    // 1. Format Date YYYY-MM-DD
    const dateObj = new Date(startTime);
    const dateStr = dateObj.toISOString().split('T')[0];

    // 2. Format Name
    const nameSlug = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');

    // 3. Combine
    const slug = `${nameSlug}-${dateStr}`;

    const { data, error } = await supabaseAdmin
        .from("tournaments")
        .insert({
            name,
            location,
            start_time: startTime,
            cut_size: cutSize || 16,
            status: "draft",
            slug,
            store_id: store?.id || null, // Optional now
            organizer_id: user.id, // Track creator
            is_ranked: isRanked
        })
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

export async function seedTournamentAction(tournamentId: string, count = 64) {
    if (!tournamentId) return { success: false, error: "Tournament ID required" };

    // 1. Verify Draft Mode
    const { data: tourney } = await supabase.from("tournaments").select("status").eq("id", tournamentId).single();
    if (tourney?.status !== "draft") return { success: false, error: "Can only seed in Draft mode." };

    // 2. Generate Players using Realistic Names
    const firstNames = ["Kai", "Tyson", "Ray", "Max", "Kyoya", "Gingka", "Ryuga", "Rago", "Valt", "Shu", "Free", "Lui", "Dante", "Hikaru", "Hyuga", "Bel", "Phenomeno", "Ekusu", "Bird", "Multi", "Queen", "King", "Jack", "Zeo", "Toby", "Masamune", "Nile", "Damian", "Faust"];
    const lastNames = ["Hiwatari", "Granger", "Kon", "Mizuhara", "Tategami", "Hagane", "Kishatu", "Aoi", "Kurenai", "De La Hoya", "Shirosagi", "Koryu", "Hizashi", "Daikokuten", "Payne", "Kurosu", "Kazami", "Nanairo", "Manzon", "Star", "Atlas", "Abyss", "Dread", "Slayer", "Breaker"];

    const players = [];
    for (let i = 1; i <= count; i++) {
        const f = firstNames[Math.floor(Math.random() * firstNames.length)];
        const l = lastNames[Math.floor(Math.random() * lastNames.length)];
        const suffix = Math.floor(Math.random() * 999);

        // Ensure somewhat unique display names
        players.push({
            tournament_id: tournamentId,
            display_name: `${f} ${l} ${suffix}`
        });
    }

    // 3. Bulk Insert using ADMIN client to bypass RLS
    const { error } = await supabaseAdmin.from("participants").insert(players);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/t/${tournamentId}/admin`);
    return { success: true };
}

export async function proceedToTopCutAction(tournamentId: string) {
    if (!tournamentId) return { success: false, error: "Missing Tournament ID" };

    try {
        await generateTopCut(tournamentId, 0); // Pass 0 to let function fetch cut_size from DB
        revalidatePath(`/t/${tournamentId}/admin`);
        revalidatePath(`/t/${tournamentId}/bracket`);
        return { success: true };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown Error";
        return { success: false, error: msg };
    }
}

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

            // 0. (Removed) Auto-Resolve Deferred Byes
            // We now handle this by creating them as Complete immediately.

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

            if (!m.participant_b_id) {
                // Deferred Bye found during auto-score -> Force Loss
                scoreA = 3;
                scoreB = 4;
                winnerId = null;
            } else {
                // Normal Match
                scoreA = winA ? 4 : Math.floor(Math.random() * 3);
                scoreB = winA ? Math.floor(Math.random() * 3) : 4;
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
                points_awarded: 4 // Just a dummy value
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

// --- HELPER: Perform Tournament Conclusion ---
async function performTournamentConclusion(tournamentId: string) {
    const { error } = await supabaseAdmin
        .from("tournaments")
        .update({ status: "completed" })
        .eq("id", tournamentId);

    if (error) throw error;

    revalidatePath(`/t/${tournamentId}/admin`);
    revalidatePath(`/`);

    // Trigger Tournament Conclusion Badges
    await checkTournamentBadges(tournamentId);

    // Update Points for all participants in this tournament (to apply Top Cut / Win bonuses)
    const { data: participants } = await supabaseAdmin
        .from("participants")
        .select("user_id")
        .eq("tournament_id", tournamentId)
        .not("user_id", "is", null);

    if (participants) {
        for (const p of participants) {
            if (p.user_id) await updatePlayerPoints(p.user_id);
        }
    }

    // Award Badge: The Architect (Host a tournament)
    const { data: tourney } = await supabaseAdmin.from("tournaments").select("organizer_id").eq("id", tournamentId).single();
    if (tourney?.organizer_id) {
        await awardBadge(tourney.organizer_id, "The Architect", tournamentId);
    }
}

export async function endTournamentAction(formData: FormData) {
    const tournamentId = formData.get("tournament_id") as string;

    if (!tournamentId) return { success: false, error: "Tournament ID required" };

    const user = await stackServerApp.getUser();
    const superAdmin = await isSuperAdmin(user);

    // Super admins bypass all checks
    if (!superAdmin) {
        // Verify ownership first (strict access control)
        const ownerUser = await verifyTournamentOwner(tournamentId);
        if (!ownerUser) {
            return { success: false, error: "Unauthorized: Only the tournament host can conclude the tournament." };
        }

        // For ranked tournaments, also verify PIN
        const providedPin = formData.get("admin_pin") as string;
        if (!await verifyStorePin(tournamentId, providedPin)) {
            return { success: false, error: "Invalid Store PIN" };
        }
    }

    try {
        await performTournamentConclusion(tournamentId);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function addJudgeAction(formData: FormData) {
    const user = await stackServerApp.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const tournamentId = formData.get("tournament_id") as string;
    const code = formData.get("code") as string;

    if (!tournamentId || !code) return { success: false, error: "Missing information" };

    // 1. Verify Code
    const { data: tourney } = await supabaseAdmin
        .from("tournaments")
        .select("judge_code, id")
        .eq("id", tournamentId)
        .single();

    if (!tourney || !tourney.judge_code) return { success: false, error: "Invalid Tournament or no code set." };
    if (tourney.judge_code !== code) return { success: false, error: "Invalid Judge Code" };

    // 2. Add as Judge
    const { error } = await supabaseAdmin
        .from("tournament_judges")
        .insert({
            tournament_id: tournamentId,
            user_id: user.id
        });

    if (error) {
        if (error.code === '23505') return { success: true, message: "Already a judge." };
        return { success: false, error: error.message };
    }

    revalidatePath(`/t/${tournamentId}`);
    return { success: true };
}

export async function dropParticipantAction(formData: FormData) {
    const user = await stackServerApp.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const tournamentId = formData.get("tournament_id") as string;
    const participantId = formData.get("participant_id") as string;

    if (!tournamentId || !participantId) return { success: false, error: "Missing info" };

    // Verify Owner
    const isOwner = await verifyTournamentOwner(tournamentId);
    if (!isOwner) return { success: false, error: "Unauthorized" };

    // 1. Check for Active Match to Auto-Forfeit
    const { data: activeMatches, error: matchError } = await supabaseAdmin
        .from("matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("stage", "swiss")
        .eq("status", "pending")
        .or(`participant_a_id.eq.${participantId},participant_b_id.eq.${participantId}`);

    if (matchError) console.error("Error finding active match:", matchError);

    if (activeMatches && activeMatches.length > 0) {
        for (const match of activeMatches) {
            const isA = match.participant_a_id === participantId;
            const opponentId = isA ? match.participant_b_id : match.participant_a_id;
            const target = match.target_points || 4;

            // If opponent exists, they get a win (BYE style 4-3 or full win?)
            // User requested "4-3(BYE)". Logic suggests: Winner gets target, Loser gets target-1, marked as BYE.
            const updates = {
                status: 'complete',
                winner_id: opponentId || participantId, // If BYE match, dropping player wins? No, if BYE match, they already have a bye.
                // Wait, if I am playing a BYE, and I drop, does it matter? I guess I forfeit the bye?
                // Let's assume standard opponent scenario.
                score_a: isA ? target - 1 : target,
                score_b: isA ? target : target - 1
            };

            if (!opponentId) {
                // Pending BYE match... unlikely to be pending if it's a bye?
                // Usually byes are auto-completed. But if manual, just complete it.
                updates.winner_id = participantId;
                updates.score_a = 4;
            }

            await supabaseAdmin.from("matches").update(updates).eq("id", match.id);
        }
    }

    const { error } = await supabaseAdmin
        .from("participants")
        .update({ dropped: true })
        .eq("id", participantId)
        .eq("tournament_id", tournamentId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/t/${tournamentId}`);
    return { success: true };
}

export async function removeJudgeAction(formData: FormData) {
    const user = await stackServerApp.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const tournamentId = formData.get("tournament_id");
    const userIdToRemove = formData.get("user_id");

    if (!tournamentId || !userIdToRemove) return { success: false, error: "Missing ID" };

    // 1. Verify Ownership
    // Fetch tournament to get store_id
    const { data: tourney, error: fetchError } = await supabaseAdmin
        .from("tournaments")
        .select("store_id")
        .eq("id", tournamentId)
        .single();

    if (fetchError) return { success: false, error: "DB Error: " + fetchError.message };
    if (!tourney) return { success: false, error: "Tournament not found" };

    // Fetch store to get owner_id
    const { data: store, error: storeError } = await supabaseAdmin
        .from("stores")
        .select("owner_id")
        .eq("id", tourney.store_id)
        .single();

    if (storeError) return { success: false, error: "DB Error (Store): " + storeError.message };

    if (store.owner_id !== user.id) {
        return { success: false, error: "Unauthorized: Only the owner can remove judges." };
    }

    // 2. Remove
    const { error } = await supabaseAdmin
        .from("tournament_judges")
        .delete()
        .eq("tournament_id", tournamentId)
        .eq("user_id", userIdToRemove);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/t/${tournamentId}/admin`);
    return { success: true };
}

export async function updateTournamentAction(formData: FormData) {
    const user = await stackServerApp.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const tournamentId = formData.get("tournament_id");
    const name = formData.get("name");
    const judgeCode = formData.get("judge_code");
    const status = formData.get("status"); // Optional status update

    if (!tournamentId) return { success: false, error: "Tournament ID required" };

    // 1. Verify Ownership
    // Fetch tournament to get store_id and organizer_id
    const { data: tourney, error: fetchError } = await supabaseAdmin
        .from("tournaments")
        .select("store_id, organizer_id")
        .eq("id", tournamentId)
        .single();

    if (fetchError) return { success: false, error: "DB Error: " + fetchError.message };
    if (!tourney) return { success: false, error: "Tournament not found" };

    // Check ownership: either via store OR via organizer_id
    let isOwner = false;

    if (tourney.store_id) {
        // Store-based tournament: check store ownership
        const { data: store, error: storeError } = await supabaseAdmin
            .from("stores")
            .select("owner_id")
            .eq("id", tourney.store_id)
            .single();

        if (storeError) return { success: false, error: "DB Error (Store): " + storeError.message };
        isOwner = store.owner_id === user.id;
    } else if (tourney.organizer_id) {
        // Casual tournament: check organizer_id
        isOwner = tourney.organizer_id === user.id;
    }

    if (!isOwner && !await isSuperAdmin(user)) {
        return { success: false, error: `Unauthorized: You do not own this tournament.` };
    }

    // 2. Update
    const updates: Record<string, any> = {};
    if (name) updates.name = name;
    if (judgeCode !== undefined) updates.judge_code = judgeCode || null;
    if (status) updates.status = status;

    const { error } = await supabaseAdmin
        .from("tournaments")
        .update(updates)
        .eq("id", tournamentId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/t/${tournamentId}/admin`);
    revalidatePath(`/t/${tournamentId}`);
    return { success: true };
}

export async function deleteTournamentAction(tournamentId: string) {
    const user = await stackServerApp.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    if (!tournamentId) return { success: false, error: "Tournament ID required" };

    // 1. Verify Ownership
    // Fetch tournament to get store_id
    const { data: tourney, error: fetchError } = await supabaseAdmin
        .from("tournaments")
        .select("store_id")
        .eq("id", tournamentId)
        .single();

    if (fetchError) return { success: false, error: "DB Error: " + fetchError.message };
    if (!tourney) return { success: false, error: "Tournament not found" };

    // Fetch store to get owner_id
    const { data: store, error: storeError } = await supabaseAdmin
        .from("stores")
        .select("owner_id")
        .eq("id", tourney.store_id)
        .single();

    if (storeError) return { success: false, error: "DB Error (Store): " + storeError.message };

    if (store.owner_id !== user.id) {
        return { success: false, error: `Unauthorized: You do not own this tournament. (User: ${user.id}, Owner: ${store.owner_id})` };
    }

    // 2. Fetch participants to update points later
    const { data: participantsToUpdate } = await supabaseAdmin
        .from("participants")
        .select("user_id")
        .eq("tournament_id", tournamentId)
        .not("user_id", "is", null);

    // 3. Delete
    // Safety: Delete children first
    await supabaseAdmin.from("matches").delete().eq("tournament_id", tournamentId);
    await supabaseAdmin.from("participants").delete().eq("tournament_id", tournamentId);

    const { error } = await supabaseAdmin
        .from("tournaments")
        .delete()
        .eq("id", tournamentId);

    if (error) return { success: false, error: error.message };

    // 4. Recalculate Points for affected users
    if (participantsToUpdate && participantsToUpdate.length > 0) {
        const uniqueUserIds = [...new Set(participantsToUpdate.map(p => p.user_id).filter(Boolean))];
        console.log(`[DeleteTournament] Recalculating points for ${uniqueUserIds.length} users...`);

        // Parallel execution might be heavy if many users, but fine for typical scale
        await Promise.all(uniqueUserIds.map(uid => updatePlayerPoints(uid)));
    }

    revalidatePath("/dashboard");
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

export async function updateStoreAction(previousState: any, formData: FormData) {
    const user = await stackServerApp.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const storeId = formData.get("store_id") as string;
    if (!storeId) return { success: false, error: "Store ID required" };

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const address = formData.get("address") as string;
    const contact = formData.get("contact") as string;
    const imageUrl = formData.get("image_url") as string;
    const city = formData.get("city") as string;
    const country = formData.get("country") as string;
    const primaryColor = formData.get("primary_color") as string;
    const secondaryColor = formData.get("secondary_color") as string;

    // 1. Verify Ownership
    const { data: store } = await supabaseAdmin
        .from("stores")
        .select("owner_id, plan")
        .eq("id", storeId)
        .single();

    if (!store || store.owner_id !== user.id) {
        return { success: false, error: "Unauthorized: You do not own this store." };
    }

    // 2. Update
    const updates: any = {
        name,
        description,
        address,
        contact_number: contact,
        image_url: imageUrl
    };

    if (city) updates.city = city;
    if (country) updates.country = country;

    const lat = formData.get("latitude");
    const lng = formData.get("longitude");
    if (lat) updates.latitude = parseFloat(lat.toString());
    if (lng) updates.longitude = parseFloat(lng.toString());

    // Branding only for Pro stores
    if (store.plan === 'pro') {
        if (primaryColor !== undefined) updates.primary_color = primaryColor;
        if (secondaryColor !== undefined) updates.secondary_color = secondaryColor;
    }

    const { error } = await supabaseAdmin
        .from("stores")
        .update(updates)
        .eq("id", storeId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard");
    revalidatePath(`/`);
    return { success: true, message: "Store updated successfully." };
}

// --- PROFILE ACTIONS ---

export async function updateProfileAction(formData: FormData) {
    const user = await stackServerApp.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const username = formData.get("username") as string;
    const displayName = formData.get("display_name") as string;
    const bio = formData.get("bio") as string;
    const country = formData.get("country") as string;
    const city = formData.get("city") as string;
    const avatarUrl = formData.get("avatar_url") as string; // URL from client-side upload

    if (!username) return { success: false, error: "Username is required" };

    // Validate Username (Simple regex)
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return { success: false, error: "Username must be 3-20 characters, alphanumeric or underscore." };
    }

    // Check 30-day Limit if username is different
    const { data: currentProfile } = await supabaseAdmin
        .from("profiles")
        .select("username, username_updated_at, display_name, display_name_updated_at")
        .eq("id", user.id)
        .single();

    // LOCKED USERNAME LOGIC:
    // If a username is ALREADY set in the DB, we do NOT allow changing it.
    // The user can only set it once.
    if (currentProfile?.username && currentProfile.username !== username) {
        return { success: false, error: "Username cannot be changed once set." };
    }

    if (currentProfile && currentProfile.username !== username) {
        if (currentProfile.username_updated_at) {
            // Keep existing 30-day logic just in case we ever revert, 
            // but the above block effectively disables updates.
            const lastUpdate = new Date(currentProfile.username_updated_at);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - lastUpdate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 30) {
                return { success: false, error: `You can update your username again in ${30 - diffDays} days.` };
            }
        }
        // Will set username_updated_at below
    }

    // Check 30-day Limit for Display Name
    if (currentProfile && currentProfile.display_name !== displayName) {
        if (currentProfile.display_name_updated_at) {
            const lastUpdate = new Date(currentProfile.display_name_updated_at);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - lastUpdate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 30) {
                return { success: false, error: `You can update your display name again in ${30 - diffDays} days.` };
            }
        }
    }

    // Upsert Profile
    const updates: any = {
        id: user.id,
        username: username,
        display_name: displayName || username,
        bio: bio,
        country: country || null,
        city: city || null,
        updated_at: new Date().toISOString()
    };

    if (avatarUrl) updates.avatar_url = avatarUrl;

    // Only update timestamp if username changed
    if (currentProfile && currentProfile.username !== username) {
        updates.username_updated_at = new Date().toISOString();
    }
    // Only update timestamp if display_name changed
    if (currentProfile && currentProfile.display_name !== displayName) {
        updates.display_name_updated_at = new Date().toISOString();
    }

    const { error } = await supabaseAdmin
        .from("profiles")
        .upsert(updates, { onConflict: 'id' }); // Conflict on ID means update

    if (error) {
        if (error.code === '23505') return { success: false, error: "Username already taken." };
        return { success: false, error: error.message };
    }

    revalidatePath(`/u/${username}`);

    // Award Badge: Vanguard (Complete Profile)
    await awardBadge(user.id, "Vanguard");

    return { success: true };
}

export async function claimParticipantHistoryAction() {
    const user = await stackServerApp.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // 1. Get current specific display name
    const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("display_name, username, history_synced")
        .eq("id", user.id)
        .single();

    if (!profile || !profile.display_name) return { success: false, error: "Profile not found or no display name set." };
    if (profile.history_synced) return { success: false, error: "You have already synced your past history." };

    const targetName = profile.display_name;

    // 2. Find and Link Guest Participants
    // "Guest" means user_id is NULL
    const { data: matches, error: fetchErr } = await supabaseAdmin
        .from("participants")
        .select("id")
        .is("user_id", null)
        .ilike("display_name", targetName); // Case insensitive match

    if (fetchErr) return { success: false, error: fetchErr.message };

    if (!matches || matches.length === 0) {
        return { success: true, count: 0, message: `No guest history found for "${targetName}".` };
    }

    // 3. Update them
    const idsToUpdate = matches.map(m => m.id);
    const { error: updateErr, count } = await supabaseAdmin
        .from("participants")
        .update({ user_id: user.id })
        .in("id", idsToUpdate)
        .select("id");

    if (updateErr) return { success: false, error: updateErr.message };

    // 4. Mark history as synced
    await supabaseAdmin
        .from("profiles")
        .update({ history_synced: true })
        .eq("id", user.id);

    revalidatePath(`/u/${profile.username || user.id}`);
    revalidatePath("/dashboard");

    return { success: true, count: count || matches.length, message: `Successfully linked ${count || matches.length} tournament entries!` };
}

export async function uploadAvatarAction(formData: FormData) {
    const user = await stackServerApp.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "No file provided" };

    if (file.size > 2 * 1024 * 1024) {
        return { success: false, error: "File too large (Max 2MB)" };
    }

    // --- AUTO-FIX: Ensure Bucket Exists & is Public ---
    try {
        const { data: bucket, error: bucketError } = await supabaseAdmin.storage.getBucket('avatars');

        if (bucketError && bucketError.message.includes("not found")) {
            console.log("Bucket 'avatars' not found. Creating...");
            await supabaseAdmin.storage.createBucket('avatars', { public: true });
        } else if (bucket && !bucket.public) {
            console.log("Bucket 'avatars' is private. Updating to public...");
            await supabaseAdmin.storage.updateBucket('avatars', { public: true });
        }
    } catch (err) {
        console.error("Bucket Check Error (Non-fatal):", err);
        // Continue anyway, maybe it works
    }
    // --------------------------------------------------

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
        .from('avatars')
        .upload(filePath, file, {
            contentType: file.type,
            upsert: true
        });

    if (uploadError) {
        console.error("Upload Error:", uploadError);
        return { success: false, error: "Upload failed: " + uploadError.message };
    }

    const { data } = supabaseAdmin.storage
        .from('avatars')
        .getPublicUrl(filePath);

    console.log("Avatar Upload Success. Path:", filePath, "Public URL:", data.publicUrl);

    return { success: true, url: data.publicUrl };
}


// --- STORE DISCOVERY ACTIONS ---

export async function getStoresAction(city?: string, page = 1, pageSize = 12) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
        .from("stores")
        .select("id, created_at, owner_id, name, slug, image_url, address, contact_number, city, country, primary_color, secondary_color, plan, latitude, longitude", { count: 'exact' })
        .order("plan", { ascending: false }) // Show Pro stores first
        .order("created_at", { ascending: false })
        .range(from, to);

    if (city && city !== "all") {
        query = query.ilike("city", `%${city}%`);
    }

    const { data, error, count } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data, count, page, pageSize };
}

export async function getLiveTournamentsAction(city?: string) {
    // 1. Base Query: Active Tournaments (pending, started) - Filter Out Drafts for Cleaner Feed
    let query = supabase
        .from("tournaments")
        .select(`
            *,
            stores!inner (
                name,
                city,
                image_url,
                primary_color,
                secondary_color,
                plan
            )
        `)
        .neq("status", "completed")
        .neq("status", "draft") // Premium Feed: No Drafts
        .order("created_at", { ascending: false });

    // 2. Apply City Filter on the joined Store table
    if (city && city !== "all") {
        query = query.ilike("stores.city", `%${city}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Live Feed Error:", error);
        return { success: false, error: error.message };
    }
    return { success: true, data: data || [] };
}





export async function autoConcludeFinishedTournaments() {
    const { data: startedTourneys } = await supabaseAdmin
        .from("tournaments")
        .select("id, name, created_at")
        .eq("status", "started");

    if (!startedTourneys || startedTourneys.length === 0) return;

    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
    const twelveHoursAgo = new Date(Date.now() - TWELVE_HOURS_MS).toISOString();

    for (const t of startedTourneys) {
        // Fetch matches to check status and last activity
        const { data: matches } = await supabaseAdmin
            .from("matches")
            .select("status, created_at")
            .eq("tournament_id", t.id);

        if (!matches || matches.length === 0) continue;

        // Condition 1: All matches must be complete
        const allComplete = matches.every(m => m.status === 'complete');
        if (!allComplete) continue;

        // Condition 2: Last match activity must be > 12 hours ago
        const latestMatchTime = matches.reduce((max, m) => m.created_at > max ? m.created_at : max, '');

        if (latestMatchTime && latestMatchTime < twelveHoursAgo) {
            console.log(`[Auto-Conclude] Automatically concluding "${t.name}" (${t.id}) after 12h inactivity.`);
            try {
                await performTournamentConclusion(t.id);
            } catch (err) {
                console.error(`[Auto-Conclude] Failed to conclude ${t.id}:`, err);
            }
        }
    }
}


export async function getTournamentsDirectoryAction(city?: string, page = 1, pageSize = 12) {
    // 0. Auto-cleanup old live tournaments
    try {
        await autoConcludeFinishedTournaments();
    } catch (e) {
        console.error("Auto-conclude error:", e);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // 1. Fetch Live Tournaments (No pagination, show all active)
    let liveQuery = supabase
        .from("tournaments")
        .select(`
            *,
            stores (
                name,
                city,
                image_url,
                plan
            ),
            organizer:organizer_id (
                display_name,
                avatar_url
            )
        `)
        .eq("status", "started")
        .order("start_time", { ascending: true });

    if (city && city !== "all") {
        liveQuery = liveQuery.ilike("location", `%${city}%`);
    }

    const { data: liveData, error: liveError } = await liveQuery;

    // 2. Fetch Upcoming Tournaments (Paginated)
    let upcomingQuery = supabase
        .from("tournaments")
        .select(`
            *,
            stores (
                name,
                city,
                image_url,
                plan
            ),
            organizer:organizer_id (
                display_name,
                avatar_url
            )
        `, { count: 'exact' })
        // Include both 'created' (Published) and 'draft' (user requested)
        .in("status", ["created", "draft"])
        .order("start_time", { ascending: true })
        .range(from, to);

    if (city && city !== "all") {
        upcomingQuery = upcomingQuery.ilike("location", `%${city}%`);
    }

    const { data: upcomingData, error: upcomingError, count } = await upcomingQuery;

    if (liveError) console.error("Live fetch error:", JSON.stringify(liveError, null, 2));
    if (upcomingError) return { success: false, error: upcomingError.message };

    return {
        success: true,
        liveData: liveData || [],
        upcomingData: upcomingData || [],
        count,
        page,
        pageSize
    };
}

// --- TOURNAMENT INVITE ACTIONS ---

export async function getTournamentInvitesAction(tournamentId: string) {
    if (!tournamentId) return { success: false, error: "Tournament ID required" };

    const isOwner = await verifyTournamentOwner(tournamentId);
    if (!isOwner) return { success: false, error: "Unauthorized" };

    const { data, error } = await supabaseAdmin
        .from("tournament_invites")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, invites: data };
}

export async function createInviteAction(formData: FormData) {
    const tournamentId = formData.get("tournament_id") as string;
    const identifier = formData.get("email") as string; // This is now 'identifier' (Email or Username)

    if (!tournamentId || !identifier) return { success: false, error: "Missing ID or Identifier" };

    const isOwner = await verifyTournamentOwner(tournamentId);
    if (!isOwner) return { success: false, error: "Unauthorized" };

    let targetEmail: string | null = null;

    // 1. Check if it's an email
    if (identifier.includes("@")) {
        // Look up in profiles first
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("email")
            .eq("email", identifier)
            .single();

        if (profile?.email) {
            targetEmail = profile.email;
        } else {
            // Fallback to Stack search
            const users = await stackServerApp.listUsers({ query: identifier });
            const foundUser = users.find(u => u.primaryEmail === identifier);
            if (foundUser?.primaryEmail) {
                targetEmail = foundUser.primaryEmail;
            }
        }
    } else {
        // 2. Treat as Username
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("email")
            .ilike("username", identifier)
            .single();

        if (profile?.email) {
            targetEmail = profile.email;
        }
    }

    if (!targetEmail) {
        return {
            success: false,
            error: "User not found. Ensure they have a profile or a registered email."
        };
    }

    // Check if invite already exists for this email
    const { data: existing } = await supabaseAdmin
        .from("tournament_invites")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("email", targetEmail)
        .single();

    if (existing) return { success: false, error: "Invite already exists for this user." };

    const { data, error } = await supabaseAdmin
        .from("tournament_invites")
        .insert({
            tournament_id: tournamentId,
            email: targetEmail,
            status: 'pending'
        })
        .select()
        .single();

    if (error) return { success: false, error: error.message };

    revalidatePath(`/t/${tournamentId}/admin`);
    return { success: true, invite: data };
}

export async function getUserInvitesAction() {
    const user = await stackServerApp.getUser();
    if (!user || !user.primaryEmail) return { success: false, invites: [] };

    const { data, error } = await supabaseAdmin
        .from("tournament_invites")
        .select(`
            *,
            tournaments (
                id,
                name,
                stores (
                    name,
                    city,
                    country
                )
            )
        `)
        .eq("email", user.primaryEmail)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, invites: data };
}

export async function deleteInviteAction(formData: FormData) {
    const inviteId = formData.get("invite_id") as string;
    const tournamentId = formData.get("tournament_id") as string;

    if (!inviteId || !tournamentId) return { success: false, error: "Missing ID" };

    const isOwner = await verifyTournamentOwner(tournamentId);
    if (!isOwner) return { success: false, error: "Unauthorized" };

    const { error } = await supabaseAdmin
        .from("tournament_invites")
        .delete()
        .eq("id", inviteId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/t/${tournamentId}/admin`);
    return { success: true };
}

export async function getInviteByTokenAction(token: string) {
    if (!token) return { success: false, error: "Token required" };

    const { data, error } = await supabaseAdmin
        .from("tournament_invites")
        .select(`
            *,
            tournaments (
                id,
                name,
                store_id,
                status,
                stores (
                    name,
                    city,
                    country
                )
            )
        `)
        .eq("token", token)
        .single();

    if (error || !data) return { success: false, error: "Invalid or expired invite." };
    return { success: true, invite: data };
}

export async function acceptInviteAction(token: string) {
    const user = await stackServerApp.getUser();
    if (!user) return { success: false, error: "Authentication required", notAuthenticated: true };

    // 1. Verify Invite
    const { data: invite, error: invErr } = await supabaseAdmin
        .from("tournament_invites")
        .select("*")
        .eq("token", token)
        .single();

    if (invErr || !invite) return { success: false, error: "Invalid invite." };
    if (invite.status !== 'pending') return { success: false, error: `Invite is already ${invite.status}.` };

    // 2. Check if already joined
    const { data: existingPart } = await supabaseAdmin
        .from("participants")
        .select("id")
        .eq("tournament_id", invite.tournament_id)
        .eq("user_id", user.id)
        .single();

    if (existingPart) {
        // Already joined, just update invite status to accepted if not already
        await supabaseAdmin.from("tournament_invites").update({ status: 'accepted' }).eq("id", invite.id);
        return { success: true, tournamentId: invite.tournament_id, alreadyJoined: true };
    }

    // 3. Register Participant
    // We need a display name. Prefer Profile > User Email > "Player"
    let displayName = user.displayName || user.primaryEmail?.split('@')[0] || "Player";

    // Fetch profile to be sure? Stack user object usually has what we need. 
    // If not, fetch profile from our DB (synced from Stack).
    const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

    if (profile?.username) displayName = profile.username;

    const { error: joinErr } = await supabaseAdmin
        .from("participants")
        .insert({
            tournament_id: invite.tournament_id,
            user_id: user.id,
            display_name: displayName,
            dropped: false
        });

    if (joinErr) return { success: false, error: "Failed to join: " + joinErr.message };

    // 4. Update Invite Status
    await supabaseAdmin
        .from("tournament_invites")
        .update({ status: 'accepted' })
        .eq("id", invite.id);

    revalidatePath(`/t/${invite.tournament_id}`);
    return { success: true, tournamentId: invite.tournament_id };
}

export async function toggleCheckInAction(formData: FormData) {
    const participantId = formData.get("participant_id") as string;
    const tournamentId = formData.get("tournament_id") as string;
    const status = formData.get("status") === "true";

    if (!participantId || !tournamentId) return { success: false, error: "Missing ID" };

    const isOwner = await verifyTournamentOwner(tournamentId);
    if (!isOwner) return { success: false, error: "Unauthorized" };

    const { error } = await supabaseAdmin
        .from("participants")
        .update({ checked_in: status })
        .eq("id", participantId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/t/${tournamentId}/admin`);
    return { success: true };
}

export async function getAllStoreCoordinatesAction(): Promise<ActionResult<Store[]>> {
    // Uses global supabase instance from top of file
    const { data, error } = await supabase
        .from("stores")
        .select("id, name, slug, address, latitude, longitude, contact_number, plan, primary_color")
        .not("latitude", "is", null)
        .not("longitude", "is", null);

    if (error) {
        console.error("Error fetching store coordinates:", error);
        return { success: false, error: "Failed to fetch map data" };
    }

    return { success: true, data: data as Store[] };
}

// --- STORE APPLICATION ACTIONS ---

export async function submitStoreApplicationAction(prevState: any, formData: FormData) {
    const user = await stackServerApp.getUser();
    if (!user) return { success: false, error: "Must be logged in" };

    const email = formData.get("email") as string;
    const storeName = formData.get("store_name") as string;
    const slug = formData.get("slug") as string;
    const contact = formData.get("contact") as string;
    const address = formData.get("address") as string;

    if (!email || !storeName || !contact || !address) {
        return { success: false, error: "Missing required fields" };
    }

    try {
        const { error } = await supabaseAdmin
            .from("store_applications")
            .insert({
                user_id: user.id,
                email,
                store_name: storeName,
                slug: slug || null,
                contact_number: contact,
                address
            });

        if (error) throw error;

        return { success: true };
    } catch (e: any) {
        console.error("Submit Application Error:", e);
        return { success: false, error: e.message };
    }
}

export async function getPendingApplicationsAction() {
    const user = await stackServerApp.getUser();
    if (!await isSuperAdmin(user)) return { success: false, error: "Unauthorized" };

    const { data, error } = await supabaseAdmin
        .from("store_applications")
        .select("*, profiles!user_id(username, avatar_url)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Get Pending Apps Error:", error);
        return { success: false, error: error.message };
    }

    return { success: true, applications: data };
}

export async function approveStoreApplicationAction(applicationId: string) {
    const user = await stackServerApp.getUser();
    if (!await isSuperAdmin(user)) return { success: false, error: "Unauthorized" };

    try {
        // 1. Fetch Application
        const { data: app, error: appError } = await supabaseAdmin
            .from("store_applications")
            .select("*")
            .eq("id", applicationId)
            .single();

        if (appError || !app) throw new Error("Application not found");

        // 2. Create Store
        // Generate a slug if none provided
        let finalSlug = app.slug;
        if (!finalSlug) {
            finalSlug = app.store_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }

        const { error: storeError } = await supabaseAdmin
            .from("stores")
            .insert({
                owner_id: app.user_id,
                name: app.store_name,
                slug: finalSlug,
                contact_number: app.contact_number,
                address: app.address,
                city: "Unknown", // Default, user can edit later
                country: "Unknown",
                plan: "free"
            });

        if (storeError) throw storeError;

        // 3. Update Status
        await supabaseAdmin
            .from("store_applications")
            .update({ status: 'approved' })
            .eq("id", applicationId);

        revalidatePath("/admin");
        return { success: true };
    } catch (e: any) {
        console.error("Approve Application Error:", e);
        return { success: false, error: e.message };
    }
}

export async function rejectStoreApplicationAction(applicationId: string) {
    const user = await stackServerApp.getUser();
    if (!await isSuperAdmin(user)) return { success: false, error: "Unauthorized" };

    try {
        const { error } = await supabaseAdmin
            .from("store_applications")
            .update({ status: 'rejected' })
            .eq("id", applicationId);

        if (error) throw error;

        revalidatePath("/admin");
        return { success: true };
    } catch (e: any) {
        console.error("Reject Application Error:", e);
        return { success: false, error: e.message };
    }
}

// --- NOTIFICATION ACTIONS ---

export async function getNotificationsAction() {
    const user = await stackServerApp.getUser();
    if (!user || !user.primaryEmail) return { success: false, items: [] };

    const items: any[] = [];

    // 1. Fetch Tournament Invites
    const { data: invites } = await supabaseAdmin
        .from("tournament_invites")
        .select(`
            *,
            tournaments (
                id,
                name,
                stores (
                    name
                )
            )
        `)
        .eq("email", user.primaryEmail)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    if (invites) {
        invites.forEach(inv => {
            items.push({
                type: 'invite',
                id: inv.id,
                created_at: inv.created_at,
                data: inv
            });
        });
    }

    // 2. Fetch Admin Tasks (Store Applications)
    if (await isSuperAdmin(user)) {
        const { data: apps } = await supabaseAdmin
            .from("store_applications")
            .select("*, profiles!user_id(username)")
            .eq("status", "pending")
            .order("created_at", { ascending: false });

        if (apps) {
            apps.forEach(app => {
                items.push({
                    type: 'store_application',
                    id: app.id,
                    created_at: app.created_at,
                    data: app
                });
            });
        }
    }

    // Sort by newest first
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { success: true, items };
}

// --- STORE LEAGUE ACTIONS ---

interface LeaguePlayer {
    userId: string;
    displayName: string;
    champ: number;
    ru: number;
    top4: number;
    top8: number;
    participation: number; // 1pt per tournament
    total: number;
}

export async function getStoreLeagueAction(year: number) {
    const user = await stackServerApp.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // 1. Get User's Store (and verify Pro)
    const { data: store, error: storeError } = await supabaseAdmin
        .from("stores")
        .select("id, plan, owner_id")
        .eq("owner_id", user.id)
        .single();

    if (storeError || !store) return { success: false, error: "Store not found" };
    if (store.plan !== "pro") return { success: false, error: "This feature is for Pro stores only" };

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // 2. Fetch Completed Tournaments
    const { data: tournaments } = await supabaseAdmin
        .from("tournaments")
        .select("id, name, start_time, cut_size, status")
        .eq("store_id", store.id)
        .eq("status", "completed")
        .gte("start_time", startDate)
        .lte("start_time", endDate);

    if (!tournaments || tournaments.length === 0) {
        return { success: true, data: [] };
    }

    const tournamentIds = tournaments.map(t => t.id);

    // 3. Fetch Data (Participants & Matches)
    const [participantsRes, matchesRes] = await Promise.all([
        supabaseAdmin
            .from("participants")
            .select("id, user_id, display_name, tournament_id")
            .in("tournament_id", tournamentIds),
        supabaseAdmin
            .from("matches")
            .select("tournament_id, stage, bracket_round, winner_id, participant_a_id, participant_b_id")
            .in("tournament_id", tournamentIds)
            .eq("stage", "top_cut")
            .eq("status", "complete") // Only count completed matches
    ]);

    const participants = participantsRes.data || [];
    const matches = matchesRes.data || [];

    // 4. Aggregate
    const playerMap = new Map<string, LeaguePlayer>();

    const getPlayer = (id: string, name: string) => {
        if (!playerMap.has(id)) {
            playerMap.set(id, {
                userId: id,
                displayName: name,
                champ: 0,
                ru: 0,
                top4: 0,
                top8: 0,
                participation: 0,
                total: 0
            });
        }
        return playerMap.get(id)!;
    };

    // A. Participation Points
    participants.forEach(p => {
        const key = p.user_id || p.display_name;
        // Ensure name is consistent (use latest)
        const player = getPlayer(key, p.display_name);
        player.participation += 1;
        player.total += 1;
    });

    // B. Placement Points (Top Cut)
    const tourneyMatches = new Map<string, typeof matches>();
    matches.forEach(m => {
        if (!tourneyMatches.has(m.tournament_id)) tourneyMatches.set(m.tournament_id, []);
        tourneyMatches.get(m.tournament_id)!.push(m);
    });

    tournaments.forEach(t => {
        const tMatches = tourneyMatches.get(t.id);
        const tParticipants = participants.filter(p => p.tournament_id === t.id);

        if (tMatches && tMatches.length > 0) {
            const maxRound = Math.max(...tMatches.map(m => Number(m.bracket_round)));
            const finalMatch = tMatches.find(m => Number(m.bracket_round) === maxRound);

            if (finalMatch && finalMatch.winner_id) {
                const getPKey = (pid: string | null) => {
                    const p = tParticipants.find(part => part.id === pid);
                    if (!p) return null;
                    return p.user_id || p.display_name;
                };

                const champKey = getPKey(finalMatch.winner_id);
                const ruPid = finalMatch.participant_a_id === finalMatch.winner_id ? finalMatch.participant_b_id : finalMatch.participant_a_id;
                const ruKey = getPKey(ruPid);

                if (champKey) {
                    const pl = playerMap.get(champKey);
                    if (pl) { pl.champ++; pl.total += 4; }
                }
                if (ruKey) {
                    const pl = playerMap.get(ruKey);
                    if (pl) { pl.ru++; pl.total += 3; }
                }

                if (maxRound > 1) {
                    const semis = tMatches.filter(m => Number(m.bracket_round) === maxRound - 1);
                    semis.forEach(m => {
                        const loserPid = m.winner_id === m.participant_a_id ? m.participant_b_id : m.participant_a_id;
                        const loserKey = getPKey(loserPid);
                        if (loserKey) {
                            const pl = playerMap.get(loserKey);
                            if (pl) { pl.top4++; pl.total += 2; }
                        }
                    });
                }

                if (maxRound > 2) {
                    const quarters = tMatches.filter(m => Number(m.bracket_round) === maxRound - 2);
                    quarters.forEach(m => {
                        const loserPid = m.winner_id === m.participant_a_id ? m.participant_b_id : m.participant_a_id;
                        const loserKey = getPKey(loserPid);
                        if (loserKey) {
                            const pl = playerMap.get(loserKey);
                            if (pl) { pl.top8++; pl.total += 1; }
                        }
                    });
                }
            }
        }
    });

    return { success: true, data: Array.from(playerMap.values()).sort((a, b) => b.total - a.total) };
}

