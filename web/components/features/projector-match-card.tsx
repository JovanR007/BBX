import { Match, Participant } from "@/types";
import { cn } from "@/lib/utils";
import { ExternalLink, Trophy } from "lucide-react";

interface ProjectorMatchCardProps {
    match: Match;
    participants: Record<string, Participant>;
    // Stats passed in because computing them inside every card is expensive
    participantStats?: Record<string, { wins: number; losses: number }>;
}

export function ProjectorMatchCard({ match, participants, participantStats }: ProjectorMatchCardProps) {
    const pA = match.participant_a_id ? participants[match.participant_a_id] : null;
    const pB = match.participant_b_id ? participants[match.participant_b_id] : null;

    const statsA = match.participant_a_id && participantStats ? participantStats[match.participant_a_id] : null;
    const statsB = match.participant_b_id && participantStats ? participantStats[match.participant_b_id] : null;

    const isLive = match.metadata?.streaming_judge_id;
    const isCompleted = match.status === 'complete';
    const isScoringActive = !isCompleted && match.metadata?.scoring_active;

    const isPending = !isCompleted && !isScoringActive && match.participant_a_id && match.participant_b_id;

    return (
        <div className={cn(
            "flex flex-col h-full bg-slate-900 border rounded-xl overflow-hidden relative shadow-md backdrop-blur-sm group transition-all duration-300",
            isScoringActive
                ? "border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                : isPending
                    ? "border-indigo-500/30"
                    : "border-slate-800/50"
        )}>
            {/* Status Indicator - Compact */}
            {isLive && (
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded animate-pulse z-10">
                    Live
                </div>
            )}
            {!isLive && isScoringActive && (
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest rounded animate-pulse z-10 shadow-[0_0_10px_rgba(34,211,238,0.4)]">
                    Scoring
                </div>
            )}
            {isCompleted && (
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded z-10">
                    Final
                </div>
            )}

            {/* Match Content */}
            <div className="flex-1 flex flex-col justify-center p-2 gap-0.5">
                {/* Player A */}
                <PlayerRow
                    participant={pA}
                    score={match.score_a}
                    stats={statsA}
                    isWinner={isCompleted && match.winner_id === match.participant_a_id}
                    align="left"
                    compact
                />

                {/* VS Divider - Compact */}
                <div className="flex items-center gap-1 opacity-20 my-0.5">
                    <div className="h-[0.5px] bg-white/30 flex-1" />
                    <span className="font-mono font-black italic text-[9px] text-white/50 tracking-tighter">VS</span>
                    <div className="h-[0.5px] bg-white/30 flex-1" />
                </div>

                {/* Player B */}
                <PlayerRow
                    participant={pB}
                    score={match.score_b}
                    stats={statsB}
                    isWinner={isCompleted && match.winner_id === match.participant_b_id}
                    align="right"
                    compact
                />
            </div>
        </div>
    );
}

function PlayerRow({
    participant,
    score,
    stats,
    isWinner,
    align = "left",
    compact = false
}: {
    participant: Participant | null;
    score: number;
    stats: { wins: number; losses: number } | null;
    isWinner: boolean;
    align?: "left" | "right";
    compact?: boolean;
}) {
    return (
        <div className={cn("flex items-center gap-2", align === "right" && "flex-row-reverse text-right")}>
            {/* Score Box - Shrinking to w-10 */}
            <div className={cn(
                "w-10 h-10 flex items-center justify-center rounded-md text-xl font-black font-mono shadow-inner border border-white/5 relative overflow-hidden shrink-0",
                isWinner ? "bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.4)]" : "bg-black/40 text-white"
            )}>
                {score ?? "-"}
                {isWinner && <Trophy className="absolute w-4 h-4 text-black/10 -bottom-0.5 -right-0.5" />}
            </div>

            {/* Name & Stats - Smaller fonts */}
            <div className="flex flex-col flex-1 min-w-0">
                <div className={cn(
                    "text-base md:text-lg font-black uppercase tracking-tight truncate leading-tight",
                    isWinner ? "text-cyan-400" : "text-white"
                )}>
                    {participant ? participant.display_name : "TBD"}
                </div>
                {stats && (
                    <div className={cn(
                        "text-[9px] font-bold font-mono tracking-wider opacity-40 leading-none",
                        align === "right" && "ml-auto"
                    )}>
                        ({stats.wins}-{stats.losses})
                    </div>
                )}
            </div>
        </div>
    );
}
