import { supabaseAdmin } from "@/lib/supabase-admin"; // Use Admin for cleaner server fetch or standard client
import { LandingPageClient } from "./_components/landing-page-client";
import { Store } from "@/types";

export const dynamic = "force-dynamic"; // Ensure fresh data on every request

export default async function LandingPage() {
  // Fetch Featured Stores (Server Side)
  // We use supabaseAdmin to avoid RLS issues if any for public list, 
  // or standard client if configured for server. 
  // Admin is safe here for reading "pro" stores.

  // Note: If supabase-admin isn't set up for "select" without RLS, it effectively bypasses RLS.
  // Ensure we only select safe fields.
  const { data } = await supabaseAdmin
    .from("stores")
    .select("id, created_at, owner_id, name, slug, image_url, address, contact_number, city, country, primary_color, secondary_color, plan")
    .eq("plan", "pro")
    .order("created_at", { ascending: false });

  const stores = (data || []) as Store[];

  return <LandingPageClient initialStores={stores} />;
}
