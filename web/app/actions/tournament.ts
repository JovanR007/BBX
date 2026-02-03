"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateSwissRound } from "@/lib/swiss_round";
import { generateTopCut } from "@/lib/top_cut";
import { stackServerApp } from "@/lib/stack";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { awardBadge, checkTournamentBadges } from "@/lib/badges";
import { updatePlayerPoints } from "@/lib/ranking";
import { verifyTournamentOwner, verifyStorePin, isSuperAdmin } from "./utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function getTournamentDataAction(tournamentId: string) {
    if (!tournamentId) return { success: false, error: "No ID provided" };

    try {
        const results = await Promise.all([
            supabaseAdmin.from("tournaments").select("id, created_at, store_id, organizer_id, name, status, cut_size, slug, judge_code, match_target_points, swiss_rounds, stores(name, primary_color, secondary_color, plan)").eq("id", tournamentId).single(),
            supabaseAdmin.from("matches").select("id, created_at, tournament_id, stage, swiss_round_id, swiss_round_number, bracket_round, match_number, participant_a_id, participant_b_id, score_a, score_b, winner_id, status, is_bye, target_points").eq("tournament_id", tournamentId).order("match_number", { ascending: true }),
            supabaseAdmin.from("participants").select("id, created_at, tournament_id, user_id, display_name, dropped, checked_in").eq("tournament_id", tournamentId),
            supabaseAdmin.from("tournament_judges").select("user_id, created_at").eq("tournament_id", tournamentId)
        ]);

        if (results[0].error) throw results[0].error;
        if (results[1].error) throw results[1].error;
        if (results[2].error) throw results[2].error;

        return {
            success: true,
            tournament: results[0].data,
            matches: results[0].data ? results[1].data || [] : [], // Only return matches if tournament found
            participants: results[2].data || [],
            judges: (results[3].data) || []
        };

    } catch (e: unknown) {
        console.error("Fetch Error:", e);
        const msg = e instanceof Error ? e.message : "Unknown Error";
        return { success: false, error: msg };
    }
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

    const { error } = await supabaseAdmin
        .from("tournaments")
        .update({ status: "completed" })
        .eq("id", tournamentId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/t/${tournamentId}/admin`);
    revalidatePath(`/`);

    // Trigger Tournament Conclusion Badges
    await checkTournamentBadges(tournamentId);

    // Update Points for all participants in this tournament (to apply Top Cut / Win bonuses)
    // Only verify those with linked users
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
    const currentUser = await stackServerApp.getUser();
    if (currentUser) await awardBadge(currentUser.id, "The Architect", tournamentId);

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

export async function getTournamentsDirectoryAction(city?: string, page = 1, pageSize = 12) {
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
