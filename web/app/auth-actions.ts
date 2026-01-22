"use server";

import { stackServerApp } from "@/lib/stack";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function registerWithUsernameAction(formData: FormData) {
    const username = formData.get("username") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!username || !email || !password) {
        return { success: false, error: "Missing fields" };
    }

    // 1. Validate Username Uniqueness using Admin Client (Bypass RLS)
    const { data: existingUser } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .ilike("username", username)
        .single();

    if (existingUser) {
        return { success: false, error: "Username already taken" };
    }

    // 2. Validate Email Uniqueness in Profiles (Optional, but good for consistency)
    const { data: existingEmail } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();

    if (existingEmail) {
        return { success: false, error: "Email already registered" };
    }

    // 3. Check Stack for existing email (Zombie User Check)
    // If the user exists in Stack but not in Profiles, we still want to block registration 
    // to avoid creating duplicate zombies or confusion.
    // We use listUsers with a query to find exact matches.
    const stackUsers = await stackServerApp.listUsers({ query: email });
    const stackUser = stackUsers.find(u => u.primaryEmail === email);

    if (stackUser) {
        return { success: false, error: "Email already registered in system" };
    }

    return { success: true };
}

export async function createProfileAfterSignupAction(username: string, email: string) {
    let user = await stackServerApp.getUser();

    // Fallback: If session not ready, find user by email (Race condition handling)
    if (!user) {
        const users = await stackServerApp.listUsers({ query: email });
        const found = users.find(u => u.primaryEmail === email);
        if (found) {
            // We found the user, but we need to cast/adapt it if necessary, or just use the ID.
            // listUsers returns ServerUser[], which has `id`.
            user = found as any;
        }
    }

    if (!user) return { success: false, error: "Not authenticated via Stack (and user lookup failed)" };

    // Create Profile
    const { error } = await supabaseAdmin
        .from("profiles")
        .insert({
            id: user.id,
            username: username,
            display_name: username, // Default display name
            email: email,
            created_at: new Date().toISOString()
        });

    if (error) {
        // Handle Duplicate Key Error (PK Violation or Unique Username Violation)
        if (error.code === "23505") {
            // Postgres Unique Violation

            // We need to know IF it was the ID (redundant call) or USERNAME (taken).
            // We can check the constraint name if available, or just check if the username belongs to SOMEONE ELSE.

            // Check if THIS user already has a profile (Redundant / Idempotent)
            const { data: myProfile } = await supabaseAdmin
                .from("profiles")
                .select("id")
                .eq("id", user.id)
                .single();

            if (myProfile) {
                // I already have a profile. Success (Idempotent).
                console.log("Profile already exists for this user (Idempotent).");
                return { success: true };
            }

            // If I don't have a profile, but got a unique violation, then the username is taken by someone else.
            return { success: false, error: "Username is already taken by another blader." };
        }

        console.error("Profile Creation Error:", error);
        return { success: false, error: "Failed to create profile: " + error.message };
    }

    return { success: true };
}

export async function getEmailFromUsernameAction(usernameOrEmail: string) {
    // Check if it looks like an email
    if (usernameOrEmail.includes("@")) {
        return { success: true, email: usernameOrEmail, isEmail: true };
    }

    // Lookup Email from Username
    const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .ilike("username", usernameOrEmail)
        .single();

    if (!profile || !profile.email) {
        return { success: false, error: "Username not found" };
    }

    return { success: true, email: profile.email, isEmail: false };
}
