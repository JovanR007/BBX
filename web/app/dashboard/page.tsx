import { stackServerApp } from "@/lib/stack";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import TournamentList from "./tournament-list";
import StoreSettings from "./store-settings";
import ProfileEditor from "./profile-editor";
import { Store, ArrowLeft, Trophy } from "lucide-react";
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

        // 2. If NOT a store owner, we originally redirected. Now we allow access.
        // if (!store) ... redirect ... -> REMOVED

        // 3. User Dashboard Logic
        let tournaments = [];

        // Fetch tournaments where this user is the organizer OR the store owner
        // Since migration backfills organizer_id, we can rely on it mostly, 
        // but for robustness if they are store owner, we should verify store_id too?
        // Let's keep it simple: Fetch by organizer_id primarily now?
        // Or stick to: If store -> fetch by store_id. Else -> fetch by organizer_id.

        if (store) {
            const { data } = await supabaseAdmin
                .from("tournaments")
                .select("*")
                .eq("store_id", store.id)
                .order("created_at", { ascending: false });
            tournaments = data || [];
        } else {
            // Casual User
            const { data } = await supabaseAdmin
                .from("tournaments")
                .select("*")
                .eq("organizer_id", user.id)
                .order("created_at", { ascending: false });
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
                        <h1 className="text-3xl font-bold">{store ? store.name : "My Dashboard"}</h1>
                        <p className="text-muted-foreground">{store ? "Manage your store and tournaments." : "Manage your community tournaments."}</p>
                    </div>
                    <div>
                        <Link href="/create" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium inline-flex items-center hover:bg-primary/90 transition-colors">
                            Create Tournament
                        </Link>
                    </div>
                </header>

                <div className="flex flex-col gap-12">
                    {store && (
                        <>
                            {/* Pro Upgrade Banner (Free Tier Only) */}
                            {(!store.plan || store.plan === 'free') && (
                                <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <span className="text-yellow-500">⚡</span> Upgrade to Pro
                                        </h3>
                                        <p className="text-slate-300 max-w-xl">
                                            Unlock unlimited players, custom branding, and priority support for your store's tournaments.
                                        </p>
                                    </div>
                                    <Link
                                        href="/dashboard/billing"
                                        className="whitespace-nowrap bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        View Plans &rarr;
                                    </Link>
                                </div>
                            )}

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold mb-4">Store Tools</h2>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <Link href="/dashboard/league" className="block group">
                                        <div className="bg-card border rounded-xl p-6 hover:border-primary/50 transition-colors h-full shadow-sm">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="bg-primary/10 p-3 rounded-lg text-primary">
                                                    <Trophy className="w-6 h-6" />
                                                </div>
                                                {store.plan === 'pro' && (
                                                    <span className="bg-yellow-500/10 text-yellow-500 text-xs font-bold px-2 py-1 rounded-full border border-yellow-500/20">
                                                        PRO
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">Annual Season Standings</h3>
                                            <p className="text-muted-foreground text-sm">
                                                View your store's league leaderboard. Points are tracked automatically from your tournaments.
                                            </p>
                                        </div>
                                    </Link>
                                </div>
                            </section>

                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-2xl font-bold">Store Settings</h2>
                                    <Link href="/dashboard/billing" className="text-sm font-medium text-cyan-400 hover:underline">
                                        Manage Subscription
                                    </Link>
                                </div>
                                <StoreSettings store={store} />
                            </section>
                        </>
                    )}

                    <section>
                        <h2 className="text-2xl font-bold mb-4">My Tournaments</h2>
                        {tournaments.length === 0 && (
                            <div className="p-8 border-2 border-dashed border-slate-800 rounded-lg text-center">
                                <p className="text-muted-foreground mb-4">You haven't hosted any tournaments yet.</p>
                                <Link href="/create" className="text-cyan-400 hover:underline">Host your first {store ? "Ranked" : "Casual"} Tournament</Link>
                            </div>
                        )}
                        <TournamentList tournaments={tournaments} />
                    </section>

                    {store && (
                        <div className="mt-8 pt-8 border-t text-sm text-muted-foreground">
                            <p>Store ID: {store.id}</p>
                            <p>Slug: {store.slug}</p>
                        </div>
                    )}
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
