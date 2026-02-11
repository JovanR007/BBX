import { Match, Participant } from "@/types";
import { Trophy, TrendingUp } from "lucide-react";

interface LiveStandingsProps {
    participants: Record<string, Participant>;
    matches: Match[];
}

export function LiveStandings({ participants, matches }: LiveStandingsProps) {
    // 1. Calculate Standings
    // Simple heuristic: Wins > Point Diff (We don't have full Swiss buchholz logic readily reusable here without prop drilling complex objects, 
    // so we'll do a robust local calculation based on visible matches)

    // NOTE: This logic mimics the backend/hook logic but is purely client-side for immediate display
    const stats: Record<string, { id: string; wins: number; matchesPlayed: number; diff: number }> = {};

    // Init Object
    Object.keys(participants).forEach(id => {
        stats[id] = { id, wins: 0, matchesPlayed: 0, diff: 0 };
    });

    // Tally
    matches.forEach(m => {
        if (m.status === 'complete' && m.winner_id) {
            const pA = m.participant_a_id;
            const pB = m.participant_b_id;

            if (pA && stats[pA]) {
                stats[pA].matchesPlayed++;
                stats[pA].diff += (m.score_a - m.score_b);
                if (m.winner_id === pA) stats[pA].wins++;
            }

            if (pB && stats[pB]) {
                stats[pB].matchesPlayed++;
                stats[pB].diff += (m.score_b - m.score_a);
                if (m.winner_id === pB) stats[pB].wins++;
            }
        }
    });

    // Sort
    const sorted = Object.values(stats).sort((a, b) => {
        if (a.wins !== b.wins) return b.wins - a.wins;
        // Tie breaker: Diff
        return b.diff - a.diff;
    });

    const top8 = sorted.slice(0, 8); // Top 8 only for projector

    return (
        <div className="w-full flex flex-col min-h-0">
            <div className="p-6 border-b border-white/5 bg-slate-900/20">
                <div className="flex items-center gap-3 mb-1">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    <h2 className="text-xl font-black uppercase tracking-widest text-white">Live Standings</h2>
                </div>
                <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Top 8 Leaderboard</p>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-4">
                <div className="flex flex-col gap-2">
                    {top8.map((s, idx) => (
                        <div key={s.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 relative overflow-hidden transition-all hover:bg-white/10 group">
                            {/* Rank */}
                            <div className={`w-8 h-8 flex items-center justify-center rounded-lg font-black text-lg shrink-0 ${idx === 0 ? 'bg-yellow-500 text-black' :
                                idx === 1 ? 'bg-slate-300 text-slate-900' :
                                    idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-500'
                                }`}>
                                {idx + 1}
                            </div>

                            {/* Name */}
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-white truncate text-lg leading-tight group-hover:text-cyan-400 transition-colors">
                                    {participants[s.id]?.display_name || "Unknown"}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                                    {s.matchesPlayed} Matches • {s.diff > 0 ? '+' : ''}{s.diff} Diff
                                </div>
                            </div>

                            {/* W-L */}
                            <div className="text-right shrink-0">
                                <div className="text-2xl font-black text-cyan-400 font-mono leading-none">{s.wins}</div>
                                <div className="text-[10px] text-cyan-500/60 font-bold uppercase">Wins</div>
                            </div>
                        </div>
                    ))}

                    {top8.length === 0 && (
                        <div className="text-center text-slate-500 py-12 italic">
                            No matches played yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
