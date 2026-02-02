
"use client";

import Link from "next/link";
import { Users, Play, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveTournamentCardProps {
    tournament: any;
}

export function LiveTournamentCard({ tournament }: LiveTournamentCardProps) {
    const isRanked = tournament.is_ranked;
    const activeCount = tournament.participants_count || 0;

    return (
        <Link
            href={`/t/${tournament.slug || tournament.id}`}
            className="group relative block w-full"
        >
            <div className={cn(
                "relative flex items-center justify-between p-4 md:p-6 rounded-xl border transition-all duration-300 overflow-hidden",
                "bg-slate-900/40 hover:bg-slate-900/60",
                // Border effects
                isRanked
                    ? "border-red-500/20 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                    : "border-cyan-500/20 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]"
            )}>
                {/* Pulsing Border Accent */}
                <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1",
                    isRanked ? "bg-red-500" : "bg-cyan-500",
                    "group-hover:w-1.5 transition-all duration-300"
                )} />

                {/* Left: Info */}
                <div className="flex-1 min-w-0 pr-4 pl-3">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                            "relative flex h-2 w-2",
                            isRanked ? "text-red-500" : "text-cyan-500"
                        )}>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                        </span>
                        <span className={cn(
                            "text-xs font-black tracking-wider uppercase",
                            isRanked ? "text-red-500" : "text-cyan-500"
                        )}>
                            LIVE NOW
                        </span>
                        {!isRanked && (
                            <span className="text-[10px] font-bold text-cyan-500 border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                                CASUAL
                            </span>
                        )}
                    </div>

                    <h3 className="text-lg md:text-xl font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
                        {tournament.name}
                    </h3>

                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                        <div className="flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5" />
                            <span>{tournament.stores?.name || tournament.organizer?.display_name || "Community Host"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            <span>{activeCount} Active</span>
                        </div>
                    </div>
                </div>

                {/* Right: Action */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className={cn(
                        "hidden md:flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all",
                        "bg-slate-800/50 text-slate-300 group-hover:bg-cyan-500/10 group-hover:text-cyan-400"
                    )}>
                        <Play className="w-4 h-4 fill-current" />
                        Watch
                    </div>
                </div>
            </div>
        </Link>
    );
}
