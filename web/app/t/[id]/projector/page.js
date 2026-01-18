
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { Loader2, Trophy, Swords, GitBranch, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// Views
// 1. Standings (Top 16)
// 2. Current Matches (Active Round)
// 3. Bracket (If Top Cut)

export default function ProjectorPage() {
    const { id: tournamentId } = useParams();
    const [view, setView] = useState("standings"); // standings, matches, bracket
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Auto-Refresh Data every 30s
    useEffect(() => {
        fetchData();
        const interval = setInterval(() => {
            setRefreshTrigger(prev => prev + 1);
        }, 30000);
        return () => clearInterval(interval);
    }, [tournamentId, refreshTrigger]);

    // Carousel Rotation every 15s
    useEffect(() => {
        let views = ["standings", "matches"];
        if (data?.tournament?.stage === "top_cut") {
            views = ["standings", "bracket"]; // Skip Swiss pairings in Top Cut
        }

        // Immediate check: If current view is no longer valid, switch immediately
        setView(current => {
            if (!views.includes(current)) return views[0];
            return current;
        });

        const interval = setInterval(() => {
            setView(current => {
                const idx = views.indexOf(current);
                const nextIdx = (idx + 1) % views.length;
                return views[nextIdx];
            });
        }, 15000); // 15s rotation

        return () => clearInterval(interval);
    }, [data?.tournament?.stage]);

    async function fetchData() {
        if (!tournamentId) return;

        // Parallel Fetch
        const [tourneyRes, partsRes, matchesRes, standingsRes] = await Promise.all([
            supabase.from("tournaments").select("*").eq("id", tournamentId).single(),
            supabase.from("participants").select("*").eq("tournament_id", tournamentId),
            supabase.from("matches").select("*").eq("tournament_id", tournamentId),
            supabase.from("swiss_standings").select("*").eq("tournament_id", tournamentId).order("match_wins", { ascending: false }).order("buchholz", { ascending: false }).order("point_diff", { ascending: false })
        ]);

        const tournament = tourneyRes.data;
        const participants = {};
        partsRes.data?.forEach(p => participants[p.id] = p);

        // Add Rank & Calculate Losses manually
        const processedStandings = standingsRes.data?.map((p, i) => {
            const playerMatches = matchesRes.data?.filter(m =>
                m.status === 'completed' &&
                (m.participant_a_id === p.participant_id || m.participant_b_id === p.participant_id)
            ) || [];

            const losses = playerMatches.filter(m =>
                (m.participant_a_id === p.participant_id && m.winner_id !== p.participant_id && m.winner_id) ||
                (m.participant_b_id === p.participant_id && m.winner_id !== p.participant_id && m.winner_id)
            ).length;

            return { ...p, rank: i + 1, match_losses: losses };
        }) || [];

        setData({
            tournament,
            participants,
            matches: matchesRes.data || [],
            standings: processedStandings
        });
        setLoading(false);
    }

    if (loading) return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-16 h-16 animate-spin text-yellow-500" />
            <h1 className="text-2xl font-mono uppercase tracking-widest text-white/50">Loading Arena...</h1>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 overflow-hidden flex flex-col font-sans">
            {/* Header / Marquee */}
            <div className="h-24 bg-slate-900 border-b-4 border-yellow-500 flex items-center justify-between px-12 shadow-2xl z-10">
                <div className="flex items-center gap-6">
                    <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_red]" />
                    <h1 className="text-4xl font-black tracking-tighter uppercase italic bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        {data.tournament.name}
                    </h1>
                </div>
                <div className="flex items-center gap-8 text-2xl font-bold font-mono text-yellow-500/80">
                    <span className="flex items-center gap-3">
                        <RefreshCw className="w-6 h-6 animate-spin-slow opacity-50" />
                        LIVE
                    </span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative">
                {/* Background Logo/Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                    <Trophy className="w-[800px] h-[800px]" />
                </div>

                <div className="absolute inset-0 p-12 transition-all duration-700 ease-in-out">
                    {view === "standings" && <StandingsView standings={data.standings} />}
                    {view === "matches" && <MatchesView matches={data.matches} participants={data.participants} />}
                    {view === "bracket" && <BracketView matches={data.matches} participants={data.participants} />}
                </div>
            </div>

            {/* Footer / Progress Bar */}
            <div className="h-2 bg-slate-900 relative">
                <div
                    key={view}
                    className="h-full bg-yellow-500 animate-progress origin-left"
                    style={{ animationDuration: '15s' }}
                />
            </div>
            <style jsx global>{`
                @keyframes progress {
                    0% { width: 0%; }
                    100% { width: 100%; }
                }
                .animate-progress {
                    animation-name: progress;
                    animation-timing-function: linear;
                }
            `}</style>
        </div>
    );
}

function StandingsView({ standings }) {
    // Show Top 12 efficiently
    const topStandings = standings.slice(0, 12);

    return (
        <div className="h-full flex flex-col gap-8 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex items-center gap-4 text-yellow-400 mb-4">
                <Trophy className="w-12 h-12" />
                <h2 className="text-5xl font-black uppercase tracking-widest">Live Standings</h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-12 gap-4 px-8 py-4 bg-slate-900/50 text-slate-400 font-bold text-xl uppercase tracking-wider border-b border-white/10">
                    <div className="col-span-1">#</div>
                    <div className="col-span-7">Blader</div>
                    <div className="col-span-2 text-center">W-L</div>
                    <div className="col-span-2 text-center">Buchholz</div>
                </div>
                {topStandings.map((p, i) => (
                    <div key={p.participant_id} className={cn(
                        "grid grid-cols-12 gap-4 px-8 py-5 rounded-xl border items-center text-3xl font-bold shadow-lg",
                        i === 0 ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-100 scale-[1.02]" :
                            i < 4 ? "bg-slate-800/80 border-slate-700 text-white" : "bg-slate-900/50 border-slate-800 text-slate-300"
                    )}>
                        <div className="col-span-1 font-mono opacity-50">#{p.rank}</div>
                        <div className="col-span-7 truncate">{p.display_name}</div>
                        <div className="col-span-2 text-center font-mono text-green-400">{p.match_wins}-{p.match_losses}</div>
                        <div className="col-span-2 text-center font-mono opacity-70">{p.buchholz}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function MatchesView({ matches, participants }) {
    // Filter active round matches that are NOT complete
    // Find latest round number
    const maxRound = Math.max(...matches.map(m => m.swiss_round_number || 0), 0);
    // Get incomplete matches from latest round
    const activeMatches = matches.filter(m => m.swiss_round_number === maxRound && m.status !== 'completed');

    // If no active matches, show "Round Complete" message or upcoming round?
    // Let's just show the latest round even if complete, but highlight active ones.
    const roundMatches = matches.filter(m => m.swiss_round_number === maxRound);

    return (
        <div className="h-full flex flex-col gap-8 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex items-center gap-4 text-blue-400 mb-4">
                <Swords className="w-12 h-12" />
                <h2 className="text-5xl font-black uppercase tracking-widest">Round {maxRound} Pairings</h2>
            </div>

            {roundMatches.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-4xl text-slate-600 font-bold uppercase">Waiting for Round to Start...</div>
            ) : (
                <div className="grid grid-cols-2 gap-6 content-start">
                    {roundMatches.map(m => {
                        const pA = participants[m.participant_a_id];
                        const pB = participants[m.participant_b_id];
                        const isLive = m.status === 'pending';

                        return (
                            <div key={m.id} className={cn(
                                "flex items-center justify-between p-6 rounded-2xl border-l-8 shadow-xl text-3xl font-bold h-32",
                                isLive ? "bg-slate-800 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.1)]" : "bg-slate-900/50 border-slate-700 opacity-60 grayscale"
                            )}>
                                <div className="w-[40%] truncate text-right pr-4">{pA?.display_name || "BYE"}</div>
                                <div className="flex flex-col items-center justify-center px-4">
                                    <div className="text-sm font-black uppercase text-slate-500 tracking-widest mb-1">VS</div>
                                    {isLive ? (
                                        <div className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full animate-pulse border border-green-500/30">PLAYING</div>
                                    ) : (
                                        <div className="text-xl font-mono text-slate-400">{m.score_a} - {m.score_b}</div>
                                    )}
                                </div>
                                <div className="w-[40%] truncate pl-4">{pB?.display_name || "BYE"}</div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function BracketView({ matches, participants }) {
    // Simple Vertical Bracket List for Projector (Horizontal scrollers are hard)
    // Just list Top Cut Matches in tree order? 
    // Or render a simplified tree.
    // Let's filter to just Top Cut matches.
    const cutMatches = matches.filter(m => m.stage === 'top_cut').sort((a, b) => a.match_number - b.match_number);

    return (
        <div className="h-full flex flex-col gap-8 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex items-center gap-4 text-purple-400 mb-4">
                <GitBranch className="w-12 h-12" />
                <h2 className="text-5xl font-black uppercase tracking-widest">Finals Bracket</h2>
            </div>

            <div className="flex flex-wrap gap-4 items-center justify-center h-full content-center">
                {/* This layout is tricky for auto. Let's list only the LATEST active bracket matches or Finals */}
                {/* For now, just a list of the matches in a nice grid */}
                <div className="grid grid-cols-2 gap-8 w-full">
                    {cutMatches.map(m => {
                        const pA = participants[m.participant_a_id];
                        const pB = participants[m.participant_b_id];
                        const isWinner = m.status === 'completed';

                        return (
                            <div key={m.id} className={cn(
                                "flex flex-col bg-slate-800 rounded-xl border overflow-hidden",
                                isWinner ? "border-slate-700 opacity-80" : "border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)] scale-105"
                            )}>
                                <div className="bg-slate-900/50 p-2 text-center text-sm uppercase font-bold tracking-wider text-slate-500 border-b border-slate-700">
                                    Match {m.match_number}
                                </div>
                                <div className="p-4 space-y-2">
                                    <div className={cn("flex justify-between text-2xl font-bold", m.winner_id === m.participant_a_id && "text-yellow-400")}>
                                        <span>{pA?.display_name}</span>
                                        <span>{m.score_a}</span>
                                    </div>
                                    <div className={cn("flex justify-between text-2xl font-bold", m.winner_id === m.participant_b_id && "text-yellow-400")}>
                                        <span>{pB?.display_name}</span>
                                        <span>{m.score_b}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
