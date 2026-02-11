"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from "next/cache";
import { stackServerApp } from "@/lib/stack";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isSuperAdmin, ActionResult } from "./utils";
import { Store } from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- STORE DISCOVERY ACTIONS ---

export async function getStoresAction(city?: string, page = 1, pageSize = 12) {
    const user = await stackServerApp.getUser();
    const HIDDEN_STORE_IDS = [
        '53981f89-a0cf-4750-9432-59271d68586b', // Hanma Hobby Store
        'ba3adf1d-e5e6-46a4-ba17-d3215e300fb2'  // Hobby Stronghold ba3a
    ];

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
        .from("stores")
        .select("id, created_at, owner_id, name, slug, image_url, address, contact_number, city, country, primary_color, secondary_color, plan, latitude, longitude", { count: 'exact' })
        .order("plan", { ascending: false }) // Show Pro stores first
        .order("created_at", { ascending: false })
        .range(from, to);

    // Hide specific testing stores unless owned by viewer
    if (user) {
        // Show if owner OR (id NOT in hidden list)
        // Note: Supabase OR syntax with mixed operators: "owner_id.eq.X,id.not.in.(Y,Z)"
        query = query.or(`owner_id.eq.${user.id},id.not.in.(${HIDDEN_STORE_IDS.join(',')})`);
    } else {
        query = query.not('id', 'in', `(${HIDDEN_STORE_IDS.join(',')})`);
    }

    if (city && city !== "all") {
        query = query.ilike("city", `%${city}%`);
    }

    const { data, error, count } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data, count, page, pageSize };
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
