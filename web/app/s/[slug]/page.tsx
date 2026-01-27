import { supabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { ArrowLeft, MapPin, Phone, Store } from "lucide-react";
import TournamentList from "../../dashboard/tournament-list";
import StoreImage from "@/components/features/store-image";
import { BrandedContainer } from "@/components/features/branded-container";

export const dynamic = "force-dynamic";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
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

    // 3. Fetch Unique Participants (Bladers)
    // We get all participants for all tournaments of this store
    const tournamentIds = tournaments?.map(t => t.id) || [];

    let uniqueBladerCount = 0;
    if (tournamentIds.length > 0) {
        const { data: participants } = await supabaseAdmin
            .from("participants")
            .select("user_id, display_name")
            .in("tournament_id", tournamentIds);

        if (participants) {
            // Count unique bladers:
            // 1. All unique user_ids (where not null)
            // 2. All display_names where user_id is null (treated as guests)
            const uniqueUsers = new Set(participants.filter(p => p.user_id).map(p => p.user_id));
            const guestNames = new Set(participants.filter(p => !p.user_id).map(p => p.display_name.toLowerCase().trim()));

            uniqueBladerCount = uniqueUsers.size + guestNames.size;
        }
    }

    return (
        <BrandedContainer
            primaryColor={store.primary_color}
            secondaryColor={store.secondary_color}
            plan={store.plan}
            className="min-h-screen bg-neutral-950 relative overflow-hidden"
        >
            {/* Tech Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-neutral-950 to-black z-0" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0833441a_1px,transparent_1px),linear-gradient(to_bottom,#0833441a_1px,transparent_1px)] bg-[size:40px_40px] z-0 pointer-events-none" />

            <div className="container mx-auto py-8 px-4 relative z-10">
                <div className="mb-12">
                    <Link href="/" className="inline-flex items-center text-xs font-mono text-cyan-500 hover:text-cyan-400 transition-colors mb-8 uppercase tracking-widest border border-cyan-900/50 bg-cyan-950/20 px-4 py-2 rounded-full">
                        <ArrowLeft className="mr-2 h-3 w-3" />
                        Return to Sector Map
                    </Link>

                    {/* Command Center Header */}
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* LEFT: Store Identity */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="flex gap-6 items-start">
                                <div className="shrink-0 relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
                                    <div className="relative h-28 w-28 bg-black rounded-xl border border-white/10 overflow-hidden">
                                        <StoreImage
                                            src={store.image_url}
                                            alt={store.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] mb-2">
                                        {store.name}
                                    </h1>
                                    <div className="flex flex-wrap gap-4 text-sm text-cyan-200/60 font-mono">
                                        {store.address && (
                                            <div className="flex items-center border border-cyan-900/50 px-3 py-1 bg-cyan-950/30 rounded">
                                                <MapPin className="w-3 h-3 mr-2 text-cyan-400" />
                                                {store.address}
                                            </div>
                                        )}
                                        {store.contact_number && (
                                            <div className="flex items-center border border-cyan-900/50 px-3 py-1 bg-cyan-950/30 rounded">
                                                <Phone className="w-3 h-3 mr-2 text-cyan-400" />
                                                {store.contact_number}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Stats Panels */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl flex flex-col justify-center items-center text-center hover:border-cyan-500/50 transition-colors group">
                                <span className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1 group-hover:text-cyan-400">Tournaments</span>
                                <span className="text-3xl font-bold text-white group-hover:shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-shadow">
                                    {tournaments?.length || 0}
                                </span>
                            </div>
                            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl flex flex-col justify-center items-center text-center hover:border-purple-500/50 transition-colors group">
                                <span className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1 group-hover:text-purple-400">Bladers</span>
                                <span className="text-3xl font-bold text-white group-hover:shadow-[0_0_15px_rgba(192,132,252,0.5)] transition-shadow">
                                    {uniqueBladerCount}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-16">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center">
                            <Store className="w-5 h-5 mr-3 text-cyan-500" />
                            DEPLOYED EVENTS
                        </h2>
                        <div className="h-px bg-slate-800 flex-1 ml-6 relative">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-cyan-500 rounded-full shadow-[0_0_10px_#22d3ee]"></div>
                        </div>
                    </div>
                    {/* We reuse the list but might need to style it via CSS or wrapping div context */}
                    <div className="relative">
                        <TournamentList tournaments={tournaments || []} />
                    </div>
                </div>
            </div>
        </BrandedContainer>
    );
}
