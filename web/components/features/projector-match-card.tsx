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

    return (
        <div className={cn(
            "flex flex-col h-full bg-slate-900/50 border rounded-3xl overflow-hidden relative shadow-2xl backdrop-blur-sm group transition-all duration-500",
            isScoringActive
                ? "border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] animate-pulse"
                : "border-slate-800 hover:border-cyan-500/30"
        )}>
            {/* Status Indicator */}
            {isLive && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-red-600 text-white text-xs font-black uppercase tracking-widest rounded-full animate-pulse z-10 shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                    Live
                </div>
            )}
            {!isLive && isScoringActive && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-cyan-500 text-black text-xs font-black uppercase tracking-widest rounded-full animate-pulse z-10 shadow-[0_0_15px_rgba(34,211,238,0.5)]">
                    Scoring
                </div>
            )}
            {isCompleted && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-slate-700 text-slate-300 text-xs font-black uppercase tracking-widest rounded-full z-10">
                    Final
                </div>
            )}

            {/* Match Content */}
            <div className="flex-1 flex flex-col justify-center p-8 gap-8">
                {/* Player A */}
                <PlayerRow
                    participant={pA}
                    score={match.score_a}
                    stats={statsA}
                    isWinner={isCompleted && match.winner_id === match.participant_a_id}
                    align="left"
                />

                {/* VS Divider */}
                <div className="flex items-center gap-4 opacity-30">
                    <div className="h-px bg-white/50 flex-1" />
                    <span className="font-mono font-black italic text-2xl text-white">VS</span>
                    <div className="h-px bg-white/50 flex-1" />
                </div>

                {/* Player B */}
                <PlayerRow
                    participant={pB}
                    score={match.score_b}
                    stats={statsB}
                    isWinner={isCompleted && match.winner_id === match.participant_b_id}
                    align="right"
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
    align = "left"
}: {
    participant: Participant | null;
    score: number;
    stats: { wins: number; losses: number } | null;
    isWinner: boolean;
    align?: "left" | "right";
}) {
    return (
        <div className={cn("flex items-center gap-6", align === "right" && "flex-row-reverse text-right")}>
            {/* Score Box */}
            <div className={cn(
                "w-20 h-20 flex items-center justify-center rounded-2xl text-4xl font-black font-mono shadow-inner border border-white/5 relative overflow-hidden",
                isWinner ? "bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]" : "bg-black/40 text-white"
            )}>
                {score ?? "-"}
                {isWinner && <Trophy className="absolute w-12 h-12 text-black/10 -bottom-2 -right-2" />}
            </div>

            {/* Name & Stats */}
            <div className="flex flex-col flex-1 min-w-0">
                <div className={cn(
                    "text-3xl font-black uppercase tracking-tight truncate leading-none mb-1",
                    isWinner ? "text-cyan-400" : "text-white"
                )}>
                    {participant ? participant.display_name : "TBD"}
                </div>
                {stats && (
                    <div className={cn(
                        "text-lg font-bold font-mono tracking-wider opacity-60",
                        align === "right" && "ml-auto"
                    )}>
                        ({stats.wins}-{stats.losses})
                    </div>
                )}
            </div>
        </div>
    );
}
