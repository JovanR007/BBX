import { getTournamentsDirectoryAction } from "@/app/actions";
import { Trophy } from "lucide-react";
import FilterBar from "@/app/stores/filter-bar";
import { cn } from "@/lib/utils";
import { LiveTournamentCard } from "@/components/tournaments/live-tournament-card";
import { UpcomingTournamentList } from "@/components/tournaments/upcoming-tournament-list";
import Link from "next/link";

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

    const { success, liveData, upcomingData, count } = await getTournamentsDirectoryAction(filterCity, currentPage, pageSize);
    const liveTournaments = success ? (liveData as any[]) : [];
    const upcomingTournaments = success ? (upcomingData as any[]) : [];
    const totalTournaments = count || 0;
    const totalPages = Math.ceil(totalTournaments / pageSize);

    return (
        <div className="min-h-screen bg-slate-950 relative flex flex-col font-sans">
            {/* Background Grid - subtle and premium */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

            <div className="container mx-auto px-4 md:px-8 py-8 md:py-12 relative z-10 max-w-5xl">
                {/* Header Section */}
                <div className="mb-12 flex flex-col items-center text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
                        <Trophy className="w-3 h-3" />
                        Official & Community Events
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">
                        TOURNAMENT SCHEDULE
                    </h1>
                    <p className="text-slate-400 text-lg max-w-lg mx-auto leading-relaxed">
                        Find live matches and register for upcoming Beyblade X events near you.
                    </p>
                </div>

                {/* Filter Bar */}
                <div className="max-w-md mx-auto mb-16">
                    <FilterBar currentCity={filterCity === "all" ? "" : filterCity} baseUrl="/tournaments" />
                </div>

                {/* LIVE FEED (Dedicated Section) */}
                {liveTournaments.length > 0 && (
                    <div className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold tracking-tight uppercase text-white flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-red-500 rounded-full" />
                                {filterCity !== "all" ? `Live in ${filterCity}` : "Happening Now"}
                            </h2>
                            <span className="text-xs font-bold text-red-500 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 animate-pulse">
                                {liveTournaments.length} Active
                            </span>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {liveTournaments.map((t) => (
                                <LiveTournamentCard key={t.id} tournament={t} />
                            ))}
                        </div>
                    </div>
                )}

                {/* UPCOMING LIST */}
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                    <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
                        <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-3 uppercase">
                            <div className="w-1.5 h-6 bg-cyan-500 rounded-full" />
                            {filterCity !== "all" ? `Upcoming in ${filterCity}` : "Upcoming Events"}
                        </h2>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{totalTournaments} Scheduled</span>
                    </div>

                    <UpcomingTournamentList tournaments={upcomingTournaments} />

                    {/* Pagination Logic */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 py-8 mt-8 border-t border-slate-900 border-dashed">
                            <Link
                                href={`/tournaments?city=${filterCity}&page=${Math.max(1, currentPage - 1)}`}
                                className={cn(
                                    "px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl font-bold transition-all text-white text-sm",
                                    currentPage === 1 ? "opacity-30 pointer-events-none" : "hover:bg-slate-800 hover:border-slate-700"
                                )}
                            >
                                Previous
                            </Link>
                            <div className="text-slate-500 font-bold text-xs uppercase tracking-widest">
                                Page {currentPage} of {totalPages}
                            </div>
                            <Link
                                href={`/tournaments?city=${filterCity}&page=${Math.min(totalPages, currentPage + 1)}`}
                                className={cn(
                                    "px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl font-bold transition-all text-white text-sm",
                                    currentPage === totalPages ? "opacity-30 pointer-events-none" : "hover:bg-slate-800 hover:border-slate-700"
                                )}
                            >
                                Next
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
