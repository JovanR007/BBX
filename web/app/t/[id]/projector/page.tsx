
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { Loader2, Trophy, Swords, GitBranch, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import QRCode from "react-qr-code";

// Views
// 1. Standings (Top 16)
// 2. Current Matches (Active Round)
// 3. Bracket (If Top Cut)

import { LiveCameraFeed } from "@/components/features/live-camera-feed";
import { useTournament } from "@/hooks/use-tournament";

export default function ProjectorPage() {
    const { id: paramId } = useParams();
    const { tournament, tournamentId, loading: tLoading, error: tError } = useTournament(paramId as string);

    // const [tournamentId, setTournamentId] = useState(null); // Handled by hook
    const [view, setView] = useState("standings"); // standings, matches, bracket
    const [data, setData] = useState<any>(null);
    // We use "loadingData" for local fetch, and tLoading for hook.
    // To minimize refactor, let's just alias loadingData to loading where logical?
    // Projector logic is complex, I will stick to minimal change.

    // Actually, I need to fetch data AFTER tournamentId is set.
    // The previous code had `fetchData()` define `setLoading(false)`.
    // I renamed state to `loadingData`. I should verify `fetchData` uses `setLoadingData`.
    // But `fetchData` function isn't shown in the diff, it's lower down.
    // I should create a separate tool call to update fetchData usage if needed, or just keep state name `loading` to be safe.

    const [loading, setLoading] = useState(true);
    // I'll revert to using `loading` to avoid breaking downstream code.
    // But hook has `loading`.

    // Let's use `isLoading` for local data.
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Real-time Updates
    useEffect(() => {
        if (!tournamentId) return;
        fetchData(); // Use local fetch, but we need to ensure "data" is not conflicting

        // ... subscription logic ...
        const channel = supabase.channel(`projector-debug-${tournamentId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'matches' },
                (payload) => {
                    if (payload.new && (payload.new as any).tournament_id === tournamentId) {
                        setRefreshTrigger(prev => prev + 1);
                    } else if (payload.old && (payload.old as any).tournament_id === tournamentId) {
                        setRefreshTrigger(prev => prev + 1);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tournamentId]);

    // React to trigger
    useEffect(() => {
        if (refreshTrigger > 0 && tournamentId) fetchData();
    }, [refreshTrigger, tournamentId]); // Added tournamentId dep




    // React to trigger
    useEffect(() => {
        if (refreshTrigger > 0) fetchData();
    }, [refreshTrigger]);

    // Calculate Duration for CURRENT view
    const getDuration = (currentView: string, currentData: any) => {
        if (currentView === 'standings' && currentData) {
            const limit = currentData.tournament?.cut_size || 64;
            const count = Math.min(currentData.standings?.length || 0, limit);
            const totalPages = Math.ceil(count / 20) || 1;
            // Exact duration: Pages * Interval + small buffer
            return Math.max(totalPages * 5000, 10000) + 500;
        }
        if (currentView === 'matches') {
            return 15000; // 15 Seconds strict limit for Pairings
        }
        if (currentView === 'results') {
            return 60000; // 1 minute for Final Results
        }
        return 30000; // Default 30s for other views
    };

    const durationMs = getDuration(view, data);
    const progressDuration = `${durationMs}ms`;

    // Dynamic Rotation Effect
    useEffect(() => {
        if (!data) return;

        let views = ["standings"];
        const swissMatches = data.matches?.filter((m: any) => m.stage === 'swiss') || [];
        const topCutMatches = data.matches?.filter((m: any) => m.stage === 'top_cut') || [];

        // Active Swiss check
        const hasActiveSwiss = swissMatches.some((m: any) => m.status !== 'complete');
        const hasTopCut = topCutMatches.length > 0;
        const isTournamentComplete = data.tournament.status === 'complete' || (hasTopCut && topCutMatches.every((m: any) => m.status === 'complete'));

        if (isTournamentComplete) {
            views.push("results");
        } else if (hasActiveSwiss || (!hasTopCut && swissMatches.length > 0)) {
            views.push("matches");
        } else if (hasTopCut) {
            views.push("bracket");
        } else {
            views.push("matches");
        }

        // Ensure current view is valid
        if (!views.includes(view)) {
            setView(views[0]);
            return;
        }

        const timeout = setTimeout(() => {
            setView((current: string) => {
                const idx = views.indexOf(current);
                const nextIdx = (idx + 1) % views.length;
                return views[nextIdx];
            });
        }, durationMs);

        return () => clearTimeout(timeout);
    }, [view, data, durationMs]); // Re-run when view changes (new timeout) or data updates

    async function fetchData() {
        if (!tournamentId) return;

        // Parallel Fetch
        const [tourneyRes, partsRes, matchesRes, standingsRes] = await Promise.all([
            supabase.from("tournaments").select("*").eq("id", tournamentId).single(),
            supabase.from("participants").select("*").eq("tournament_id", tournamentId),
            supabase.from("matches").select("*").eq("tournament_id", tournamentId),
            supabase.from("swiss_standings").select("*").eq("tournament_id", tournamentId).order("match_wins", { ascending: false }).order("point_diff", { ascending: false }).order("buchholz", { ascending: false })
        ]);

        const tournament = tourneyRes.data;
        const participants: any = {};
        partsRes.data?.forEach((p: any) => participants[p.id] = p);

        // Add Rank & Calculate Losses manually
        const processedStandings = standingsRes.data?.map((p: any, i: number) => {
            const playerMatches = matchesRes.data?.filter((m: any) =>
                m.status === 'complete' &&
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


    // Helper to get descriptive stage name
    const getCurrentStageLabel = () => {
        if (view === 'standings') return 'Standings';
        if (view === 'bracket') {
            const cutSize = data?.tournament?.cut_size || 4;
            const topCutMatches = data?.matches?.filter((m: any) => m.stage === 'top_cut' && m.status === 'pending') || [];
            if (topCutMatches.length === 0) return 'Elimination';

            // Find the "current" round being played (lowest match number usually implies order)
            // Or grouping by round. Let's look at the first pending match.
            const nextMatch = topCutMatches.sort((a: any, b: any) => a.match_number - b.match_number)[0];
            const roundNum = nextMatch.bracket_round;
            const matchNum = nextMatch.match_number; // Needed for 3rd place check if implemented same way

            // Logic duplicated from BracketView (could be extracted but inline is fine for now)
            const totalRounds = Math.ceil(Math.log2(cutSize));
            const roundsFromFinal = totalRounds - roundNum;

            if (roundsFromFinal <= 0) {
                if (matchNum === 2) return "3rd Place"; // Context dependent, but let's stick to standard
                return "Grand Finals";
            }
            if (roundsFromFinal === 1) return "Semi Finals";
            if (roundsFromFinal === 2) return "Quarter Finals";
            return `Round of ${Math.pow(2, roundsFromFinal + 1)}`;
        }
        // Match View (Swiss)
        return data?.matches ? `Round ${Math.max(...data.matches.map((m: any) => m.swiss_round_number || 0), 0)}` : '-';
    };

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

            {/* Right Sidebar (Stats & QR) - HIDDEN ON MOBILE */}
            <div className="hidden lg:flex absolute top-48 right-8 bottom-8 w-60 flex-col justify-end gap-6 z-50 pointer-events-none">

                {/* Stats Cards (Fills the top space) */}
                <div className="flex-1 flex flex-col gap-4 pt-4 justify-center">
                    {/* Current Round Card - HIDDEN if showing Standings during Elimination */}
                    {!(view === 'standings' && data?.matches?.some((m: any) => m.stage === 'top_cut')) && (
                        <div className="bg-slate-900/90 border-l-4 border-blue-500 p-4 rounded-xl shadow-lg animate-in slide-in-from-right-10 duration-700 delay-100 backdrop-blur-sm">
                            <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Current Stage</div>
                            <div className="text-3xl font-black text-white italic leading-none py-1">
                                {getCurrentStageLabel()}
                            </div>
                        </div>
                    )}

                    {/* Dynamic Card 2: Players vs Survivors */}
                    <div className={cn(
                        "bg-slate-900/90 border-l-4 p-4 rounded-xl shadow-lg animate-in slide-in-from-right-10 duration-700 delay-200 backdrop-blur-sm",
                        view === 'bracket' ? "border-red-500" : "border-purple-500"
                    )}>
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
                            {view === 'bracket' ? "Remaining" : "Players"}
                        </div>
                        <div className="text-3xl font-black text-white italic">
                            {view === 'bracket' ? (() => {
                                // Calculate remaining players based on round
                                const cutSize = data?.tournament?.cut_size || 4;
                                const topCutMatches = data?.matches?.filter((m: any) => m.stage === 'top_cut' && m.status === 'pending') || [];
                                const nextMatch = topCutMatches.sort((a: any, b: any) => a.match_number - b.match_number)[0];
                                if (!nextMatch) return 2; // Finals or just 2
                                const totalRounds = Math.ceil(Math.log2(cutSize));
                                const roundsFromFinal = totalRounds - nextMatch.bracket_round;
                                return Math.pow(2, roundsFromFinal + 1);
                            })() : Object.keys(data?.participants || {}).length}
                            <span className="text-sm font-normal text-slate-500 ml-2 not-italic">
                                {view === 'bracket' ? "Contenders" : "Registered"}
                            </span>
                        </div>
                    </div>

                    {/* Dynamic Card 3: Format vs Stakes */}
                    <div className="bg-slate-900/90 border-l-4 border-yellow-500 p-4 rounded-xl shadow-lg animate-in slide-in-from-right-10 duration-700 delay-300 backdrop-blur-sm">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
                            {view === 'bracket' ? "Stakes" : "Format"}
                        </div>
                        <div className="text-3xl font-black text-white italic">
                            {view === 'bracket' ? "Elimination" :
                                <>Top {data?.tournament?.cut_size || '-'}</>
                            }
                            <span className="text-sm font-normal text-slate-500 ml-2 not-italic">
                                {view === 'bracket' ? "Mode" : "Cut"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* QR Code (Bottom) */}
                <div className="bg-white p-2 rounded-lg shadow-2xl animate-in slide-in-from-right-10 duration-1000 mb-4 shrink-0 pointer-events-auto">
                    <div className="flex flex-col items-center gap-2">
                        <QRCode
                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/t/${tournamentId}/standings`}
                            size={240}
                            style={{ width: "100%", height: "auto" }}
                        />
                        <span className="text-black font-bold text-xs uppercase tracking-widest">Scan for Standings</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative">
                {/* Background Logo/Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                    <Trophy className="w-[800px] h-[800px]" />
                </div>

                <div className="absolute inset-0 p-4 lg:pl-8 lg:pt-8 lg:pb-12 lg:pr-72 transition-all duration-700 ease-in-out">
                    {(() => {
                        const streamingMatch = data?.matches?.find((m: any) => m.metadata?.streaming_judge_id);
                        if (streamingMatch) {
                            return <LiveCameraFeed matchId={streamingMatch.id} />;
                        }
                        return (
                            <>
                                {view === "bracket" && <BracketView matches={data.matches} participants={data.participants} cutSize={data.tournament.cut_size} />}
                                {view === "matches" && <MatchesView matches={data.matches} participants={data.participants} />}
                                {view === "standings" && <StandingsView standings={data.standings} cutSize={data.tournament.cut_size} />}
                                {view === "results" && <FinalResultsView data={data} />}
                            </>
                        );
                    })()}
                </div>
            </div>

            {/* Footer / Progress Bar */}
            <div className="h-2 bg-slate-900 relative">
                <div
                    key={view}
                    className="h-full bg-yellow-500 animate-progress origin-left"
                    style={{ animationDuration: progressDuration }}
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

function StandingsView({ standings, cutSize }: { standings: any[], cutSize: number }) {
    // Show Top X based on Cut Size (default 32 if not set, or limit to 20 if small screen? User asked for match.)
    // Let's cap at max 64 for now, but default to cutSize.
    const limit = cutSize || 64; // Default to 64 to allow pagination to show more players
    const topStandings = standings.slice(0, limit);

    // Pagination Logic
    const PAGE_SIZE = 20; // 10 per column
    const totalPages = Math.ceil(topStandings.length / PAGE_SIZE);
    const [page, setPage] = useState(0);

    // Auto-cycle pages
    useEffect(() => {
        if (totalPages <= 1) return;
        // Reset page when view mounts/props change
        setPage(0);

        const interval = setInterval(() => {
            setPage(p => {
                const next = p + 1;
                if (next >= totalPages) return p; // Stop at last page
                return next;
            });
        }, 5000); // 5 seconds per page
        return () => clearInterval(interval);
    }, [totalPages]);

    // Current slice
    const currentData = topStandings.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    // Split into 2 columns
    const midPoint = Math.ceil(currentData.length / 2);
    const col1 = currentData.slice(0, midPoint);
    const col2 = currentData.slice(midPoint);

    // Helper to calculate actual offset including page
    const renderRow = (p: any, i: number, colOffset: number) => {
        const globalIndex = (page * PAGE_SIZE) + i + colOffset;
        return (
            <div key={p.participant_id} className={cn(
                "grid grid-cols-12 gap-1 px-4 py-1.5 rounded border items-center text-lg font-bold shadow-sm", // Compact styling
                i + colOffset === 0 && page === 0 ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-100" :
                    (globalIndex < 4 && page === 0) ? "bg-slate-800/80 border-slate-700 text-white" : "bg-slate-900/50 border-slate-800 text-slate-300"
            )}>
                <div className="col-span-2 font-mono opacity-50 text-right pr-4">#{p.rank}</div>
                <div className="col-span-4 truncate">{p.display_name}</div>
                <div className="col-span-2 text-center font-mono text-green-400">{p.match_wins}-{p.match_losses}</div>
                <div className="col-span-2 text-center font-mono text-yellow-500/80">{p.point_diff > 0 ? `+${p.point_diff}` : p.point_diff}</div>
                <div className="col-span-2 text-center font-mono opacity-50">{p.buchholz}</div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col gap-4 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex items-center justify-between text-yellow-400 mb-2">
                <div className="flex items-center gap-4">
                    <Trophy className="w-10 h-10" />
                    <h2 className="text-4xl font-black uppercase tracking-widest">Swiss Standings</h2>
                </div>
                {totalPages > 1 && (
                    <div className="text-2xl font-mono text-slate-500 font-bold">
                        Page {page + 1} / {totalPages}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 h-full content-start overflow-y-auto lg:overflow-hidden">
                {/* Column 1 */}
                <div className="flex flex-col gap-2">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-1 px-4 py-1 bg-slate-900/50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-white/10 mb-1">
                        <div className="col-span-2 text-right pr-4">#</div>
                        <div className="col-span-4">Blader</div>
                        <div className="col-span-2 text-center">W-L</div>
                        <div className="col-span-2 text-center">PD</div>
                        <div className="col-span-2 text-center">BH</div>
                    </div>
                    {col1.map((p, i) => renderRow(p, i, 0))}
                </div>

                {/* Column 2 */}
                <div className="flex flex-col gap-2">
                    {/* Header Repeated */}
                    <div className="grid grid-cols-12 gap-1 px-4 py-1 bg-slate-900/50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-white/10 mb-1">
                        <div className="col-span-2 text-right pr-4">#</div>
                        <div className="col-span-4">Blader</div>
                        <div className="col-span-2 text-center">W-L</div>
                        <div className="col-span-2 text-center">PD</div>
                        <div className="col-span-2 text-center">BH</div>
                    </div>
                    {col2.map((p, i) => renderRow(p, i, midPoint))}
                </div>
            </div>
        </div>
    )
}

function MatchesView({ matches, participants }: { matches: any[], participants: any }) {
    // Filter active round matches that are NOT complete
    // Find latest round number
    const maxRound = Math.max(...matches.map(m => m.swiss_round_number || 0), 0);

    // QUEUE LOGIC:
    // Only show Active (Pending) matches from current round.
    // FILTER FIX: Status is 'complete' (no d) in DB for finished matches.
    const activeMatches = matches
        .filter(m => m.swiss_round_number === maxRound && m.status !== 'complete')
        .sort((a: any, b: any) => a.match_number - b.match_number);

    const displayMatches = activeMatches.slice(0, 6);
    const queueCount = Math.max(0, activeMatches.length - 6);

    return (
        <div className="h-full flex flex-col gap-4 lg:gap-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex items-center justify-between text-blue-400 mb-2 shrink-0">
                <div className="flex items-center gap-3 lg:gap-4">
                    <Swords className="w-8 h-8 lg:w-12 lg:h-12" />
                    <h2 className="text-3xl lg:text-5xl font-black uppercase tracking-widest">Round {maxRound} Pairings</h2>
                </div>
                {queueCount > 0 && (
                    <div className="px-4 py-1 lg:px-6 lg:py-2 bg-blue-600 text-white rounded-full text-base lg:text-xl font-bold border-2 border-blue-400 shadow-[0_0_20px_blue] animate-pulse">
                        +{queueCount} MORE MATCHES IN QUEUE
                    </div>
                )}
            </div>

            {activeMatches.length === 0 ? (
                // Check if actually complete or just waiting
                <div className="flex-1 flex flex-col items-center justify-center gap-8 text-slate-600">
                    <div className="text-8xl animate-bounce">🏁</div>
                    <div className="text-4xl lg:text-6xl font-bold uppercase">Round {maxRound} Complete</div>
                    <p className="text-2xl lg:text-3xl opacity-50 font-mono">Waiting for next round...</p>
                </div>
            ) : (
                // Use auto rows on mobile to allow scrolling (h-full is constrained by parent flex-1)
                // But we want natural height scrolling.
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-rows-3 gap-6 flex-1 h-full pb-2 overflow-y-auto lg:overflow-visible p-1">
                    {displayMatches.map((m, idx) => {
                        const pA = participants[m.participant_a_id];
                        const pB = participants[m.participant_b_id];

                        // Swiss King Logic: Round 5+, Table 1 (Index 0)
                        const isSwissKing = idx === 0 && maxRound >= 5;

                        return (
                            <div key={m.id} className={cn(
                                "flex flex-col relative overflow-hidden rounded-xl border shadow-xl transition-all animate-in zoom-in-50 duration-300 slide-in-from-bottom-4 group shrink-0 min-h-[140px]",
                                isSwissKing
                                    ? "bg-gradient-to-br from-yellow-900/40 to-slate-900 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.2)]"
                                    : "bg-slate-800 border-slate-700"
                            )}>
                                {isSwissKing && (
                                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent animate-pulse" />
                                )}

                                {/* Top Bar: Match Number */}
                                <div className={cn(
                                    "px-4 py-1 flex justify-between items-center border-b shrink-0",
                                    isSwissKing ? "bg-yellow-500/10 border-yellow-500/30" : "bg-slate-900/80 border-white/5"
                                )}>
                                    {isSwissKing ? (
                                        <span className="flex items-center gap-2 font-black text-[10px] lg:text-xs text-yellow-500 uppercase tracking-widest animate-pulse">
                                            <Trophy className="w-3 h-3" /> Battle for Swiss King
                                        </span>
                                    ) : (
                                        <span />
                                    )}
                                    <span className={cn(
                                        "font-mono text-[10px] lg:text-xs font-bold uppercase tracking-widest",
                                        isSwissKing ? "text-yellow-200" : "text-slate-400"
                                    )}>
                                        Match {m.match_number}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between flex-1 px-4 lg:px-6 py-2 min-h-0">
                                    {/* Player A */}
                                    <div className="w-[42%] text-right flex flex-col justify-center">
                                        <div className={cn(
                                            "text-base lg:text-3xl font-black truncate tracking-tight leading-snug drop-shadow-md",
                                            isSwissKing ? "text-yellow-100" : "text-white"
                                        )}>
                                            {pA?.display_name || "BYE"}
                                        </div>
                                        {/* Live Score A */}
                                        <div className="text-xl lg:text-2xl font-mono font-bold text-blue-400 mt-1">
                                            {m.score_a || 0} <span className="text-xs lg:text-sm opacity-50 text-slate-400">PTS</span>
                                        </div>
                                    </div>

                                    {/* CENTER: VS */}
                                    <div className="flex flex-col items-center justify-center w-[16%]">
                                        <div className={cn(
                                            "text-lg lg:text-2xl font-black italic opacity-50",
                                            isSwissKing ? "text-yellow-600" : "text-slate-600"
                                        )}>VS</div>
                                    </div>

                                    {/* Player B */}
                                    <div className="w-[42%] text-left flex flex-col justify-center">
                                        <div className={cn(
                                            "text-xl lg:text-3xl font-black truncate tracking-tight leading-snug drop-shadow-md",
                                            isSwissKing ? "text-yellow-100" : "text-white"
                                        )}>
                                            {pB?.display_name || "BYE"}
                                        </div>
                                        {/* Live Score B */}
                                        <div className="text-xl lg:text-2xl font-mono font-bold text-blue-400 mt-1">
                                            {m.score_b || 0} <span className="text-xs lg:text-sm opacity-50 text-slate-400">PTS</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Status Status */}
                                <div className={cn(
                                    "py-1 text-center border-t shrink-0",
                                    isSwissKing ? "bg-yellow-500/20 border-yellow-500/30" : "bg-green-500/10 border-green-500/20"
                                )}>
                                    <span className={cn(
                                        "text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse",
                                        isSwissKing ? "text-yellow-400" : "text-green-400"
                                    )}>
                                        • Live •
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function BracketView({ matches, participants, cutSize }: { matches: any[], participants: any, cutSize: number }) {
    // Helper to determine round name
    function getRoundLabel(roundNum: number, matchNum: number) {
        if (!cutSize) return `Round ${roundNum}`;
        const totalRounds = Math.ceil(Math.log2(cutSize || 4));
        const roundsFromFinal = totalRounds - roundNum;

        if (roundsFromFinal <= 0) {
            if (matchNum === 2) return "3rd Place Match";
            return "Grand Finals";
        }
        if (roundsFromFinal === 1) return "Semifinals";
        if (roundsFromFinal === 2) return "Quarterfinals";
        return `Round of ${Math.pow(2, roundsFromFinal + 1)}`;
    }

    const activeMatches = matches
        .filter(m => m.stage === 'top_cut' && m.status === 'pending')
        .sort((a: any, b: any) => a.match_number - b.match_number);

    // Limit to 6 to match Swiss View
    const displayMatches = activeMatches.slice(0, 6);
    const queueCount = Math.max(0, activeMatches.length - 6);

    const hasTopCutHistory = matches.some(m => m.stage === 'top_cut');

    if (activeMatches.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in duration-500 text-slate-400">
                <Swords className="w-24 h-24 opacity-20" />
                {hasTopCutHistory ? (
                    <>
                        <h2 className="text-4xl font-black uppercase tracking-widest opacity-40">Round Complete</h2>
                        <p className="text-xl font-mono opacity-30">Waiting for next elimination round pairings...</p>
                    </>
                ) : (
                    <>
                        <h2 className="text-4xl font-black uppercase tracking-widest opacity-40">Swiss Stage In Progress</h2>
                        <p className="text-xl font-mono opacity-30">Elimination Bracket will appear after cuts.</p>
                    </>
                )}
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col gap-4 lg:gap-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex items-center justify-between text-purple-400 mb-2 shrink-0">
                <div className="flex items-center gap-3 lg:gap-4">
                    <GitBranch className="w-8 h-8 lg:w-12 lg:h-12" />
                    <h2 className="text-3xl lg:text-5xl font-black uppercase tracking-widest">Elimination Stage</h2>
                </div>
                {queueCount > 0 && (
                    <div className="px-4 py-1 lg:px-6 lg:py-2 bg-purple-600 text-white rounded-full text-base lg:text-xl font-bold border-2 border-purple-400 shadow-[0_0_20px_purple] animate-pulse">
                        +{queueCount} MORE MATCHES IN QUEUE
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-rows-3 gap-6 flex-1 h-full pb-2 overflow-y-auto lg:overflow-visible p-1">
                {displayMatches.map(m => {
                    const pA = participants[m.participant_a_id];
                    const pB = participants[m.participant_b_id];
                    const roundLabel = getRoundLabel(m.bracket_round, m.match_number);

                    return (
                        <div key={m.id} className={cn(
                            "flex flex-col relative overflow-hidden rounded-xl border border-slate-700 shadow-xl transition-all animate-in zoom-in-50 duration-300 slide-in-from-bottom-4 group shrink-0 min-h-[140px]", // Added min-h and shrink-0
                            "bg-slate-800"
                        )}>
                            {/* Top Bar: Round & Match Info */}
                            <div className="bg-slate-900/80 px-4 py-1 flex justify-between items-center border-b border-white/5 shrink-0">
                                <span className="font-bold text-[10px] lg:text-xs text-purple-400 uppercase tracking-wider">
                                    {roundLabel}
                                </span>
                                <span className="font-mono text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    Match {m.match_number}
                                </span>
                            </div>

                            <div className="flex items-center justify-between flex-1 px-4 lg:px-6 py-2 min-h-0">
                                {/* Player A */}
                                <div className="w-[42%] text-right flex flex-col justify-center">
                                    <div className="text-base lg:text-3xl font-black truncate text-white tracking-tight leading-snug drop-shadow-md">
                                        {pA?.display_name || "TBD"}
                                    </div>
                                    <div className="text-xs lg:text-sm font-mono text-slate-500 opacity-50">{m.score_a || 0} Pts</div>
                                </div>

                                {/* CENTER: VS */}
                                <div className="flex flex-col items-center justify-center w-[16%]">
                                    <div className="text-lg lg:text-2xl font-black text-slate-600 italic opacity-50">VS</div>
                                </div>

                                {/* Player B */}
                                <div className="w-[42%] text-left flex flex-col justify-center">
                                    <div className="text-xl lg:text-3xl font-black truncate text-white tracking-tight leading-snug drop-shadow-md">
                                        {pB?.display_name || "TBD"}
                                    </div>
                                    <div className="text-xs lg:text-sm font-mono text-slate-500 opacity-50">{m.score_b || 0} Pts</div>
                                </div>
                            </div>

                            {/* Status Footer */}
                            <div className="bg-purple-500/10 py-1 text-center border-t border-purple-500/20 shrink-0">
                                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.2em] animate-pulse">
                                    • Fighting Now •
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function FinalResultsView({ data }: { data: any }) {
    // 1. Find Swiss King (First in standings)
    const swissKing = data.standings && data.standings.length > 0 ? data.standings[0] : null;

    // 2. Find Podiums (Top 3)
    const topCutMatches = data.matches?.filter((m: any) => m.stage === 'top_cut') || [];
    const participants = data.participants;

    if (topCutMatches.length === 0) return null;

    const cutSize = data.tournament.cut_size || 4;
    const totalRounds = Math.ceil(Math.log2(cutSize));

    // Grand Final is the match in the last round that is NOT the 3rd place match
    // Typically Match 1 in latest round
    const grandFinal = topCutMatches.find((m: any) => m.bracket_round === totalRounds && m.match_number === 1);
    const thirdPlaceMatch = topCutMatches.find((m: any) => m.bracket_round === totalRounds && m.match_number === 2);

    let champion = null;
    let runnerUp = null;
    let thirdPlace = null;

    if (grandFinal && grandFinal.winner_id) {
        champion = participants[grandFinal.winner_id];
        runnerUp = participants[grandFinal.winner_id === grandFinal.participant_a_id ? grandFinal.participant_b_id : grandFinal.participant_a_id];
    }

    if (thirdPlaceMatch && thirdPlaceMatch.winner_id) {
        thirdPlace = participants[thirdPlaceMatch.winner_id];
    } else if (!thirdPlaceMatch) {
        // If no 3rd place match, maybe Semi-Final losers? (Implied 3rd/4th)
        // For now, simpler to just show Champion & Runner Up if no 3rd place match defined
    }

    return (
        <div className="h-full flex flex-col items-center justify-center animate-in zoom-in duration-1000">
            {/* Header */}
            <div className="mb-8 text-center">
                <h1 className="text-6xl lg:text-8xl font-black uppercase italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-white to-yellow-600 drop-shadow-[0_0_25px_rgba(234,179,8,0.5)]">
                    Tournament Complete
                </h1>
                <p className="text-2xl font-mono text-slate-400 tracking-[1em] mt-4 uppercase">Final Standings</p>
            </div>

            <div className="flex flex-wrap items-end justify-center gap-8 lg:gap-16 w-full max-w-7xl">

                {/* 2nd Place */}
                {runnerUp && (
                    <div className="flex flex-col items-center gap-4 order-2 lg:order-1 animate-in slide-in-from-left-20 duration-1000 delay-300">
                        <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-full border-4 border-slate-400 bg-slate-800 flex items-center justify-center shadow-[0_0_30px_rgba(148,163,184,0.3)] relative overflow-hidden">
                            {/* Placeholder for Avatar */}
                            <div className="text-6xl font-black text-slate-600 uppercase">{runnerUp.display_name.substring(0, 2)}</div>
                            <div className="absolute inset-x-0 bottom-0 bg-slate-400/20 h-1/2 backdrop-blur-sm" />
                        </div>
                        <div className="text-center">
                            <div className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-1">2nd Place</div>
                            <div className="text-3xl lg:text-4xl font-black text-white">{runnerUp.display_name}</div>
                        </div>
                    </div>
                )}

                {/* Champion */}
                {champion && (
                    <div className="flex flex-col items-center gap-6 order-1 lg:order-2 z-10 -mt-12 lg:-mt-24 animate-in zoom-in-50 duration-1000 delay-500">
                        <div className="relative">
                            <Trophy className="w-24 h-24 lg:w-32 lg:h-32 text-yellow-500 absolute -top-12 -right-12 animate-bounce drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]" />
                            <div className="w-64 h-64 lg:w-80 lg:h-80 rounded-full border-8 border-yellow-500 bg-gradient-to-br from-slate-900 to-black flex items-center justify-center shadow-[0_0_100px_rgba(234,179,8,0.4)] relative overflow-hidden">
                                <div className="text-8xl font-black text-yellow-500/20 uppercase">{champion.display_name.substring(0, 2)}</div>
                                <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/20 to-transparent" />
                            </div>
                        </div>

                        <div className="text-center relative">
                            <div className="absolute -inset-8 bg-yellow-500/20 blur-2xl rounded-full" />
                            <div className="text-lg font-black uppercase tracking-[0.5em] text-yellow-500 mb-2 relative">Champion</div>
                            <div className="text-5xl lg:text-7xl font-black text-white relative drop-shadow-xl">{champion.display_name}</div>
                        </div>
                    </div>
                )}

                {/* 3rd Place / Swiss King */}
                <div className="flex flex-col gap-8 order-3 lg:order-3 animate-in slide-in-from-right-20 duration-1000 delay-700">

                    {thirdPlace && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-full border-4 border-amber-700 bg-slate-800 flex items-center justify-center shadow-[0_0_30px_rgba(180,83,9,0.3)] relative overflow-hidden">
                                <div className="text-6xl font-black text-amber-900 uppercase">{thirdPlace.display_name.substring(0, 2)}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm font-bold uppercase tracking-widest text-amber-700 mb-1">3rd Place</div>
                                <div className="text-3xl lg:text-4xl font-black text-white">{thirdPlace.display_name}</div>
                            </div>
                        </div>
                    )}

                    {/* Swiss King Card */}
                    {swissKing && (
                        <div className="bg-slate-900/80 border border-yellow-500/30 p-4 rounded-xl flex items-center gap-4 shadow-lg backdrop-blur-sm">
                            <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-500">
                                <Trophy className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-yellow-500">Swiss King (1st Seed)</div>
                                <div className="text-xl font-bold text-white">{swissKing.display_name}</div>
                                <div className="text-xs font-mono text-slate-500">{swissKing.match_wins} Wins • {swissKing.buchholz} BH</div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
