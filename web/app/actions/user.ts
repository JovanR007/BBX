"use server";

import { revalidatePath } from "next/cache";
import { stackServerApp } from "@/lib/stack";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { awardBadge } from "@/lib/badges";
import { isSuperAdmin } from "./utils";

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
