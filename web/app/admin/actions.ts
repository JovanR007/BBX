"use server";

import { stackServerApp } from "../../lib/stack";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// Private Admin Client to bypass RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

export async function createStoreAction(prevState: any, formData: FormData) {
    const user = await stackServerApp.getUser();
    const email = user?.primaryEmail;

    // Unified Superadmin Check
    let isSuper = false;
    if (email === 'shearjovan7@gmail.com' || email === process.env.SUPERADMIN_EMAIL) {
        isSuper = true;
    } else if (user) {
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
        if (profile?.role === 'superadmin') isSuper = true;
    }

    if (!isSuper) {
        return { success: false, error: "Unauthorized" };
    }

    const ownerId = formData.get("owner_id") as string;
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const contact = formData.get("contact") as string;
    const address = formData.get("address") as string;

    if (!ownerId || !name || !slug) {
        return { success: false, error: "Missing required fields" };
    }

    // Basic validation
    if (ownerId.length < 5) {
        return { success: false, error: "Invalid User ID format." };
    }

    const pin = Math.floor(Math.random() * (9999 - 1000 + 1) + 1000).toString();

    const { error } = await supabaseAdmin.from("stores").insert({
        owner_id: ownerId,
        name,
        slug,
        contact_number: contact,
        address,
        pin,
    });

    if (error) {
        if (error.code === '23505') { // Unique violation
            if (error.message.includes('owner_id')) return { success: false, error: "This User already owns a store." };
            if (error.message.includes('slug')) return { success: false, error: "This Store URL (slug) is already taken." };
        }
        return { success: false, error: error.message };
    }

    revalidatePath("/admin");
    return { success: true, error: null };
}
