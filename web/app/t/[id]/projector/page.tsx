"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useBracketData } from "@/hooks/use-bracket-data";
import { BracketConnector } from "@/components/features/bracket-connector";
import { SingleEliminationBracket, Match as CustomMatch } from "react-tournament-brackets";
import { ProjectorMatchCard } from "@/components/features/projector-match-card";
import { LiveStandings } from "@/components/features/live-standings";
import { Match, Participant } from "@/types";
import { QRCodeDisplay } from "@/components/features/qr-code";
import { Loader2, Crown, Trophy, Maximize2, Minimize2, LogOut, Medal, Sparkles } from "lucide-react";
import { BrandedContainer } from "@/components/features/branded-container";
import Link from "next/link";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const LiveCameraFeed = dynamic(() => import("@/components/features/live-camera-feed").then(mod => mod.LiveCameraFeed), { ssr: false });

// Re-use theme from BracketPage
const BeybladeTheme = {
    textColor: { main: '#E2E8F0', highlighted: '#F8FAFC', dark: '#94A3B8', disabled: '#475569' },
    matchBackground: { wonColor: '#1e293b', lostColor: '#0f172a' },
    score: {
        background: { wonColor: '#1e293b', lostColor: '#0f172a' },
        text: { highlightedWonColor: '#22c55e', highlightedLostColor: '#ef4444' }
    },
    border: {
        color: '#334155',
        highlightedColor: '#22D3EE',
    },
    roundHeader: { backgroundColor: 'transparent', fontColor: '#94A3B8' },
    connectorColor: '#334155',
    connectorColorHighlight: '#22D3EE',
    svgBackground: 'transparent',
    fontFamily: '"Inter", sans-serif',
    transitionTimingFunction: 'ease-in-out',
    disabledColor: '#475569',
    roundHeaders: { background: 'transparent' },
    canvasBackground: 'transparent'
};

// Custom Match Component for Projector (MUST be outside main component to avoid reconciliation issues)
const ProjectorMatch = ({ match }: { match: any }) => {
    const topParty = match.participants?.[0];
    const bottomParty = match.participants?.[1];
    if (!topParty || !bottomParty) return null;

    return (
        <div className="flex flex-col border border-slate-700 bg-slate-900/80 rounded w-[240px] overflow-hidden shadow-xl">
            <div className={`flex justify-between px-4 py-3 border-b border-slate-800 ${topParty.isWinner ? 'bg-green-900/20' : ''}`}>
                <span className={`text-base truncate ${topParty.isWinner ? 'text-green-400 font-bold' : 'text-slate-400'}`}>{topParty.name}</span>
                <span className="text-base font-mono font-bold">{topParty.resultText}</span>
            </div>
            <div className={`flex justify-between px-4 py-3 ${bottomParty.isWinner ? 'bg-green-900/20' : ''}`}>
                <span className={`text-base truncate ${bottomParty.isWinner ? 'text-green-400 font-bold' : 'text-slate-400'}`}>{bottomParty.name}</span>
                <span className="text-base font-mono font-bold">{bottomParty.resultText}</span>
            </div>
        </div>
    );
};

const Controls = ({ isFullscreen, toggleFullscreen, tournamentId }: { isFullscreen: boolean; toggleFullscreen: () => void; tournamentId: string }) => (
    <div className="flex gap-2">
        <button
            onClick={toggleFullscreen}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-sm"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
            {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
        </button>
        <Link
            href={`/t/${tournamentId}`}
            className="p-3 bg-red-500/10 hover:bg-red-500/20 rounded-full text-red-500 transition-all backdrop-blur-sm border border-red-500/20"
            title="Exit Projector Mode"
        >
            <LogOut className="w-6 h-6" />
        </Link>
    </div>
);

export default function ProjectorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: tournamentId } = use(params);
    const {
        loading,
        tournament,
        matches,
        participants,
        viewMode,
        derived: {
            swissMatches = [],
            topCutMatches = [],
            winner,
            runnerUp,
            thirdPlace,
            isTournamentComplete
        } = {}
    } = useBracketData(tournamentId);

    const [origin, setOrigin] = useState("");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin);
        }

        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // 0. Calculate Pagination Details
    const MATCHES_PER_PAGE = 12;
    const currentRoundNum = useMemo(() => {
        if (!swissMatches || swissMatches.length === 0) return 0;
        return Math.max(...swissMatches.map(m => m.swiss_round_number));
    }, [swissMatches]);

    const currentRoundMatches = useMemo(() => {
        if (!swissMatches) return [];
        // Filter to current round matches to show
        // AND EXCLUDE COMPLETED (User request: remove scores once done)
        return swissMatches.filter(m =>
            m.swiss_round_number === currentRoundNum &&
            m.status !== 'complete'
        );
    }, [swissMatches, currentRoundNum]);

    const totalPages = Math.ceil(currentRoundMatches.length / MATCHES_PER_PAGE);

    // Auto-Cycle Pages Every 15 Seconds
    useEffect(() => {
        // Reset page if out of bounds (e.g. matches completed)
        if (currentPage >= totalPages && totalPages > 0) {
            setCurrentPage(0);
        }

        if (totalPages <= 1) {
            // Ensure we are on page 0 if only 1 page
            if (currentPage !== 0) setCurrentPage(0);
            return;
        }

        const timer = setInterval(() => {
            setCurrentPage(prev => (prev + 1) % totalPages);
        }, 15000);

        return () => clearInterval(timer);
    }, [totalPages, currentPage]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable fullscreen: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    // ... (swissKing logic unchanged)
    const swissKing = useMemo(() => {
        if (!swissMatches || swissMatches.length === 0 || !participants) return null;
        const scores: Record<string, { wins: number }> = {};
        Object.keys(participants).forEach(pid => scores[pid] = { wins: 0 });
        swissMatches.forEach(m => {
            if (m.status !== 'complete' || !m.winner_id) return;
            if (scores[m.winner_id]) scores[m.winner_id].wins++;
        });
        const kingId = Object.keys(scores).sort((a, b) => scores[b].wins - scores[a].wins)[0];
        if (!kingId) return null;
        return { ...participants[kingId], match_wins: scores[kingId].wins, buchholz: 0 };
    }, [swissMatches, participants]);

    // Calculate total expected rounds based on cutSize (ported from BracketPage)
    const totalRounds = useMemo(() => Math.log2(tournament?.cut_size || 4), [tournament?.cut_size]);

    // Transformed matches for bracket view (COMPLEX LOGIC PORTED FROM BRACKETPAGE)
    const transformedMatches = useMemo(() => {
        if (viewMode !== 'top_cut' || !matches) return []; // Use all matches to find bracket ones

        // Filter for top Cut only mainly, but we need to generate slots
        // Actually, let's use the same logic as BracketPage:
        const cutSize = tournament?.cut_size || 4;

        // 1. Map real matches for easy lookup
        const realMatchMap = new Map<string, Match>();
        // Only look at top_cut matches
        const brackets = matches.filter(m => m.stage === 'top_cut');
        brackets.forEach(m => {
            realMatchMap.set(`${m.bracket_round}-${m.match_number}`, m);
        });

        // 2. Generate all expected slots based on cutSize
        const allSlots = [];
        const slotMap = new Map<string, string>(); // map "round-match" -> id

        for (let r = 1; r <= totalRounds; r++) {
            const matchCount = cutSize / Math.pow(2, r);
            for (let m = 1; m <= matchCount; m++) {
                const key = `${r}-${m}`;
                const realMatch = realMatchMap.get(key);
                // Use real ID if exists, else ghost ID
                const id = realMatch ? realMatch.id : `ghost-${key}`;
                allSlots.push({ key, round: r, matchNum: m, realMatch, id });
                slotMap.set(key, id);
            }
        }

        // 3. Round Naming Helper
        const getRoundName = (round: number) => {
            if (round === totalRounds) return 'Finals';
            if (round === totalRounds - 1) return 'Semifinals';
            if (round === totalRounds - 2) return 'Quarterfinals';
            return `Round ${round}`;
        };

        // 4. Build Library Objects
        return allSlots.map(slot => {
            const { round, matchNum, realMatch, id } = slot;

            // Calculate Next Match ID
            let nextMatchId = null;
            if (round < totalRounds) {
                const nextRound = round + 1;
                const nextMatchNum = Math.ceil(matchNum / 2);
                nextMatchId = slotMap.get(`${nextRound}-${nextMatchNum}`) ?? null;
            }

            const pA = realMatch?.participant_a_id ? participants[realMatch.participant_a_id] : null;
            const pB = realMatch?.participant_b_id ? participants[realMatch.participant_b_id] : null;
            const isCompleted = realMatch?.status === 'complete';

            return {
                id: id,
                name: `M${matchNum}`,
                nextMatchId: nextMatchId,
                tournamentRoundText: getRoundName(round),
                startTime: '',
                state: isCompleted ? 'DONE' : 'SCHEDULED',
                participants: [
                    {
                        id: realMatch?.participant_a_id || `tbd-a-${id}`,
                        resultText: realMatch?.score_a?.toString() ?? '-',
                        isWinner: isCompleted && realMatch?.winner_id === realMatch?.participant_a_id,
                        status: isCompleted ? (realMatch?.winner_id === realMatch?.participant_a_id ? 'WON' : 'LOST') : null,
                        name: pA?.display_name || (realMatch ? 'BYE' : 'TBD'),
                    },
                    {
                        id: realMatch?.participant_b_id || `tbd-b-${id}`,
                        resultText: realMatch?.score_b?.toString() ?? '-',
                        isWinner: isCompleted && realMatch?.winner_id === realMatch?.participant_b_id,
                        status: isCompleted ? (realMatch?.winner_id === realMatch?.participant_b_id ? 'WON' : 'LOST') : null,
                        name: pB?.display_name || (realMatch ? 'BYE' : 'TBD'),
                    }
                ]
            };
        });
    }, [matches, participants, viewMode, tournament?.cut_size, totalRounds]);

    // Calculate basic Win/Loss stats for card display
    const participantStats = useMemo(() => {
        if (!matches || !participants) return {};
        const stats: Record<string, { wins: number; losses: number }> = {};
        Object.keys(participants).forEach(id => { stats[id] = { wins: 0, losses: 0 } });

        matches.forEach(m => {
            if (m.status === 'complete' && m.winner_id) {
                if (stats[m.winner_id]) stats[m.winner_id].wins++;
                const loserId = m.winner_id === m.participant_a_id ? m.participant_b_id : m.participant_a_id;
                if (loserId && stats[loserId]) stats[loserId].losses++;
            }
        });
        return stats;
    }, [matches, participants]);

    // 0. Check for LIVE STREAM (Moved up to avoid conditional hook call)
    // Blacklist for failed streams
    const [failedStreams, setFailedStreams] = useState<string[]>([]);

    const streamingMatch = useMemo(() => {
        if (!matches) return null;
        return matches.find(m => m.metadata?.broadcaster_id && !failedStreams.includes(m.metadata.broadcaster_id));
    }, [matches, failedStreams]);

    const handleStreamError = (broadcasterId: string) => {
        console.warn("Stream failed, adding to blacklist:", broadcasterId);
        setFailedStreams(prev => [...prev, broadcasterId]);
    };

    // ProjectorMatch and Controls are now defined outside this function (module scope)

    // Loading guard — MUST be placed after all hooks to respect Rules of Hooks
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
            </div>
        );
    }

    if (streamingMatch && streamingMatch.metadata?.broadcaster_id) {
        return (
            <div className="fixed inset-0 z-50 bg-black">
                <LiveCameraFeed
                    matchId={streamingMatch.id}
                    broadcasterId={streamingMatch.metadata.broadcaster_id}
                    onError={() => handleStreamError(streamingMatch.metadata.broadcaster_id)}
                />
                {/* Overlay Controls if needed, e.g. exit */}
                <div className="absolute top-4 right-4 z-[60]">
                    <Controls isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen} tournamentId={tournamentId} />
                </div>
                {/* Optional: Overlay Scoreboard? LiveCameraFeed is usually full screen */}
            </div>
        );
    }

    // 1. Tournament Complete / Winner View (Custom Inline Layout)
    if (tournament?.status === 'completed' || (viewMode === 'top_cut' && winner)) {
        return (
            <BrandedContainer
                primaryColor={tournament?.stores?.primary_color}
                secondaryColor={tournament?.stores?.secondary_color}
                plan={tournament?.stores?.plan}
                className="min-h-screen bg-black overflow-hidden relative font-sans text-white flex flex-col"
            >
                {/* Background */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-500/10 via-slate-900 to-black pointer-events-none" />

                {/* Header */}
                <header className="p-8 w-full flex justify-between items-start z-20">
                    <div>
                        <h1 className="text-5xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 drop-shadow-sm mb-2">
                            {tournament?.name || "Tournament Complete"}
                        </h1>
                        <p className="text-slate-400 text-xl font-medium tracking-wide uppercase">
                            {tournament?.stores?.name || "Official Result"}
                        </p>
                    </div>
                    <Controls isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen} tournamentId={tournamentId} />
                </header>

                {/* Podium Area - Scaled Up */}
                <div className="flex-1 flex items-center justify-center w-full max-w-7xl mx-auto px-8 pb-12 z-10">
                    <div className="flex items-end justify-center gap-12 w-full translate-y-[-5%]">

                        {/* 2nd Place */}
                        <div className="order-1 flex flex-col items-center w-1/3 animate-in slide-in-from-bottom-12 duration-1000 delay-100">
                            <div className="flex flex-col items-center w-full">
                                <Crown className="w-16 h-16 text-slate-400 mb-4 opacity-50" />
                                <div className="w-48 h-48 rounded-full border-8 border-slate-400/30 bg-slate-400/10 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(148,163,184,0.1)]">
                                    <span className="text-7xl font-black text-slate-400">2</span>
                                </div>
                                <div className="text-center">
                                    <div className="font-bold text-4xl text-slate-200 mb-2 truncate max-w-[300px]">{runnerUp?.display_name || "TBD"}</div>
                                    <div className="text-lg font-bold text-slate-500 uppercase tracking-[0.2em]">Runner Up</div>
                                </div>
                            </div>
                        </div>

                        {/* 1st Place */}
                        <div className="order-2 flex flex-col items-center w-1/3 -mt-24 z-20 animate-in slide-in-from-bottom-24 duration-1000">
                            <div className="flex flex-col items-center w-full transform scale-110">
                                <Crown className="w-24 h-24 text-yellow-400 mb-4 animate-pulse drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
                                <div className="w-64 h-64 rounded-full border-8 border-yellow-500/50 bg-gradient-to-b from-yellow-500/20 to-yellow-900/20 flex items-center justify-center mb-6 shadow-[0_0_60px_rgba(234,179,8,0.3)] ring-4 ring-yellow-500/10">
                                    <span className="text-9xl font-black text-yellow-400">1</span>
                                </div>
                                <div className="text-center">
                                    <div className="font-black text-6xl text-yellow-500 drop-shadow-lg mb-3 truncate max-w-[400px]">{winner?.display_name || "TBD"}</div>
                                    <div className="text-xl font-bold text-yellow-600/70 uppercase tracking-[0.3em] flex items-center justify-center gap-3">
                                        <Trophy className="w-6 h-6" /> Champion
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3rd Place */}
                        <div className="order-3 flex flex-col items-center w-1/3 animate-in slide-in-from-bottom-12 duration-1000 delay-200">
                            <div className="flex flex-col items-center w-full">
                                <Crown className="w-16 h-16 text-amber-700 mb-4 opacity-50" />
                                <div className="w-48 h-48 rounded-full border-8 border-amber-700/30 bg-amber-700/10 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(180,83,9,0.1)]">
                                    <span className="text-7xl font-black text-amber-700">3</span>
                                </div>
                                <div className="text-center">
                                    <div className="font-bold text-4xl text-slate-200 mb-2 truncate max-w-[300px]">{thirdPlace?.display_name || "TBD"}</div>
                                    <div className="text-lg font-bold text-amber-800/70 uppercase tracking-[0.2em]">3rd Place</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Area with Swiss King and QR */}
                <div className="w-full p-8 flex justify-between items-end z-20">
                    {/* Swiss King */}
                    <div className="flex items-center gap-6">
                        {swissKing && (
                            <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-6 flex items-center gap-6 backdrop-blur-md">
                                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0 border border-blue-500/30 text-blue-400">
                                    <Medal className="w-8 h-8" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1">Swiss King</div>
                                    <div className="font-bold text-3xl text-slate-200">{swissKing.display_name}</div>
                                    <div className="text-sm text-slate-400">{swissKing.match_wins} Wins • {swissKing.buchholz} Buchholz</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Powered By & QR */}
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2 text-slate-600 opacity-60">
                            <Sparkles className="w-5 h-5" />
                            <span className="text-sm font-black uppercase tracking-widest font-mono">BeyBracket</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl shadow-2xl">
                            <QRCodeDisplay url={`${origin}/t/${tournamentId}`} size={100} />
                            <div className="text-center text-[10px] font-bold mt-1 text-black">Scan Results</div>
                        </div>
                    </div>
                </div>
            </BrandedContainer>
        );
    }

    // 2. Ongoing Bracket / Swiss View
    return (
        <BrandedContainer
            primaryColor={tournament?.stores?.primary_color}
            secondaryColor={tournament?.stores?.secondary_color}
            plan={tournament?.stores?.plan}
            className="min-h-screen bg-slate-950 text-white p-8 flex flex-col items-center relative overflow-hidden"
        >
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black -z-10" />

            {/* Header */}
            <header className="w-full flex justify-between items-center mb-12 z-10 relative">
                <div>
                    <div className="text-5xl font-black uppercase tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-2">
                        {tournament?.name}
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="px-6 py-2 bg-slate-900 border border-slate-800 rounded-full font-mono text-xl text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                            {viewMode === 'swiss' ? 'Swiss Stage' : 'Finals Stage'}
                        </div>
                    </div>
                </div>
                <Controls isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen} tournamentId={tournamentId} />
            </header>

            {/* Main Content - Split Screen */}
            <main className="flex-1 w-full flex overflow-hidden z-10">
                {/* Left: Matches (75% on large screens) */}
                <div className={cn("flex-1 p-8 overflow-y-auto no-scrollbar relative", viewMode === 'swiss' ? 'border-r border-white/5' : '')}>
                    {viewMode === 'swiss' ? (
                        <div className="h-full flex flex-col">
                            {/* Dynamic Grid based on match count */}
                            {(() => {
                                // 1. Filter: Current Round Only
                                // EXCLUDE completed matches (user request: "remove scores once done")
                                const maxSwissRound = Math.max(...swissMatches.map(m => m.swiss_round_number));
                                const currentRoundMatches = (swissMatches || []).filter(m =>
                                    m.swiss_round_number === maxSwissRound &&
                                    m.status !== 'complete' // Filter completed matches
                                );

                                // 2. Paginate
                                const MATCHES_PER_PAGE = 12;
                                const totalPages = Math.ceil(currentRoundMatches.length / MATCHES_PER_PAGE);

                                // Reset logic if matches shrink (e.g. from 13 to 12)
                                const safePage = (currentPage >= totalPages && totalPages > 0) ? 0 : currentPage;

                                // Get current page matches
                                const pageMatches = currentRoundMatches.slice(safePage * MATCHES_PER_PAGE, (safePage + 1) * MATCHES_PER_PAGE);
                                const matchCount = pageMatches.length;

                                if (currentRoundMatches.length === 0) return (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 font-thin uppercase tracking-widest">
                                        <div className="text-6xl mb-4 opacity-20">Round Complete</div>
                                        <div className="text-2xl text-slate-600">Waiting for next round pairings...</div>
                                    </div>
                                );

                                // If currentRoundMatches > 0 but matchCount is 0, it means safePage logic failed?
                                // Should be impossible with safePage logic.

                                // Auto-sizing logic - Standardized Grid (Consistent normal/small sizes)
                                // Standard: 4 columns on large screens
                                const gridCols = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

                                return (
                                    <div className="flex flex-col h-full">
                                        <div className={`grid ${gridCols} gap-6 w-full auto-rows-fr flex-1 content-start`}>
                                            {pageMatches.map(m => (
                                                <div key={m.id} className={matchCount <= 2 ? "min-h-[350px]" : "min-h-[200px]"}>
                                                    <ProjectorMatchCard
                                                        match={m}
                                                        participants={participants || {}}
                                                        participantStats={participantStats}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        {/* Pagination Indicator */}
                                        {totalPages > 1 && (
                                            <div className="mt-6 flex justify-center items-center gap-2">
                                                {Array.from({ length: totalPages }).map((_, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={cn(
                                                            "h-1.5 rounded-full transition-all duration-500",
                                                            idx === currentPage ? "w-8 bg-cyan-400" : "w-2 bg-slate-700"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })()}
                        </div>

                    ) : (
                        <div className="h-full flex items-center justify-start overflow-x-hidden" ref={(el) => {
                            // Auto-scroll logic
                            if (!el) return;

                            // Simple auto-scroll implementation
                            const scrollContainer = el;

                            // Clear any existing interval to prevent dupes if re-rendering
                            if ((scrollContainer as any)._autoScrollInterval) {
                                clearInterval((scrollContainer as any)._autoScrollInterval);
                            }

                            const startScrolling = () => {
                                // Only scroll if content overflows
                                if (scrollContainer.scrollWidth <= scrollContainer.clientWidth) return;

                                const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
                                let direction = 1; // 1 = right, -1 = left
                                let currentScroll = scrollContainer.scrollLeft;
                                let isPaused = false;

                                (scrollContainer as any)._autoScrollInterval = setInterval(() => {
                                    if (isPaused) return;

                                    // Move
                                    currentScroll += direction * 2; // Speed: 1px per tick

                                    // Check bounds
                                    if (currentScroll >= maxScroll) {
                                        currentScroll = maxScroll;
                                        isPaused = true;
                                        setTimeout(() => {
                                            direction = -1;
                                            isPaused = false;
                                        }, 3000); // Pause at end for 3s
                                    } else if (currentScroll <= 0) {
                                        currentScroll = 0;
                                        isPaused = true;
                                        setTimeout(() => {
                                            direction = 1;
                                            isPaused = false;
                                        }, 3000); // Pause at start for 3s
                                    }

                                    scrollContainer.scrollLeft = currentScroll;
                                }, 16); // ~60fps
                            };

                            // Start after a slight delay to allow layout to settle
                            setTimeout(startScrolling, 1000);
                        }}>
                            {transformedMatches.length > 0 ? (
                                <SingleEliminationBracket
                                    matches={transformedMatches}
                                    matchComponent={ProjectorMatch}
                                    theme={BeybladeTheme}
                                    options={{
                                        style: {
                                            width: 280,
                                            boxHeight: 140,
                                            spaceBetweenColumns: 80,
                                            spaceBetweenRows: 40,
                                            connectorColor: '#334155',
                                            connectorColorHighlight: '#22D3EE',
                                        }
                                    }}
                                />
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-slate-500 text-xl italic">
                                    Waiting for bracket data...
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 3rd Place Match Overlay (Bottom Center of Bracket Area) - Only for Top Cut */}
                {viewMode === 'top_cut' && (() => {
                    // Find 3rd Place Match (Round = Total Rounds, Match #2)
                    // Ensure we compare numbers to avoid string/number mismatch
                    const p3Match = topCutMatches.find(m => Number(m.bracket_round) === totalRounds && Number(m.match_number) === 2);
                    if (!p3Match) return null;

                    // Transform to match key shape expected by ProjectorMatch
                    const p3Transformed = {
                        participants: [
                            {
                                id: p3Match.participant_a_id || 'tbd-a-3rd',
                                resultText: p3Match.score_a?.toString() ?? '-',
                                isWinner: p3Match.winner_id === p3Match.participant_a_id,
                                status: p3Match.status === 'complete' ? (p3Match.winner_id === p3Match.participant_a_id ? 'WON' : 'LOST') : null,
                                name: p3Match.participant_a_id ? (participants ? participants[p3Match.participant_a_id]?.display_name : 'TBD') : 'TBD',
                            },
                            {
                                id: p3Match.participant_b_id || 'tbd-b-3rd',
                                resultText: p3Match.score_b?.toString() ?? '-',
                                isWinner: p3Match.winner_id === p3Match.participant_b_id,
                                status: p3Match.status === 'complete' ? (p3Match.winner_id === p3Match.participant_b_id ? 'WON' : 'LOST') : null,
                                name: p3Match.participant_b_id ? (participants ? participants[p3Match.participant_b_id]?.display_name : 'TBD') : 'TBD',
                            }
                        ]
                    };

                    return (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
                            <div className="mb-2 text-sm font-bold uppercase tracking-widest text-amber-600/80">3rd Place Match</div>
                            <ProjectorMatch match={p3Transformed} />
                        </div>
                    );
                })()}

                {/* Right: Sidebar (Always visible now for consistency & premium feel) */}
                <div className="hidden xl:block w-[400px] shrink-0 border-l border-white/5">
                    <LiveStandings participants={participants || {}} matches={swissMatches || []} />
                </div>
            </main>

            {/* Footer / QR */}
            <div className="absolute bottom-12 right-12 flex items-center gap-6 z-20 bg-slate-900/90 p-6 rounded-2xl backdrop-blur-xl border border-slate-800 shadow-2xl">
                <div className="text-right">
                    <div className="text-lg font-bold text-slate-200">Scan for Live Updates</div>
                    <div className="text-sm text-slate-500">beybracket.com</div>
                </div>
                <div className="bg-white p-2 rounded-lg">
                    <QRCodeDisplay url={`${origin}/t/${tournamentId}`} size={80} />
                </div>
            </div>

        </BrandedContainer>
    );
}
