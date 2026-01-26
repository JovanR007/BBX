import { stackServerApp } from "@/lib/stack";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import TournamentList from "./tournament-list";
import StoreSettings from "./store-settings";
import ProfileEditor from "./profile-editor";
import { Store, ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
    try {
        const user = await stackServerApp.getUser();

        if (!user) {
            return (
                <div className="container mx-auto py-24 text-center">
                    <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
                    <p className="mb-8">You must be logged in to view this page.</p>
                    <Link href="/handler/sign-in" className="btn btn-primary">Sign In</Link>
                </div>
            );
        }

        // 1. Fetch Store owned by this user
        console.log(`[Dashboard] Fetching store for user: ${user.id}`);
        const { data: store, error: storeError } = await supabaseAdmin
            .from("stores")
            .select("*")
            .eq("owner_id", user.id)
            .single();

        if (storeError && storeError.code !== 'PGRST116') { // PGRST116 is "No rows found" which is handled below
            console.error("[Dashboard] Store fetch error:", storeError);
            throw new Error(`Failed to fetch store: ${storeError.message}`);
        }

        // 2. If NOT a store owner, redirect to their public profile
        if (!store) {
            console.log(`[Dashboard] No store found for user ${user.id}, redirecting...`);
            // Fetch profile to get username
            const { data: profile } = await supabaseAdmin
                .from("profiles")
                .select("username")
                .eq("id", user.id)
                .single();

            if (profile?.username) {
                redirect(`/u/${profile.username}`);
            } else {
                // No username set? Go to account settings to set it
                redirect("/account");
            }
        }

        // 3. Store Dashboard Logic
        let tournaments = [];
        if (store) {
            const { data, error: tournamentError } = await supabaseAdmin
                .from("tournaments")
                .select("*")
                .eq("store_id", store.id)
                .order("created_at", { ascending: false });

            if (tournamentError) {
                console.error("[Dashboard] Tournament fetch error:", tournamentError);
            }
            tournaments = data || [];
        }

        return (
            <div className="container mx-auto py-12 px-4">
                <div className="mb-6">
                    <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
                    </Link>
                </div>

                <header className="mb-8 flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">{store.name}</h1>
                        <p className="text-muted-foreground">Manage your tournaments.</p>
                    </div>
                    <div>
                        <Link href="/create" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium inline-flex items-center hover:bg-primary/90 transition-colors">
                            Create Tournament
                        </Link>
                    </div>
                </header>

                <div className="flex flex-col gap-12">
                    <section>
                        <h2 className="text-2xl font-bold mb-4">Store Settings</h2>
                        <StoreSettings store={store} />
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">Tournaments</h2>
                        <TournamentList tournaments={tournaments} />
                    </section>

                    <div className="mt-8 pt-8 border-t text-sm text-muted-foreground">
                        <p>Store ID: {store.id}</p>
                        <p>Slug: {store.slug}</p>
                    </div>
                </div>
            </div >
        );
    } catch (error: any) {
        if (error?.message === 'NEXT_REDIRECT' || error?.digest?.startsWith('NEXT_REDIRECT')) {
            throw error;
        }
        console.error("[Dashboard] Critical Error:", error);
        return (
            <div className="container mx-auto py-24 text-center">
                <h1 className="text-2xl font-bold mb-4 text-red-500">Dashboard Error</h1>
                <p className="mb-8 text-muted-foreground">Something went wrong loading your dashboard.</p>
                <div className="p-4 bg-muted rounded-md inline-block text-left text-sm font-mono max-w-2xl overflow-auto">
                    {error.message || "Unknown error occurred"}
                </div>
            </div>
        );
    }
}
