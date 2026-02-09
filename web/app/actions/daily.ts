"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { stackServerApp } from "@/lib/stack";
import { verifyTournamentOwner } from "./utils";

const DAILY_API_KEY = process.env.DAILY_API_KEY;

export async function createDailyRoomAction(matchId: string) {
    if (!DAILY_API_KEY) {
        return { success: false, error: "Configuration Error: DAILY_API_KEY is missing." };
    }

    const user = await stackServerApp.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // 1. Fetch Match
    const { data: match, error: fetchErr } = await supabaseAdmin
        .from("matches")
        .select("tournament_id, metadata")
        .eq("id", matchId)
        .single();

    if (fetchErr || !match) return { success: false, error: "Match not found" };

    // 2. Permission Check
    let isAuthorized = false;
    const ownerUser = await verifyTournamentOwner(match.tournament_id);
    if (ownerUser) isAuthorized = true;
    else {
        const { data: judge } = await supabaseAdmin
            .from("tournament_judges")
            .select("user_id")
            .eq("tournament_id", match.tournament_id)
            .eq("user_id", user.id)
            .maybeSingle();
        if (judge) isAuthorized = true;
    }

    if (!isAuthorized) return { success: false, error: "Unauthorized" };

    const metadata = match.metadata || {};

    // 3. Return existing room if valid
    // We might want to check if the room is still active via API, but for now trust the DB.
    if (metadata.daily_room_url) {
        // Also update streaming_judge_id to current user if they are starting the stream
        if (metadata.streaming_judge_id !== user.id) {
            await supabaseAdmin.from("matches").update({
                metadata: { ...metadata, streaming_judge_id: user.id }
            }).eq("id", matchId);
        }
        return { success: true, url: metadata.daily_room_url };
    }

    // 4. Create New Room
    try {
        const response = await fetch("https://api.daily.co/v1/rooms", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${DAILY_API_KEY}`
            },
            body: JSON.stringify({
                properties: {
                    exp: Math.floor(Date.now() / 1000) + 3600 * 2, // 2 hours expiry
                    enable_chat: false,
                    start_video_off: false,
                    start_audio_off: false
                }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("Daily API Error:", err);
            return { success: false, error: "Failed to create video room." };
        }

        const roomData = await response.json();
        const roomUrl = roomData.url;

        // 5. Save to Match Metadata
        const newMetadata = {
            ...metadata,
            daily_room_url: roomUrl,
            streaming_judge_id: user.id
        };

        const { error: saveErr } = await supabaseAdmin
            .from("matches")
            .update({ metadata: newMetadata })
            .eq("id", matchId);

        if (saveErr) return { success: false, error: "Failed to save room URL." };

        return { success: true, url: roomUrl };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Internal Server Error during room creation." };
    }
}
