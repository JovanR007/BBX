import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase Environment Variables!");
} else {
    // console.log("Supabase Client Initializing...", { url: supabaseUrl });
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
