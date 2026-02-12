import { Match, Participant } from "@/types";
import { Trophy, TrendingUp } from "lucide-react";
import { calculateStandings } from "@/lib/standings";

interface LiveStandingsProps {
    participants: Record<string, Participant>;
    matches: Match[];
}

export function LiveStandings({ participants, matches }: LiveStandingsProps) {
    const sorted = calculateStandings(participants, matches);
    const top8 = sorted.slice(0, 8); // Top 8 only for projector

    return (
        <div className="w-full flex flex-col min-h-0">
            <div className="p-4 border-b border-white/5 bg-slate-900/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-white">Live Standings</h2>
                </div>
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Top 8</p>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-2">
                {/* Header Row */}
                <div className="grid grid-cols-[2.5rem_1fr_3rem_3rem_3rem] gap-2 items-center px-2 py-1 mb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                    <div className="text-left pl-1">#</div>
                    <div className="text-left">Player</div>
                    <div>Mat</div>
                    <div>Diff</div>
                    <div>Win</div>
                </div>

                <div className="flex flex-col gap-1">
                    {top8.map((s, idx) => (
                        <div key={s.id} className="grid grid-cols-[2.5rem_1fr_3rem_3rem_3rem] gap-2 items-center p-2 rounded-lg bg-white/5 border border-white/5 relative hover:bg-white/10 group transition-all">
                            {/* Rank */}
                            <div className={`w-7 h-7 flex items-center justify-center rounded font-black text-sm shrink-0 ${idx === 0 ? 'bg-yellow-500 text-black' :
                                idx === 1 ? 'bg-slate-300 text-slate-900' :
                                    idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-500'
                                }`}>
                                {idx + 1}
                            </div>

                            {/* Name */}
                            <div className="font-bold text-white text-sm truncate group-hover:text-cyan-400 transition-colors">
                                {participants[s.id]?.display_name || "Unknown"}
                            </div>

                            {/* Matches */}
                            <div className="text-center font-mono text-xs text-slate-400">
                                {s.matchesPlayed}
                            </div>

                            {/* Diff */}
                            <div className={`text-center font-mono text-xs font-bold ${s.diff > 0 ? 'text-green-400' : s.diff < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                {s.diff > 0 ? '+' : ''}{s.diff}
                            </div>

                            {/* Wins */}
                            <div className="text-center font-black text-cyan-400 text-base font-mono leading-none">
                                {s.wins}
                            </div>
                        </div>
                    ))}

                    {top8.length === 0 && (
                        <div className="text-center text-slate-500 py-8 italic text-xs">
                            No matches played yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
