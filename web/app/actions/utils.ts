import { stackServerApp } from "@/lib/stack";
import { supabaseAdmin } from "@/lib/supabase-admin";

// --- HELPER: Verify Ownership ---
export async function verifyTournamentOwner(tournamentId: string) {
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
export async function isSuperAdmin(user: any) {
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
export async function verifyStorePin(tournamentId: string, providedPin: string) {
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

export type ActionResult<T = void> = Promise<{ success: boolean; data?: T; error?: string; count?: number; page?: number; pageSize?: number; message?: string }>;
