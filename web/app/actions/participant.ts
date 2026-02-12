"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from "next/cache";
import { stackServerApp } from "@/lib/stack";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { awardBadge } from "@/lib/badges";
import { verifyTournamentOwner, verifyStorePin, isSuperAdmin } from "./utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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
    let deckId = formData.get("deck_id"); // Optional Deck Link

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
            deck_id: deckId || null,
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
            const { data: byeMatch } = await supabase
                .from("matches")
                .select("id")
                .eq("tournament_id", tournamentId)
                .eq("swiss_round_number", 1)
                .is("participant_b_id", null)
                .single();

            if (byeMatch) {
                // Determine target points (default 4)
                const result = await supabaseAdmin
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
            const updates: any = {
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

export async function bulkAddParticipantsAction(formData: FormData) {
    const tournamentId = formData.get("tournament_id") as string;
    const bulkNames = formData.get("bulk_names") as string;

    if (!tournamentId || !bulkNames) return { success: false, error: "Missing information" };

    // 1. Verify Permissions & Status
    const isOwner = await verifyTournamentOwner(tournamentId);
    if (!isOwner) return { success: false, error: "Unauthorized" };

    const { data: tourney } = await supabaseAdmin.from("tournaments").select("status, store_id, is_ranked").eq("id", tournamentId).single();
    if (tourney?.status !== "draft") return { success: false, error: "Bulk Add is only available in Draft mode for now." };

    // 2. Parse Names
    const names = bulkNames.split(/\r?\n/).map(n => n.trim()).filter(n => n.length > 0);
    if (names.length === 0) return { success: false, error: "No valid names found." };

    // 3. Check Limits
    let maxPlayers = 32;
    if (tourney?.is_ranked) {
        let plan = 'free';
        if (tourney.store_id) {
            const { data: store } = await supabaseAdmin.from("stores").select("plan, subscription_tier").eq("id", tourney.store_id).single();
            plan = (store?.plan === 'pro' || (store as any)?.subscription_tier === 'pro') ? 'pro' : 'free';
        }
        maxPlayers = plan === 'pro' ? 999 : 64;
    }

    // Check current count
    const { count: currentCount } = await supabaseAdmin
        .from("participants")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", tournamentId)
        .eq("dropped", false);

    if ((currentCount || 0) + names.length > maxPlayers) {
        return {
            success: false,
            error: `Adding ${names.length} players would exceed the limit of ${maxPlayers} (Current: ${currentCount}). Upgrade to Pro for more.`
        };
    }

    // 4. Prepare Data
    // Get all profiles that match ANY of the names
    const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, username")
        .in("username", names);

    const profileMap = new Map();
    if (profiles) {
        profiles.forEach((p: any) => profileMap.set(p.username.toLowerCase(), p.id));
    }

    const participantsToInsert = names.map(name => ({
        tournament_id: tournamentId,
        display_name: name,
        user_id: profileMap.get(name.toLowerCase()) || null,
        checked_in: true
    }));

    const { error } = await supabaseAdmin.from("participants").insert(participantsToInsert);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/t/${tournamentId}/admin`);
    return { success: true, count: names.length };
}

export async function updateParticipantDeckAction(participantId: string, deckId: string) {
    if (!participantId || !deckId) return { success: false, error: "Missing required IDs" };

    const { error } = await supabaseAdmin
        .from("participants")
        .update({ deck_id: deckId })
        .eq("id", participantId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function validateBulkAddAction(tournamentId: string, names: string[]) {
    if (!names || names.length === 0) return { success: false, error: "No names provided" };

    try {
        // 1. Fetch profiles for these names
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("id, username, display_name")
            .in("username", names);

        if (profileError) throw profileError;

        const profileMap = new Map();
        if (profiles) {
            profiles.forEach((p: any) => profileMap.set(p.username.toLowerCase(), p));
        }

        // 2. Fetch decks for these users
        const userIds = profiles?.map(p => p.id) || [];
        let deckMap = new Map();

        if (userIds.length > 0) {
            const { data: decks, error: deckError } = await supabaseAdmin
                .from("decks")
                .select("id, name, user_id")
                .in("user_id", userIds);

            if (deckError) throw deckError;

            if (decks) {
                decks.forEach((d: any) => {
                    const existing = deckMap.get(d.user_id) || [];
                    deckMap.set(d.user_id, [...existing, d]);
                });
            }
        }

        // 3. Construct results
        const results = names.map(name => {
            const profile = profileMap.get(name.toLowerCase());
            return {
                name: name,
                userId: profile?.id || null,
                username: profile?.username || null,
                displayName: profile?.display_name || null,
                decks: profile ? (deckMap.get(profile.id) || []) : []
            };
        });

        return { success: true, results };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function bulkAddWithDecksAction(formData: FormData) {
    const tournamentId = formData.get("tournament_id") as string;
    const participantsJson = formData.get("participants") as string;

    if (!tournamentId || !participantsJson) return { success: false, error: "Missing required data" };

    try {
        const participantsData = JSON.parse(participantsJson);
        if (!Array.isArray(participantsData) || participantsData.length === 0) {
            return { success: false, error: "Invalid participants data" };
        }

        // 1. Limit Check
        const { data: tourney } = await supabaseAdmin.from("tournaments").select("store_id").eq("id", tournamentId).single();
        let maxPlayers = 64;

        if (tourney?.store_id) {
            const { data: store } = await supabaseAdmin.from("stores").select("plan, subscription_tier").eq("id", tourney.store_id).single();
            const plan = (store?.plan === 'pro' || (store as any)?.subscription_tier === 'pro') ? 'pro' : 'free';
            maxPlayers = plan === 'pro' ? 999 : 64;
        }

        const { count: currentCount } = await supabaseAdmin
            .from("participants")
            .select("*", { count: "exact", head: true })
            .eq("tournament_id", tournamentId)
            .eq("dropped", false);

        if ((currentCount || 0) + participantsData.length > maxPlayers) {
            return { success: false, error: `Limit exceeded. Max ${maxPlayers} players.` };
        }

        // 2. Insert
        const participantsToInsert = participantsData.map(p => ({
            tournament_id: tournamentId,
            display_name: p.name,
            user_id: p.userId || null,
            deck_id: p.deckId || null,
            checked_in: true
        }));

        const { error } = await supabaseAdmin.from("participants").insert(participantsToInsert);
        if (error) throw error;

        revalidatePath(`/t/${tournamentId}/admin`);
        return { success: true, count: participantsData.length };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
