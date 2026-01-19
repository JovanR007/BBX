import { stackServerApp } from "@/lib/stack";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import TournamentList from "./tournament-list";
import StoreSettings from "./store-settings";
import { Store } from "lucide-react";

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

    if (!store) {
        return (
            <div className="container mx-auto py-24 px-4 max-w-2xl">
                <div className="bg-card border rounded-xl p-8 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                        <Store className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">No Store Found</h1>
                    <p className="text-muted-foreground mb-8">
                        You don't have a store linked to your account yet.
                        Please contact the Superadmin to provision your store.
                    </p>
                    <div className="bg-muted/50 p-4 rounded-lg text-left text-sm font-mono">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Your User ID</p>
                        <p>{user.id}</p>
                    </div>
                </div>
            </div>
        )
    }

    // 2. Fetch Tournaments for this store
    const { data: tournaments } = await supabaseAdmin
        .from("tournaments")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

    return (
        <div className="container mx-auto py-12 px-4">
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

            <StoreSettings store={store} />

            <TournamentList tournaments={tournaments || []} />

            <div className="mt-12 pt-8 border-t text-sm text-muted-foreground">
                <p>Store ID: {store.id}</p>
                <p>Slug: {store.slug}</p>
            </div>
        </div >
    );
}
