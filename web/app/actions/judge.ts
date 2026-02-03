"use server";

import { revalidatePath } from "next/cache";
import { stackServerApp } from "@/lib/stack";
import { supabaseAdmin } from "@/lib/supabase-admin";

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
