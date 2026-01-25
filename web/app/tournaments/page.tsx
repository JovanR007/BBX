import { getTournamentsDirectoryAction } from "@/app/actions";
import Link from "next/link";
import Image from "next/image";
import { Trophy, Calendar, MapPin, Search } from "lucide-react";
import FilterBar from "@/app/stores/filter-bar";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TournamentsPage({
    searchParams
}: {
    searchParams: Promise<{ city?: string, page?: string }>
}) {
    const { city, page } = await searchParams;
    const filterCity = city || "all";
    const currentPage = Number(page) || 1;
    const pageSize = 12;

    const { success, data, count } = await getTournamentsDirectoryAction(filterCity, currentPage, pageSize);
    const tournaments = success ? (data as any[]) : [];
    const totalTournaments = count || 0;
    const totalPages = Math.ceil(totalTournaments / pageSize);

    return (
        <div className="min-h-screen bg-slate-950 relative flex flex-col">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            <div className="container mx-auto px-4 py-8 relative z-10">
                <div className="mb-12 text-center space-y-4">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                        TOURNAMENT EVENTS
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Find and join upcoming Beyblade X tournaments near you.
                    </p>
                </div>

                {/* Filter Bar (Reused from Stores but works for Tournaments now via URL param) */}
                <div className="max-w-md mx-auto mb-16 text-black">
                    <FilterBar currentCity={filterCity === "all" ? "" : filterCity} />
                </div>

                {/* TOURNAMENT LIST */}
                <div>
                    <div className="flex items-center justify-between mb-10">
                        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-3 uppercase">
                            <div className="w-8 h-1 bg-cyan-500 rounded-full" />
                            {filterCity !== "all" ? `Events in ${filterCity}` : "Upcoming Events"}
                        </h2>
                        <span className="text-sm text-slate-500 font-bold uppercase tracking-widest">{totalTournaments} Found</span>
                    </div>

                    {tournaments.length === 0 ? (
                        <div className="text-center py-24 border rounded-3xl border-dashed border-slate-900 bg-slate-950/50 backdrop-blur-sm">
                            <p className="text-muted-foreground font-medium text-lg">No tournaments found in this area.</p>
                            <Link href="/create" className="text-cyan-400 font-bold mt-4 inline-block hover:underline">
                                Host Your Own Event &rarr;
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
                                {tournaments.map((t) => (
                                    <Link
                                        key={t.id}
                                        href={`/t/${t.slug || t.id}`}
                                        className="group relative block bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden hover:border-cyan-500/50 hover:bg-slate-900/60 transition-all duration-300"
                                    >
                                        <div className="h-40 relative bg-slate-900 overflow-hidden">
                                            {/* Venue / Store Image */}
                                            {t.stores?.image_url ? (
                                                <Image
                                                    src={t.stores.image_url}
                                                    alt={t.stores.name}
                                                    fill
                                                    className="object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                                    <Trophy className="w-12 h-12 text-slate-800" />
                                                </div>
                                            )}

                                            {/* Date Badge */}
                                            {t.start_time && (
                                                <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5 text-center shadow-xl">
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                        {new Date(t.start_time).toLocaleString('en-US', { month: 'short' })}
                                                    </div>
                                                    <div className="text-lg font-black text-white leading-none">
                                                        {new Date(t.start_time).getDate()}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Status Badge */}
                                            <div className="absolute top-3 right-3">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-lg backdrop-blur-md",
                                                    t.status === 'started'
                                                        ? "bg-green-500/20 text-green-400 border-green-500/30 animate-pulse"
                                                        : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                                )}>
                                                    {t.status === 'started' ? 'Live Now' : 'Upcoming'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-5">
                                            <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-cyan-400 transition-colors">
                                                {t.name}
                                            </h3>

                                            <div className="space-y-2 text-sm text-slate-400">
                                                <div className="flex items-start gap-2.5">
                                                    <MapPin className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                                                    <span className="line-clamp-2">
                                                        {t.location || t.stores?.city + " (Store Venue)"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2.5">
                                                    <Calendar className="w-4 h-4 text-slate-600 shrink-0" />
                                                    <span>
                                                        {t.start_time
                                                            ? new Date(t.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                                                            : "TBA"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-800 overflow-hidden relative border border-slate-700">
                                                        {t.stores?.image_url && (
                                                            <Image src={t.stores.image_url} alt="Host" fill className="object-cover" unoptimized />
                                                        )}
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate max-w-[120px]">
                                                        {t.stores?.name}
                                                    </span>
                                                </div>
                                                <div className="text-xs font-bold text-cyan-500 group-hover:translate-x-1 transition-transform">
                                                    View Details &rarr;
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            {/* Pagination Logic */}
                            {totalPages > 1 && (
                                <div className="flex justify-center items-center gap-4 py-8 border-t border-slate-900">
                                    <Link
                                        href={`/tournaments?city=${filterCity}&page=${Math.max(1, currentPage - 1)}`}
                                        className={cn(
                                            "px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl font-bold transition-all text-white",
                                            currentPage === 1 ? "opacity-30 pointer-events-none" : "hover:bg-slate-800 hover:border-slate-700"
                                        )}
                                    >
                                        Previous
                                    </Link>
                                    <div className="text-slate-500 font-bold text-sm uppercase tracking-widest">
                                        Page {currentPage} of {totalPages}
                                    </div>
                                    <Link
                                        href={`/tournaments?city=${filterCity}&page=${Math.min(totalPages, currentPage + 1)}`}
                                        className={cn(
                                            "px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl font-bold transition-all text-white",
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
