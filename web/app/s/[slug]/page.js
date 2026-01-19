import { supabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { ArrowLeft, MapPin, Phone, Store } from "lucide-react";
import TournamentList from "../../dashboard/tournament-list";
import StoreImage from "@/app/components/store-image";

export const dynamic = "force-dynamic";

export default async function StorePage({ params }) {
    const { slug } = await params;

    // 1. Fetch Store (Privileged read for Server Component)
    const { data: store } = await supabaseAdmin
        .from("stores")
        .select("*")
        .eq("slug", slug)
        .single();

    if (!store) {
        return (
            <div className="container mx-auto py-24 text-center">
                <h1 className="text-2xl font-bold">Store Not Found</h1>
            </div>
        )
    }

    // 2. Fetch Tournaments
    const { data: tournaments } = await supabaseAdmin
        .from("tournaments")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

    return (
        <div className="container mx-auto py-12 px-4">
            <div className="mb-8">
                <Link href="/" className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to All Stores
                </Link>

                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b pb-8">
                    <div>
                        <h1 className="text-4xl font-extrabold mb-2">{store.name}</h1>
                        <div className="space-y-1 text-muted-foreground">
                            {store.address && (
                                <div className="flex items-center">
                                    <MapPin className="w-4 h-4 mr-2" />
                                    {store.address}
                                </div>
                            )}
                            {store.contact_number && (
                                <div className="flex items-center">
                                    <Phone className="w-4 h-4 mr-2" />
                                    {store.contact_number}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="hidden md:block shrink-0 h-24 w-24">
                        <StoreImage
                            src={store.image_url}
                            alt={store.name}
                            className="w-24 h-24 object-cover rounded-xl border bg-muted"
                        />
                    </div>
                </div>
            </div>

            <div className="mt-12">
                <h2 className="text-2xl font-bold mb-6">Tournament Schedule</h2>
                <TournamentList tournaments={tournaments || []} />
            </div>
        </div>
    );
}
