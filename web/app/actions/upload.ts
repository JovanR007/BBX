"use server";

import { stackServerApp } from "@/lib/stack";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ActionResult } from "./utils";

export async function uploadDeckImageAction(formData: FormData): Promise<ActionResult> {
    const user = await stackServerApp.getUser();
    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    const file = formData.get("file") as File;
    if (!file) {
        return { success: false, error: "No file provided" };
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        return { success: false, error: "File size must be less than 5MB" };
    }

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        // Convert File to Buffer for upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: uploadError } = await supabaseAdmin.storage
            .from('deck-images')
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: true
            });

        if (uploadError) {
            console.error("Upload error:", uploadError);
            return { success: false, error: "Failed to upload image" };
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('deck-images')
            .getPublicUrl(filePath);

        return { success: true, message: publicUrl };

    } catch (error) {
        console.error("Server upload error:", error);
        return { success: false, error: "Internal server error during upload" };
    }
}
