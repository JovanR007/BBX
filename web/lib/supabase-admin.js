import { createClient } from "@supabase/supabase-js";

// Private Admin Client to bypass RLS
// ONLY use this in Server Actions or Server Components. Never expose to client.
export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);
