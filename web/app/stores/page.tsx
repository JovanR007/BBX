import { getStoresAction, getLiveTournamentsAction } from "@/app/actions";
import Link from "next/link";
import Image from "next/image";
import { StoreCard } from "@/components/features/store-card";
import { Trophy, Search, Loader2 } from "lucide-react";
import { Store, Tournament } from "@/types";
import { redirect } from "next/navigation";

// Client Component for filter interactivity
import FilterBar from "./filter-bar";

export const dynamic = "force-dynamic";

export default async function StoresPage({ searchParams }: { searchParams: Promise<{ city?: string }> }) {
    const { city } = await searchParams;
    const filterCity = city || "all";

    // Fetch Data in Parallel
    const [storesRes, tournamentsRes] = await Promise.all([
        getStoresAction(filterCity),
        getLiveTournamentsAction(filterCity)
    ]);

    const stores = storesRes.success ? (storesRes.data as Store[]) : [];
    const activeTournaments = tournamentsRes.success ? (tournamentsRes.data as any[]) : [];

    return (
        <div className="min-h-screen bg-neutral-950 relative flex flex-col">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            <div className="container mx-auto px-4 py-8 relative z-10">
                <div className="mb-12 text-center space-y-4">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                        STORE DIRECTORY
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Find official BEYBRACKET hobby stores and join the action near you.
                    </p>
                </div>

                {/* Filter Bar */}
                <div className="max-w-md mx-auto mb-12 text-black">
                    <FilterBar currentCity={filterCity === "all" ? "" : filterCity} />
                </div>

                {/* LIVE FEED */}
                <div className="mb-16">
                    <div className="flex items-center gap-2 mb-6 text-white">
                        <div className="relative">
                            <div className="absolute inset-0 bg-red-500 blur opacity-50 animate-pulse rounded-full" />
                            <div className="relative w-3 h-3 bg-red-500 rounded-full" />
                        </div>
                        <h2 className="text-xl font-bold tracking-tight uppercase">
                            {filterCity !== "all" ? `Live in ${filterCity}` : "Global Live Feed"}
                        </h2>
                    </div>

                    {activeTournaments.length === 0 ? (
                        <div className="bg-slate-900/30 border border-slate-800 border-dashed rounded-xl p-8 text-center text-muted-foreground">
                            No active tournaments found {filterCity !== "all" ? `in ${filterCity}` : "right now"}.
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {activeTournaments.map((t) => (
                                <Link
                                    key={t.id}
                                    href={`/t/${t.id}`}
                                    className="group block bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-all"
                                >
                                    <div className="p-4 flex gap-4">
                                        <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                            {t.stores?.image_url ? (
                                                <Image src={t.stores.image_url} alt={t.stores.name} width={48} height={48} className="w-full h-full object-cover" unoptimized />
                                            ) : (
                                                <Trophy className="w-6 h-6 text-cyan-400" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-white truncate group-hover:text-cyan-400 transition-colors">{t.name}</h3>
                                            <div className="flex items-center text-xs text-muted-foreground gap-2 mt-1">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${t.status === "started" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                                                    {t.status}
                                                </span>
                                                <span className="truncate">@ {t.stores?.name}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* STORE LIST */}
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-white mb-8 flex items-center gap-3 uppercase">
                        <div className="w-8 h-1 bg-purple-500 rounded-full" />
                        {filterCity !== "all" ? `${filterCity} Stores` : "Official Partners"}
                    </h2>

                    {stores.length === 0 ? (
                        <div className="text-center py-12 border rounded-xl border-dashed border-slate-800">
                            <p className="text-muted-foreground">No stores found matching your criteria.</p>
                        </div>
                    ) : (
                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {stores.map((store) => (
                                <StoreCard key={store.id} store={store} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
