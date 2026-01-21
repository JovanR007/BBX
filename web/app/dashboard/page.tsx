import { stackServerApp } from "@/lib/stack";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import TournamentList from "./tournament-list";
import StoreSettings from "./store-settings";
import ProfileEditor from "./profile-editor";
import { Store, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
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

    // 1. Fetch Store owned by this user (Admin Client to bypass RLS)
    const { data: store } = await supabaseAdmin
        .from("stores")
        .select("*")
        .eq("owner_id", user.id)
        .single();

    // Store check handled below

    // 2. Fetch Tournaments for this store (if exists)
    // We moved the !store check down so we can still render the dashboard for non-store owners.

    let tournaments = [];
    if (store) {
        const { data } = await supabaseAdmin
            .from("tournaments")
            .select("*")
            .eq("store_id", store.id)
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
                    <p className="text-muted-foreground">{store ? "Manage your tournaments." : "Welcome back, Blader."}</p>
                </div>
                {store && (
                    <div>
                        <Link href="/create" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium inline-flex items-center hover:bg-primary/90 transition-colors">
                            Create Tournament
                        </Link>
                    </div>
                )}
            </header>

            <div className="flex flex-col gap-12">
                {/* 1. Store Management OR Profile Editor */}
                {store ? (
                    <>
                        {/* Store Owners: Show Store Management Tools Only */}
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
                    </>
                ) : (
                    <>
                        {/* Regular Users: Show Profile Editor + Become Organizer CTA */}
                        <section>
                            <ProfileEditor user={{ id: user.id }} />
                        </section>

                        <section className="bg-muted/30 p-8 rounded-xl border border-dashed text-center">
                            <Store className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <h2 className="text-xl font-bold mb-2">Become a Tournament Organizer</h2>
                            <p className="text-muted-foreground mb-4">
                                Want to host your own events? Contact the admin to set up a Store Profile.
                            </p>
                            <div className="bg-muted p-4 rounded-lg inline-block text-left text-sm font-mono">
                                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Your User ID</p>
                                <p>{user.id}</p>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div >
    );
}
