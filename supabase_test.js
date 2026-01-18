import { supabase } from "./lib/supabase.js";

async function run() {
    const { data, error } = await supabase
        .from("tournaments")
        .insert({
            name: "BBX Test Tournament",
            timezone: "Asia/Manila",
            cut_size: 16
        })
        .select()
        .single();

    if (error) {
        console.error("Insert error:", error);
        return;
    }

    console.log("Created tournament:", data);
}

run();
