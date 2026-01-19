"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Medal, Trophy } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { useTournament } from "@/hooks/use-tournament";

export default function StandingsPage({ params }) {
    // Next.js 15+ / React 19: params is a Promise
    const { id: paramId } = use(params);
    const { tournament, tournamentId, loading: tLoading, error: tError } = useTournament(paramId);

    const [standings, setStandings] = useState([]);
    const [cutSize, setCutSize] = useState(0);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (tournamentId) fetchData();
    }, [tournamentId]);

    const loading = loadingData || tLoading;

    async function fetchData() {
        if (!tournamentId) return;
        setLoadingData(true);

        // Fetch Tournament Info from hook data (avoid extra request)
        setCutSize(tournament?.cut_size || 0);

        // Fetch Standings View
        const { data: stds } = await supabase
            .from("swiss_standings")
            .select("*")
            .eq("tournament_id", tournamentId)
            .order("match_wins", { ascending: false })
            .order("buchholz", { ascending: false })
            .order("point_diff", { ascending: false });

        // Fetch All Matches to build History
        const { data: allMatches } = await supabase
            .from("matches")
            .select("participant_a_id, participant_b_id, winner_id, swiss_round_number, status")
            .eq("tournament_id", tournamentId)
            .eq("stage", "swiss");

        // Process History
        // History map: playerId -> [ { result: 'W'|'L'|'D', round: 1 }, ... ]
        const historyMap = {};

        if (stds && allMatches) {
            // Initialize map
            stds.forEach(p => historyMap[p.participant_id] = []);

            // Fill map
            allMatches.forEach(m => {
                if (m.status !== 'complete') return;

                const pA = m.participant_a_id;
                const pB = m.participant_b_id;
                const win = m.winner_id;

                if (historyMap[pA]) {
                    let res = 'D';
                    if (win === pA) res = 'W';
                    else if (win === pB) res = 'L';
                    historyMap[pA].push({ round: m.swiss_round_number, result: res });
                }
                if (historyMap[pB]) {
                    let res = 'D';
                    if (win === pB) res = 'W';
                    else if (win === pA) res = 'L';
                    historyMap[pB].push({ round: m.swiss_round_number, result: res });
                }
            });

            // Sort history by round
            Object.values(historyMap).forEach(arr => arr.sort((a, b) => a.round - b.round));
        }

        // Merge History into Standings
        const enhancedStandings = stds?.map(p => ({
            ...p,
            history: historyMap[p.participant_id] || []
        })) || [];

        setStandings(enhancedStandings);
        setLoadingData(false);
    }

    // Trigger fetch when tournamentId changes
    useEffect(() => {
        if (tournamentId) fetchData();
    }, [tournamentId]);

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen bg-transparent">
            <Link href={`/t/${tournamentId}`} className="flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>

            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                    <Trophy className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Swiss Standings</h1>
                    <p className="text-muted-foreground">Live ranking and match history.</p>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-xl border bg-card text-card-foreground shadow-2xl overflow-hidden ring-1 ring-white/5">
                <div className="relative w-full overflow-x-auto">
                    <table className="w-full caption-bottom text-sm text-left min-w-[800px]">
                        <thead className="bg-muted/30">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-14 px-4 md:px-6 align-middle font-bold text-muted-foreground uppercase tracking-wider text-xs w-[80px]">Rank</th>
                                <th className="h-14 px-4 md:px-6 align-middle font-bold text-muted-foreground uppercase tracking-wider text-xs sticky left-0 bg-card z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Participant</th>
                                <th className="h-14 px-4 md:px-6 align-middle font-bold text-muted-foreground uppercase tracking-wider text-xs w-[120px] text-center whitespace-nowrap">Record (W-L)</th>
                                <th className="h-14 px-4 md:px-6 align-middle font-bold text-muted-foreground uppercase tracking-wider text-xs w-[100px] text-center">Score</th>
                                <th className="h-14 px-4 md:px-6 align-middle font-bold text-muted-foreground uppercase tracking-wider text-xs w-[100px] text-center">Buchholz</th>
                                <th className="h-14 px-4 md:px-6 align-middle font-bold text-muted-foreground uppercase tracking-wider text-xs w-[120px] text-center whitespace-nowrap">Pt. Diff</th>
                                <th className="h-14 px-4 md:px-6 align-middle font-bold text-muted-foreground uppercase tracking-wider text-xs w-[200px]">Match History</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground animate-pulse">Updating standings...</td></tr>
                            ) : standings.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No participants found.</td></tr>
                            ) : standings.map((player, index) => {
                                const rank = index + 1;
                                const isQualifying = cutSize > 0 && rank <= cutSize;

                                return (
                                    <tr
                                        key={player.participant_id}
                                        style={{ animationDelay: `${index * 50}ms` }}
                                        className={cn(
                                            "transition-colors border-b last:border-0",
                                            "animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-backwards",
                                            index === 0 ? "bg-yellow-500/10 hover:bg-yellow-500/20" :
                                                index === 1 ? "bg-slate-500/10 hover:bg-slate-500/20" :
                                                    index === 2 ? "bg-orange-700/10 hover:bg-orange-700/20" :
                                                        "hover:bg-muted/40",
                                            isQualifying && index > 2 ? "bg-primary/5 hover:bg-primary/10" : ""
                                        )}
                                    >
                                        <td className={cn(
                                            "p-4 md:p-6 align-middle font-mono font-bold text-lg",
                                            index === 0 ? "text-yellow-500" :
                                                index === 1 ? "text-slate-400" :
                                                    index === 2 ? "text-orange-600" :
                                                        "text-muted-foreground/70"
                                        )}>
                                            #{rank}
                                        </td>
                                        <td className="p-4 md:p-6 align-middle sticky left-0 bg-card z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                            <div className="flex items-center gap-3">
                                                {index === 0 && <Medal className="w-5 h-5 text-yellow-500 shrink-0" />}
                                                {index === 1 && <Medal className="w-5 h-5 text-gray-400 shrink-0" />}
                                                {index === 2 && <Medal className="w-5 h-5 text-amber-700 shrink-0" />}
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-base whitespace-nowrap">{player.display_name}</span>
                                                    {isQualifying && <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Qualified</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 md:p-6 align-middle text-center font-mono font-medium">
                                            {player.match_wins}-{player.history.filter(h => h.result === 'L').length}
                                        </td>
                                        <td className="p-4 md:p-6 align-middle text-center">
                                            <span className={cn(
                                                "font-black text-xl",
                                                index === 0 ? "text-yellow-500" :
                                                    index === 1 ? "text-slate-200" :
                                                        index === 2 ? "text-orange-200" :
                                                            "text-foreground"
                                            )}>
                                                {player.match_wins * 1.0}
                                            </span>
                                        </td>
                                        <td className="p-4 md:p-6 align-middle text-center text-muted-foreground font-mono">
                                            {player.buchholz}
                                        </td>
                                        <td className={cn("p-4 md:p-6 align-middle text-center font-mono font-bold", player.point_diff > 0 ? "text-green-500" : player.point_diff < 0 ? "text-red-500" : "text-muted-foreground")}>
                                            {player.point_diff > 0 ? `+${player.point_diff}` : player.point_diff}
                                        </td>
                                        <td className="p-4 md:p-6 align-middle">
                                            <div className="flex gap-1 flex-wrap w-[150px]">
                                                {player.history.map((h, i) => (
                                                    <div
                                                        key={i}
                                                        title={`Round ${h.round}: ${h.result === 'W' ? 'Win' : h.result === 'L' ? 'Loss' : 'Draw'}`}
                                                        className={cn(
                                                            "w-6 h-6 md:w-8 md:h-8 rounded flex items-center justify-center text-xs font-black shadow-sm border shrink-0",
                                                            h.result === 'W' ? "bg-blue-500 text-white border-blue-600" :
                                                                h.result === 'L' ? "bg-red-500 text-white border-red-600" :
                                                                    "bg-gray-500 text-white border-gray-600"
                                                        )}
                                                    >
                                                        {h.result}
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col gap-3">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground animate-pulse">Updating standings...</div>
                ) : standings.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No participants found.</div>
                ) : standings.map((player, index) => {
                    const rank = index + 1;
                    const isQualifying = cutSize > 0 && rank <= cutSize;

                    return (
                        <div
                            key={player.participant_id}
                            style={{ animationDelay: `${index * 50}ms` }}
                            className={cn(
                                "flex flex-col bg-card border rounded-lg p-4 shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-backwards",
                                isQualifying ? "border-l-4 border-l-primary" : "border-l-4 border-l-transparent"
                            )}
                        >
                            {/* Rank BG Number */}
                            <div className="absolute -right-2 -bottom-4 text-8xl font-black text-muted/10 select-none pointer-events-none">
                                {rank}
                            </div>

                            <div className="flex items-start justify-between relative z-10 mb-2">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border",
                                        index === 0 ? "bg-yellow-500 text-black border-yellow-400" :
                                            index === 1 ? "bg-slate-300 text-black border-slate-200" :
                                                index === 2 ? "bg-orange-600 text-white border-orange-500" :
                                                    "bg-muted text-muted-foreground border-transparent"
                                    )}>
                                        {rank}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-lg leading-tight">{player.display_name}</span>
                                        {isQualifying && <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Qualified</span>}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className={cn(
                                        "font-black text-2xl",
                                        index === 0 ? "text-yellow-500" :
                                            index === 1 ? "text-slate-400" :
                                                index === 2 ? "text-orange-600" :
                                                    "text-primary"
                                    )}>
                                        {player.match_wins} <span className="text-xs font-normal text-muted-foreground">Pts</span>
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs relative z-10 opacity-80">
                                <div className="bg-muted/50 p-2 rounded flex justify-between items-center">
                                    <span className="uppercase tracking-wider font-bold opacity-70">Record</span>
                                    <span className="font-mono font-bold">{player.match_wins}-{player.history.filter(h => h.result === 'L').length}</span>
                                </div>
                                <div className="bg-muted/50 p-2 rounded flex justify-between items-center">
                                    <span className="uppercase tracking-wider font-bold opacity-70">Buchholz</span>
                                    <span className="font-mono font-bold">{player.buchholz}</span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div >
    );
}
