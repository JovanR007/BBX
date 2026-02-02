import "dotenv/config";
import { supabaseAdmin } from "./lib/supabase-admin.js";

async function debug() {
    console.log("Checking for 'MrClucker' in profiles...");
    const { data: exact, error: exactErr } = await supabaseAdmin
        .from("profiles")
        .select("id, username")
        .eq("username", "MrClucker")
        .maybeSingle();

    console.log("Exact Match Result:", exact);
    if (exactErr) console.error("Exact Match Error:", exactErr);

    const { data: ilike, error: ilikeErr } = await supabaseAdmin
        .from("profiles")
        .select("id, username")
        .ilike("username", "MrClucker")
        .maybeSingle();

    console.log("Case-Insensitive Match Result:", ilike);
    if (ilikeErr) console.error("Case-Insensitive Match Error:", ilikeErr);

    if (!ilike) {
        console.log("Listing all profiles to see what we have:");
        const { data: all } = await supabaseAdmin.from("profiles").select("username");
        console.log("All Usernames:", all?.map(p => p.username));
    }
}

debug();
