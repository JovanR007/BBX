"use server";

import { revalidatePath } from "next/cache";
import { stackServerApp } from "@/lib/stack";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyTournamentOwner } from "./utils";

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

export async function acceptInviteAction(token: string, deckId?: string | null) {
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
            dropped: false,
            deck_id: deckId || null
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
