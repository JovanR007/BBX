import { getStoresAction, getLiveTournamentsAction } from "@/app/actions";
import Link from "next/link";
import Image from "next/image";
import { StoreCard } from "@/components/features/store-card";
import { Trophy, Search, Loader2 } from "lucide-react";
import { Store, Tournament } from "@/types";
import { redirect } from "next/navigation";

// Client Component for filter interactivity
import FilterBar from "./filter-bar";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StoresPage({
    searchParams
}: {
    searchParams: Promise<{ city?: string, page?: string }>
}) {
    const { city, page } = await searchParams;
    const filterCity = city || "all";
    const currentPage = Number(page) || 1;
    const pageSize = 9;

    // Fetch Data in Parallel
    const [storesRes, tournamentsRes] = await Promise.all([
        getStoresAction(filterCity, currentPage, pageSize),
        getLiveTournamentsAction(filterCity)
    ]);

    const stores = storesRes.success ? (storesRes.data as Store[]) : [];
    const totalStores = (storesRes as any).count || 0;
    const totalPages = Math.ceil(totalStores / pageSize);
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

                {/* STORE LIST */}
                <div>
                    <div className="flex items-center justify-between mb-10">
                        <h2 className="text-xl font-black tracking-widest text-white flex items-center gap-3 uppercase italic">
                            <div className="w-10 h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" />
                            {filterCity !== "all" ? `${filterCity} Partners` : "Tournament Organizers"}
                        </h2>
                        {totalPages > 1 && (
                            <div className="flex gap-2">
                                {currentPage > 1 && (
                                    <Link
                                        href={`/stores?city=${filterCity}&page=${currentPage - 1}`}
                                        className="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 text-white transition-colors"
                                    >
                                        &larr;
                                    </Link>
                                )}
                                <span className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-bold text-sm flex items-center">
                                    {currentPage} / {totalPages}
                                </span>
                                {currentPage < totalPages && (
                                    <Link
                                        href={`/stores?city=${filterCity}&page=${currentPage + 1}`}
                                        className="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 text-white transition-colors"
                                    >
                                        &rarr;
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>

                    {stores.length === 0 ? (
                        <div className="text-center py-20 border rounded-3xl border-dashed border-slate-900 bg-slate-950/50 backdrop-blur-sm">
                            <p className="text-muted-foreground font-medium">No official partners found matching your search.</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-12">
                                {stores.map((store) => (
                                    <StoreCard key={store.id} store={store} />
                                ))}
                            </div>

                            {/* Bottom Pagination for better UX */}
                            {totalPages > 1 && (
                                <div className="flex justify-center items-center gap-4 py-8 border-t border-slate-900">
                                    <Link
                                        href={`/stores?city=${filterCity}&page=${Math.max(1, currentPage - 1)}`}
                                        className={cn(
                                            "px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl font-bold transition-all",
                                            currentPage === 1 ? "opacity-30 pointer-events-none" : "hover:bg-slate-800 hover:border-slate-700"
                                        )}
                                    >
                                        Previous
                                    </Link>
                                    <div className="text-slate-500 font-bold text-sm uppercase tracking-widest">
                                        Page {currentPage} of {totalPages}
                                    </div>
                                    <Link
                                        href={`/stores?city=${filterCity}&page=${Math.min(totalPages, currentPage + 1)}`}
                                        className={cn(
                                            "px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl font-bold transition-all",
                                            currentPage === totalPages ? "opacity-30 pointer-events-none" : "hover:bg-slate-800 hover:border-slate-700"
                                        )}
                                    >
                                        Next
                                    </Link>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
