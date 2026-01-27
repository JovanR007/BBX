"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Search, Filter, Calendar, Trophy, Medal, ArrowUpDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type TournamentHistoryItem = {
    id: string;
    name: string;
    created_at: string;
    status: string;
    location?: string; // Optional if we have it
    store_name?: string; // Optional
    played_as: string;
    rank?: number | string; // Placeholder for future rank logic
};

interface TournamentHistoryProps {
    tournaments: TournamentHistoryItem[];
}

export function TournamentHistory({ tournaments }: TournamentHistoryProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "active">("all");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

    // Filter & Sort Logic
    const filteredTournaments = useMemo(() => {
        let result = [...tournaments];

        // 1. Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(t => 
                t.name.toLowerCase().includes(q) || 
                t.location?.toLowerCase().includes(q) ||
                t.store_name?.toLowerCase().includes(q)
            );
        }

        // 2. Filter Status
        if (filterStatus !== "all") {
            if (filterStatus === "completed") {
                result = result.filter(t => t.status === "completed");
            } else {
                result = result.filter(t => t.status !== "completed");
            }
        }

        // 3. Sort
        result.sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
        });

        return result;
    }, [tournaments, searchQuery, filterStatus, sortOrder]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2 self-start md:self-center">
                    <Trophy className="w-5 h-5 text-yellow-500" /> 
                    Tournament History
                    <span className="text-sm text-slate-500 font-normal ml-2">({filteredTournaments.length})</span>
                </h2>

                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative flex-grow md:flex-grow-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                            type="text" 
                            placeholder="Search tournaments..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full md:w-64 bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600"
                        />
                    </div>

                    {/* Filter Status */}
                    <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-800">
                        <button 
                            onClick={() => setFilterStatus("all")}
                            className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all", filterStatus === "all" ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-300")}
                        >
                            ALL
                        </button>
                        <button 
                            onClick={() => setFilterStatus("active")}
                            className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all", filterStatus === "active" ? "bg-yellow-500/20 text-yellow-400 shadow-sm" : "text-slate-500 hover:text-slate-300")}
                        >
                            LIVE
                        </button>
                        <button 
                            onClick={() => setFilterStatus("completed")}
                            className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all", filterStatus === "completed" ? "bg-green-500/20 text-green-400 shadow-sm" : "text-slate-500 hover:text-slate-300")}
                        >
                            DONE
                        </button>
                    </div>

                    {/* Sort */}
                    <button 
                        onClick={() => setSortOrder(prev => prev === "newest" ? "oldest" : "newest")}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:border-slate-700 transition-all"
                    >
                        <ArrowUpDown className="w-3 h-3" />
                        {sortOrder === "newest" ? "NEWEST" : "OLDEST"}
                    </button>
                </div>
            </div>

            <div className="grid gap-4">
                {filteredTournaments.length > 0 ? (
                    filteredTournaments.map((tournament) => (
                        <Link href={`/t/${tournament.id}`} key={tournament.id} className="block group">
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-cyan-500/50 hover:bg-slate-900/80 transition-all relative overflow-hidden">
                                
                                {/* Status Indicator Strip */}
                                <div className={cn(
                                    "absolute left-0 top-0 bottom-0 w-1",
                                    tournament.status === 'completed' ? "bg-green-500" : "bg-yellow-500"
                                )} />

                                <div className="pl-2">
                                    <div className="text-[10px] text-slate-500 font-mono mb-1.5 flex items-center gap-2 uppercase tracking-wider">
                                        <Calendar className="w-3 h-3" />
                                        {format(new Date(tournament.created_at), "MMM d, yyyy")}
                                        <span className="text-slate-700">•</span>
                                        <span className={cn(
                                            "font-bold",
                                            tournament.status === 'completed' ? "text-green-400" : "text-yellow-400"
                                        )}>
                                            {tournament.status}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors mb-1">
                                        {tournament.name}
                                    </h3>
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        <span className="flex items-center gap-1.5 bg-black/20 px-2 py-0.5 rounded text-xs">
                                            <MapPin className="w-3 h-3 opacity-70" />
                                            {tournament.location || "Local Store"}
                                        </span>
                                        <span className="flex items-center gap-1.5 text-xs opacity-60">
                                            Played as: <span className="text-slate-300 font-medium">{tournament.played_as}</span>
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 pl-2 sm:pl-0 sm:text-right border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0 mt-1 sm:mt-0">
                                    {/* Rank Badge - Placeholder for now, hardcoded or needs data */}
                                    <div className="flex flex-col items-end">
                                        {/* <div className="text-[10px] uppercase text-slate-600 font-black tracking-widest mb-0.5">Result</div> */}
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 text-slate-300">
                                            <Medal className="w-4 h-4 text-slate-500" /> 
                                            <span className="text-xs font-bold">Participant</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-slate-800 rounded-xl text-center bg-slate-900/20">
                        <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                            <Filter className="w-6 h-6 text-slate-600" />
                        </div>
                        <p className="text-slate-400 font-medium">No tournaments found.</p>
                        <p className="text-sm text-slate-600 mt-1">Try adjusting your search or filters.</p>
                        {searchQuery && (
                            <button 
                                onClick={() => { setSearchQuery(""); setFilterStatus("all"); }}
                                className="mt-4 text-xs text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wide"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
